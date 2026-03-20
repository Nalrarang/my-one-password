import type { MiddlewareHandler } from 'hono';

import type { Bindings } from '../index';

/**
 * Authentication guard middleware.
 *
 * Validates the Bearer token from the Authorization header. For now this
 * performs a presence check only. Full implementation will verify the token
 * against the D1 sessions table and attach the authenticated user to the
 * request context.
 *
 * TODO: Implement JWT verification against D1 sessions table
 */
export const authGuard: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or malformed Authorization header' }, 401);
  }

  const token = authHeader.slice(7);

  if (!token) {
    return c.json({ error: 'Empty bearer token' }, 401);
  }

  // TODO: Look up token in D1 sessions table
  // TODO: Verify token has not expired
  // TODO: Attach user ID to context via c.set('userId', ...)

  await next();
};
