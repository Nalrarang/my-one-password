import { Hono } from 'hono';

import type { Bindings, Variables } from '../index';
import { authGuard } from '../middleware/auth-guard';

export const syncRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All sync routes require authentication
syncRoutes.use('*', authGuard);

// ---------------------------------------------------------------------------
// Shared types & helpers
// ---------------------------------------------------------------------------

const BASE64_RE = /^[A-Za-z0-9+/]+=*$/;
const VALID_ITEM_TYPES = new Set(['login', 'card', 'note', 'identity']);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function isBase64String(v: unknown): v is string {
  return isNonEmptyString(v) && BASE64_RE.test(v);
}

/** D1 row shape */
interface VaultItemRow {
  id: string;
  item_type: string;
  encrypted_data: ArrayBuffer;
  iv: ArrayBuffer;
  version: number;
  favorite: number;
  deleted: number;
  created_at: string;
  updated_at: string;
}

interface VaultItemResponse {
  id: string;
  itemType: string;
  encryptedData: string;
  iv: string;
  version: number;
  favorite: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function serializeItem(row: VaultItemRow): VaultItemResponse {
  return {
    id: row.id,
    itemType: row.item_type,
    encryptedData: arrayBufferToBase64(row.encrypted_data),
    iv: arrayBufferToBase64(row.iv),
    version: row.version,
    favorite: row.favorite === 1,
    deleted: row.deleted === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// GET /api/sync/changes
// ---------------------------------------------------------------------------

/**
 * Pull changes since a given point in time.
 *
 * Query parameters:
 *   - since:     ISO 8601 timestamp of the last successful sync
 *   - device_id: client device identifier for per-device sync tracking
 *
 * Returns items updated after `since`, including soft-deleted items so clients
 * can remove them locally.
 */
syncRoutes.get('/changes', async (c) => {
  const userId = c.get('userId');
  const since = c.req.query('since');
  const deviceId = c.req.query('device_id');

  if (!since) {
    return c.json({ error: 'Missing required query parameter: since' }, 400);
  }

  if (!deviceId) {
    return c.json({ error: 'Missing required query parameter: device_id' }, 400);
  }

  // Fetch items updated after `since` (including deleted items for tombstone sync)
  const { results } = await c.env.DB.prepare(
    `SELECT id, item_type, encrypted_data, iv, version, favorite, deleted, created_at, updated_at
     FROM vault_items
     WHERE user_id = ? AND updated_at > ?
     ORDER BY updated_at ASC
     LIMIT 200`,
  )
    .bind(userId, since)
    .all<VaultItemRow>();

  const items = (results ?? []).map(serializeItem);
  const hasMore = items.length === 200;
  const syncToken = new Date().toISOString();

  // Update per-device sync state
  await c.env.DB.prepare(
    `INSERT INTO sync_state (user_id, device_id, last_sync_at, sync_token)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, device_id)
     DO UPDATE SET last_sync_at = excluded.last_sync_at, sync_token = excluded.sync_token`,
  )
    .bind(userId, deviceId, syncToken, syncToken)
    .run();

  return c.json({ items, syncToken, hasMore });
});

// ---------------------------------------------------------------------------
// POST /api/sync/push
// ---------------------------------------------------------------------------

/**
 * Push locally created or modified vault items to the server.
 *
 * Request body:
 *   - items:     array of vault items to upsert
 *   - device_id: client device identifier
 *
 * Each item in the array must have:
 *   - id:            item ID (client-generated for new items)
 *   - itemType:      'login' | 'card' | 'note' | 'identity'
 *   - encryptedData: base64
 *   - iv:            base64
 *   - version:       last known version (0 for new items)
 *   - favorite:      boolean
 *   - deleted:       boolean
 *
 * Returns:
 *   - accepted:   items successfully upserted (with new versions)
 *   - conflicts:  items where server version differs (client must resolve)
 */
syncRoutes.post('/push', async (c) => {
  const userId = c.get('userId');

  let body: { items?: unknown[]; device_id?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { items: rawItems, device_id: deviceId } = body;

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return c.json({ error: 'items must be a non-empty array' }, 400);
  }

  if (!isNonEmptyString(deviceId)) {
    return c.json({ error: 'Missing device_id' }, 400);
  }

  if (rawItems.length > 100) {
    return c.json({ error: 'Maximum 100 items per push' }, 400);
  }

  const accepted: VaultItemResponse[] = [];
  const conflicts: Array<{ clientItem: { id: string; version: number }; serverItem: VaultItemResponse }> = [];

  for (const raw of rawItems) {
    const item = raw as Record<string, unknown>;

    // Validate required fields
    if (!isNonEmptyString(item.id)) continue;
    if (!VALID_ITEM_TYPES.has(item.itemType as string)) continue;
    if (!isBase64String(item.encryptedData)) continue;
    if (!isBase64String(item.iv)) continue;
    if (typeof item.version !== 'number') continue;

    const encryptedBytes = base64ToUint8Array(item.encryptedData as string);
    const ivBytes = base64ToUint8Array(item.iv as string);
    const isFavorite = item.favorite === true ? 1 : 0;
    const isDeleted = item.deleted === true ? 1 : 0;
    const now = new Date().toISOString();

    // Check if item already exists on server
    const existing = await c.env.DB.prepare(
      `SELECT id, item_type, encrypted_data, iv, version, favorite, deleted, created_at, updated_at
       FROM vault_items
       WHERE id = ? AND user_id = ?`,
    )
      .bind(item.id, userId)
      .first<VaultItemRow>();

    if (!existing) {
      // New item — insert
      const newId = item.id as string;
      await c.env.DB.prepare(
        `INSERT INTO vault_items (id, user_id, item_type, encrypted_data, iv, version, favorite, deleted, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      )
        .bind(newId, userId, item.itemType, encryptedBytes, ivBytes, isFavorite, isDeleted, now, now)
        .run();

      accepted.push({
        id: newId,
        itemType: item.itemType as string,
        encryptedData: item.encryptedData as string,
        iv: item.iv as string,
        version: 1,
        favorite: isFavorite === 1,
        deleted: isDeleted === 1,
        createdAt: now,
        updatedAt: now,
      });
    } else if (existing.version === (item.version as number)) {
      // Version matches — apply update
      const newVersion = existing.version + 1;
      await c.env.DB.prepare(
        `UPDATE vault_items
         SET encrypted_data = ?, iv = ?, version = ?, favorite = ?, deleted = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`,
      )
        .bind(encryptedBytes, ivBytes, newVersion, isFavorite, isDeleted, now, item.id, userId)
        .run();

      accepted.push({
        id: item.id as string,
        itemType: existing.item_type,
        encryptedData: item.encryptedData as string,
        iv: item.iv as string,
        version: newVersion,
        favorite: isFavorite === 1,
        deleted: isDeleted === 1,
        createdAt: existing.created_at,
        updatedAt: now,
      });
    } else {
      // Version conflict — return server version
      conflicts.push({
        clientItem: { id: item.id as string, version: item.version as number },
        serverItem: serializeItem(existing),
      });
    }
  }

  return c.json({ accepted, conflicts });
});
