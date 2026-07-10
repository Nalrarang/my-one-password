import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { authRoutes } from './routes/auth';
import { vaultRoutes } from './routes/vault';
import { syncRoutes } from './routes/sync';
import { securityHeaders } from './middleware/security-headers';

/**
 * Cloudflare Workers environment bindings.
 *
 * D1 provides the SQLite-compatible relational database.
 * R2 provides object storage for large encrypted blobs if needed.
 */
export type Bindings = {
  DB: D1Database;
  STORAGE: R2Bucket;
  INVITE_CODE: string;
  // Optional server secret. When set, /auth/salt returns a deterministic
  // pseudo-salt for unknown emails so responses are indistinguishable from
  // registered accounts (blocks account enumeration). Set via:
  //   wrangler secret put SALT_PEPPER
  SALT_PEPPER?: string;
};

/**
 * Context variables set by middleware and available to route handlers.
 *
 * - `userId`: Set by the auth-guard middleware after validating the
 *   session token. Only populated on authenticated routes.
 */
export type Variables = {
  userId: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().basePath('/api');

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------

app.use(
  '*',
  cors({
    // Bearer-token API (no cookies), but an explicit allowlist still blocks
    // arbitrary sites from calling the unauthenticated endpoints
    // (salt/login/register) for enumeration or credential stuffing.
    origin: (origin) => {
      const allowed = [
        'http://localhost:5173',
        'http://localhost:3000',
        'tauri://localhost',
        'https://tauri.localhost',
        // Tauri webview origin on Android/Windows (the missing entry that
        // 20ee66d worked around by opening CORS to '*').
        'http://tauri.localhost',
      ];
      // Allow Cloudflare Pages deployments (*.pages.dev).
      if (origin.endsWith('.pages.dev')) return origin;
      if (allowed.includes(origin)) return origin;
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }),
);

app.use('*', logger());
app.use('*', securityHeaders);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Route groups
// ---------------------------------------------------------------------------

app.route('/auth', authRoutes);
app.route('/vault', vaultRoutes);
app.route('/sync', syncRoutes);

export default app;
