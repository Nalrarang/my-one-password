/**
 * Session management utilities for D1-backed bearer token sessions.
 *
 * Sessions are stored in the `sessions` table with a 30-day expiry.
 * Tokens are 32 random bytes encoded as hex (64 characters), generated
 * using the runtime's CSPRNG.
 */

/** Number of days before a session expires. */
export const SESSION_EXPIRY_DAYS = 30;

/**
 * Generate a cryptographically random session token.
 *
 * @returns A 64-character hex string (32 random bytes)
 */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const parts: string[] = [];
  for (const b of bytes) {
    parts.push(b.toString(16).padStart(2, '0'));
  }
  return parts.join('');
}

/**
 * Create a new session row in D1.
 *
 * @param db      - D1 database binding
 * @param userId  - The authenticated user's ID
 * @param token   - The session token to store
 */
export async function createSession(
  db: D1Database,
  userId: string,
  token: string,
): Promise<void> {
  const expiresAt = new Date(
    Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  await db
    .prepare(
      `INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`,
    )
    .bind(token, userId, expiresAt)
    .run();
}

/**
 * Delete a session from D1, effectively logging the user out.
 *
 * @param db    - D1 database binding
 * @param token - The session token to revoke
 */
export async function deleteSession(
  db: D1Database,
  token: string,
): Promise<void> {
  await db
    .prepare(`DELETE FROM sessions WHERE token = ?`)
    .bind(token)
    .run();
}
