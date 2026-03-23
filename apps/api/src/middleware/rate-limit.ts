import type { Context, MiddlewareHandler } from 'hono';
import type { Bindings, Variables } from '../index';

type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;

/**
 * Create a rate-limiting middleware backed by Cloudflare D1.
 *
 * Tracks request counts per client-IP + path combination inside a
 * `rate_limits` table using discrete time windows.  When a client
 * exceeds the configured maximum the middleware short-circuits with a
 * 429 response and includes a `retryAfter` hint.
 *
 * Standard `X-RateLimit-*` headers are set on every response so callers
 * can introspect their remaining budget.
 *
 * To avoid unbounded table growth a lightweight probabilistic cleanup
 * runs on ~1 % of requests, removing windows that are older than twice
 * the configured window size.
 *
 * @param options.windowMs  Length of the rate-limit window in milliseconds.
 * @param options.max       Maximum number of requests allowed per window.
 * @param options.keyFn     Optional function to derive the rate-limit key
 *                          from the request context.  Defaults to the
 *                          client IP address combined with the request path.
 */
export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyFn?: (c: AppContext) => string;
}): MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> {
  const { windowMs, max, keyFn } = options;

  return async (c, next) => {
    const now = Date.now();

    // -----------------------------------------------------------------------
    // Derive a stable key for this client + route combination.
    // -----------------------------------------------------------------------
    const key =
      keyFn?.(c) ??
      `${c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')?.split(',')[0] || 'unknown'}:${c.req.path}`;

    // -----------------------------------------------------------------------
    // Calculate the current window boundary.
    // -----------------------------------------------------------------------
    const windowStart = new Date(
      Math.floor(now / windowMs) * windowMs,
    ).toISOString();

    const windowEnd = Math.floor(now / windowMs) * windowMs + windowMs;
    const resetSeconds = Math.ceil((windowEnd - now) / 1000);

    // -----------------------------------------------------------------------
    // Upsert the request count for this window.
    // -----------------------------------------------------------------------
    await c.env.DB.prepare(
      `INSERT INTO rate_limits (key, window_start, request_count)
       VALUES (?, ?, 1)
       ON CONFLICT (key, window_start)
       DO UPDATE SET request_count = request_count + 1`,
    )
      .bind(key, windowStart)
      .run();

    // -----------------------------------------------------------------------
    // Read back the current count.
    // -----------------------------------------------------------------------
    const row = await c.env.DB.prepare(
      `SELECT request_count FROM rate_limits WHERE key = ? AND window_start = ?`,
    )
      .bind(key, windowStart)
      .first<{ request_count: number }>();

    const currentCount = row?.request_count ?? 1;
    const remaining = Math.max(0, max - currentCount);

    // -----------------------------------------------------------------------
    // Probabilistic cleanup (~1 % of requests).
    // -----------------------------------------------------------------------
    if (Math.random() < 0.01) {
      const cutoff = new Date(now - 2 * windowMs).toISOString();
      c.executionCtx.waitUntil(
        c.env.DB.prepare(`DELETE FROM rate_limits WHERE window_start < ?`)
          .bind(cutoff)
          .run(),
      );
    }

    // -----------------------------------------------------------------------
    // Enforce the limit.
    // -----------------------------------------------------------------------
    if (currentCount > max) {
      return c.json({ error: 'Too many requests', retryAfter: resetSeconds }, 429, {
        'X-RateLimit-Limit': String(max),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(resetSeconds),
      });
    }

    // -----------------------------------------------------------------------
    // Proceed and attach rate-limit headers to the response.
    // -----------------------------------------------------------------------
    await next();

    c.res.headers.set('X-RateLimit-Limit', String(max));
    c.res.headers.set('X-RateLimit-Remaining', String(remaining));
    c.res.headers.set('X-RateLimit-Reset', String(resetSeconds));
  };
}
