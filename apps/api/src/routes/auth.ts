import { Hono } from 'hono';

import type { Bindings, Variables } from '../index';
import { hashAuthKey, generateId } from '../lib/crypto';
import { generateSessionToken, createSession, deleteSession } from '../lib/session';
import { authGuard } from '../middleware/auth-guard';
import { rateLimit } from '../middleware/rate-limit';

export const authRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const HEX_RE = /^[0-9a-fA-F]+$/;
const BASE64_RE = /^[A-Za-z0-9+/]+=*$/;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function isValidEmail(v: unknown): v is string {
  return isNonEmptyString(v) && v.includes('@') && v.length <= 254;
}

function isHexString(v: unknown): v is string {
  return isNonEmptyString(v) && HEX_RE.test(v);
}

function isBase64String(v: unknown): v is string {
  return isNonEmptyString(v) && BASE64_RE.test(v);
}

// ---------------------------------------------------------------------------
// GET /api/auth/salt
// ---------------------------------------------------------------------------

/**
 * Retrieve the Argon2id salt for a given email.
 *
 * The salt is not secret — it is required by the client to derive the
 * master key before computing the auth key for login.
 *
 * Query parameters:
 *   - email: User's email address
 *
 * Returns the same generic error for missing users to prevent enumeration.
 */
authRoutes.get('/salt', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }), async (c) => {
  const email = c.req.query('email');

  if (!email || !isValidEmail(email)) {
    return c.json({ error: 'Invalid or missing email' }, 400);
  }

  const user = await c.env.DB.prepare(
    `SELECT salt FROM users WHERE email = ?`,
  )
    .bind(email)
    .first<{ salt: string }>();

  if (!user) {
    return c.json({ error: 'Invalid email or auth key' }, 401);
  }

  return c.json({ salt: user.salt });
});

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

/**
 * Register a new user account.
 *
 * The client derives all keys locally and sends only the material the
 * server needs to verify identity and return the encrypted vault key on
 * subsequent logins.
 *
 * Request body:
 *   - email:       User's email address
 *   - salt:        Argon2id salt (base64)
 *   - authKey:     Auth key derived via HKDF(masterKey, "auth") (hex)
 *   - encVaultKey: Vault key wrapped by the encryption key (base64)
 *
 * The auth key is hashed server-side with SHA-256 before storage.
 */
authRoutes.post('/register', rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { email, salt, authKey, encVaultKey, inviteCode } = body;

  // --- Invite code check -------------------------------------------------
  const expectedCode = c.env.INVITE_CODE;
  if (expectedCode && inviteCode !== expectedCode) {
    return c.json({ error: 'Invalid invite code' }, 403);
  }

  // --- Input validation --------------------------------------------------
  if (!isValidEmail(email)) {
    return c.json({ error: 'Invalid or missing email' }, 400);
  }

  if (!isBase64String(salt)) {
    return c.json({ error: 'Invalid or missing salt (expected base64)' }, 400);
  }

  if (!isHexString(authKey)) {
    return c.json({ error: 'Invalid or missing authKey (expected hex)' }, 400);
  }

  if (!isBase64String(encVaultKey)) {
    return c.json(
      { error: 'Invalid or missing encVaultKey (expected base64)' },
      400,
    );
  }

  // --- Check for existing user -------------------------------------------
  const existing = await c.env.DB.prepare(
    `SELECT id FROM users WHERE email = ?`,
  )
    .bind(email)
    .first();

  if (existing) {
    return c.json({ error: 'Email already registered' }, 409);
  }

  // --- Hash the auth key and persist -------------------------------------
  const authKeyHash = await hashAuthKey(authKey);
  const userId = generateId();

  await c.env.DB.prepare(
    `INSERT INTO users (id, email, salt, auth_key_hash, enc_vault_key)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(userId, email, salt, authKeyHash, encVaultKey)
    .run();

  // --- Create session ----------------------------------------------------
  const sessionToken = generateSessionToken();
  await createSession(c.env.DB, userId, sessionToken);

  return c.json({ sessionToken, userId }, 201);
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

/**
 * Authenticate an existing user.
 *
 * The client sends the email and the auth key (hex). The server hashes
 * the provided auth key and compares it to the stored hash. On success
 * the server creates a new session and returns the session token along
 * with the salt and encrypted vault key so the client can derive the
 * decryption key locally.
 *
 * Request body:
 *   - email:   User's email address
 *   - authKey: Auth key (hex)
 */
authRoutes.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { email, authKey } = body;

  // --- Input validation --------------------------------------------------
  if (!isValidEmail(email)) {
    return c.json({ error: 'Invalid or missing email' }, 400);
  }

  if (!isHexString(authKey)) {
    return c.json({ error: 'Invalid or missing authKey (expected hex)' }, 400);
  }

  // --- Look up user ------------------------------------------------------
  const user = await c.env.DB.prepare(
    `SELECT id, auth_key_hash, salt, enc_vault_key FROM users WHERE email = ?`,
  )
    .bind(email)
    .first<{
      id: string;
      auth_key_hash: string;
      salt: string;
      enc_vault_key: string;
    }>();

  if (!user) {
    // Use a generic message to avoid leaking whether an account exists.
    return c.json({ error: 'Invalid email or auth key' }, 401);
  }

  // --- Verify auth key ---------------------------------------------------
  const providedHash = await hashAuthKey(authKey);

  if (providedHash !== user.auth_key_hash) {
    return c.json({ error: 'Invalid email or auth key' }, 401);
  }

  // --- Create session ----------------------------------------------------
  const sessionToken = generateSessionToken();
  await createSession(c.env.DB, user.id, sessionToken);

  return c.json({
    sessionToken,
    salt: user.salt,
    encVaultKey: user.enc_vault_key,
    userId: user.id,
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------

/**
 * Invalidate the current session.
 *
 * Requires a valid Bearer token (enforced by authGuard). Removes the
 * session row from D1 so the token can no longer be used.
 */
authRoutes.post('/logout', authGuard, async (c) => {
  const authHeader = c.req.header('Authorization')!;
  const token = authHeader.slice(7);

  await deleteSession(c.env.DB, token);

  return c.json({ message: 'Logged out' });
});
