import { Hono } from 'hono';

import type { Bindings } from '../index';

export const authRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * POST /api/auth/register
 *
 * Register a new user account. The client sends:
 *   - email
 *   - salt          (generated client-side via SRP)
 *   - verifier      (SRP verifier derived from the master password)
 *   - enc_vault_key (vault encryption key wrapped by the master key)
 *
 * The server never receives the plaintext master password.
 */
authRoutes.post('/register', async (c) => {
  return c.json({ message: 'Not implemented' }, 501);
});

/**
 * POST /api/auth/login
 *
 * Authenticate using SRP (Secure Remote Password) protocol:
 *   1. Client sends email + SRP client public value (A)
 *   2. Server responds with salt + SRP server public value (B)
 *   3. Client sends proof (M1)
 *   4. Server verifies M1, responds with server proof (M2) + session token
 *
 * On success the server creates a session in D1 and returns the token.
 */
authRoutes.post('/login', async (c) => {
  return c.json({ message: 'Not implemented' }, 501);
});

/**
 * POST /api/auth/logout
 *
 * Invalidate the current session. Removes the session row from D1 so the
 * bearer token can no longer be used.
 */
authRoutes.post('/logout', async (c) => {
  return c.json({ message: 'Not implemented' }, 501);
});
