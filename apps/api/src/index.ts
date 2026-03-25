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
    origin: (origin) => {
      const allowed = [
        'http://localhost:5173',
        'http://localhost:3000',
        'tauri://localhost',
        'https://tauri.localhost',
      ];
      // Allow Cloudflare Pages subdomains (*.pages.dev)
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
