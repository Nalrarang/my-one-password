import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { authRoutes } from './routes/auth';
import { vaultRoutes } from './routes/vault';
import { syncRoutes } from './routes/sync';

/**
 * Cloudflare Workers environment bindings.
 *
 * D1 provides the SQLite-compatible relational database.
 * R2 provides object storage for large encrypted blobs if needed.
 */
export type Bindings = {
  DB: D1Database;
  STORAGE: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------

app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }),
);

app.use('*', logger());

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
