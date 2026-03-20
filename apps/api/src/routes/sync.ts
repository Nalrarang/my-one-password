import { Hono } from 'hono';

import type { Bindings, Variables } from '../index';
import { authGuard } from '../middleware/auth-guard';

export const syncRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All sync routes require authentication
syncRoutes.use('*', authGuard);

/**
 * GET /api/sync/changes
 *
 * Pull changes since a given point in time. Query parameters:
 *   - since:     ISO 8601 timestamp of the last successful sync
 *   - device_id: client device identifier for per-device sync tracking
 *
 * Returns:
 *   - items:      vault items created or updated after `since`
 *   - sync_token: opaque token the client must send on the next pull
 *   - has_more:   whether additional pages of changes exist
 */
syncRoutes.get('/changes', async (c) => {
  return c.json({ message: 'Not implemented' }, 501);
});

/**
 * PUT /api/sync/push
 *
 * Push locally created or modified vault items to the server. The request
 * body contains an array of encrypted vault items with version numbers for
 * conflict detection.
 *
 * On conflict (server version != client base version), the server returns
 * the conflicting server-side item so the client can perform a merge.
 *
 * Request body:
 *   - items:      array of vault items to upsert
 *   - device_id:  client device identifier
 *   - sync_token: token from the last pull (for consistency validation)
 */
syncRoutes.put('/push', async (c) => {
  return c.json({ message: 'Not implemented' }, 501);
});
