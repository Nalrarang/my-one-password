import type { MiddlewareHandler } from 'hono';
import type { Bindings, Variables } from '../index';

/**
 * Security headers middleware.
 *
 * Sets a standard set of HTTP response headers that harden the application
 * against common web vulnerabilities such as clickjacking, MIME-type
 * sniffing, and insecure referrer leakage.
 *
 * - X-Content-Type-Options: Prevents MIME-type sniffing.
 * - X-Frame-Options: Blocks the page from being embedded in iframes.
 * - Strict-Transport-Security: Enforces HTTPS for one year including
 *   subdomains.
 * - Referrer-Policy: Sends the origin on cross-origin requests but only
 *   when the protocol security level stays the same.
 * - Permissions-Policy: Disables access to camera, microphone, and
 *   geolocation APIs.
 * - X-XSS-Protection: Explicitly disabled because modern browsers rely
 *   on Content-Security-Policy instead, and the legacy XSS filter can
 *   introduce vulnerabilities.
 */
export const securityHeaders: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> = async (c, next) => {
  await next();

  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('X-Frame-Options', 'DENY');
  c.res.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains',
  );
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  c.res.headers.set('X-XSS-Protection', '0');
};
