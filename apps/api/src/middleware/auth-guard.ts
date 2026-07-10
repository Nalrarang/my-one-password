import type { MiddlewareHandler } from 'hono';

import type { Bindings, Variables } from '../index';
import { hashToken } from '../lib/session';

/**
 * Authentication guard middleware.
 *
 * Validates the Bearer token from the Authorization header against the
 * D1 sessions table. If the session is valid and has not expired, the
 * authenticated user's ID is attached to the request context via
 * `c.set('userId', ...)`.
 *
 * Expired sessions are deleted opportunistically to keep the table clean.
 */
export const authGuard: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or malformed Authorization header' }, 401);
  }

  const token = authHeader.slice(7);

  if (!token) {
    return c.json({ error: 'Empty bearer token' }, 401);
  }

  // Sessions are stored as SHA-256 hashes; hash the presented token to match.
  const tokenHash = await hashToken(token);

  // Look up the session in D1
  const session = await c.env.DB.prepare(
    `SELECT user_id, expires_at FROM sessions WHERE token = ?`,
  )
    .bind(tokenHash)
    .first<{ user_id: string; expires_at: string }>();

  if (!session) {
    return c.json({ error: 'Invalid session token' }, 401);
  }

  // Check whether the session has expired
  const expiresAt = new Date(session.expires_at);
  if (expiresAt <= new Date()) {
    // Opportunistically clean up the expired session
    await c.env.DB.prepare(`DELETE FROM sessions WHERE token = ?`)
      .bind(tokenHash)
      .run();
    return c.json({ error: 'Session expired' }, 401);
  }

  // Attach the authenticated user ID to the context
  c.set('userId', session.user_id);

  await next();
};
