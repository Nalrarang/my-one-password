import { Hono } from 'hono';

import type { Bindings } from '../index';
import { authGuard } from '../middleware/auth-guard';

export const vaultRoutes = new Hono<{ Bindings: Bindings }>();

// All vault routes require authentication
vaultRoutes.use('*', authGuard);

/**
 * GET /api/vault/items
 *
 * List all vault items for the authenticated user. Returns encrypted item
 * metadata (id, type, version, timestamps) along with the encrypted payload.
 * Supports optional query parameters:
 *   - type: filter by item_type ('login' | 'card' | 'note' | 'identity')
 *   - favorite: filter favorites only (1)
 *   - deleted: include soft-deleted items (0 by default)
 */
vaultRoutes.get('/items', async (c) => {
  return c.json({ message: 'Not implemented' }, 501);
});

/**
 * GET /api/vault/items/:id
 *
 * Retrieve a single vault item by ID. Returns 404 if the item does not exist
 * or does not belong to the authenticated user.
 */
vaultRoutes.get('/items/:id', async (c) => {
  const _id = c.req.param('id');
  return c.json({ message: 'Not implemented' }, 501);
});

/**
 * POST /api/vault/items
 *
 * Create a new vault item. The client sends the fully encrypted item:
 *   - item_type:       'login' | 'card' | 'note' | 'identity'
 *   - encrypted_data:  AES-256-GCM ciphertext (base64)
 *   - iv:              initialization vector (base64)
 *   - favorite:        boolean
 *
 * The server generates the item ID and sets version to 1.
 */
vaultRoutes.post('/items', async (c) => {
  return c.json({ message: 'Not implemented' }, 501);
});

/**
 * PUT /api/vault/items/:id
 *
 * Update an existing vault item. Accepts the same fields as POST plus a
 * version number for optimistic concurrency control. The server rejects the
 * update if the provided version does not match the current stored version.
 */
vaultRoutes.put('/items/:id', async (c) => {
  const _id = c.req.param('id');
  return c.json({ message: 'Not implemented' }, 501);
});

/**
 * DELETE /api/vault/items/:id
 *
 * Soft-delete a vault item by setting deleted = 1. The item remains in D1
 * for sync purposes and can be permanently purged later. Returns 404 if the
 * item does not exist or does not belong to the authenticated user.
 */
vaultRoutes.delete('/items/:id', async (c) => {
  const _id = c.req.param('id');
  return c.json({ message: 'Not implemented' }, 501);
});
