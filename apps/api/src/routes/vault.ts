import { Hono } from 'hono';

import type { Bindings, Variables } from '../index';
import { generateId } from '../lib/crypto';
import { authGuard } from '../middleware/auth-guard';

export const vaultRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All vault routes require authentication
vaultRoutes.use('*', authGuard);

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const BASE64_RE = /^[A-Za-z0-9+/]+=*$/;

const VALID_ITEM_TYPES = new Set(['login', 'card', 'note', 'identity']);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function isBase64String(v: unknown): v is string {
  return isNonEmptyString(v) && BASE64_RE.test(v);
}

function isValidItemType(v: unknown): v is string {
  return isNonEmptyString(v) && VALID_ITEM_TYPES.has(v);
}

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

/** D1 row shape for vault_items queries. BLOBs come back as ArrayBuffer. */
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

/** JSON-safe representation of a vault item. */
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

/**
 * Convert an ArrayBuffer (D1 BLOB column) to a base64 string.
 *
 * Uses the standard btoa + String.fromCharCode approach available in the
 * Workers runtime.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decode a base64 string into a Uint8Array suitable for D1 BLOB binding.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Serialize a D1 vault_items row into a JSON-safe response object.
 *
 * Converts BLOB columns (encrypted_data, iv) from ArrayBuffer to base64
 * strings and maps snake_case column names to camelCase response fields.
 */
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
// GET /api/vault/items
// ---------------------------------------------------------------------------

/**
 * List all vault items for the authenticated user. Returns encrypted item
 * metadata (id, type, version, timestamps) along with the encrypted payload.
 * Supports optional query parameters:
 *   - type: filter by item_type ('login' | 'card' | 'note' | 'identity')
 *   - favorite: filter favorites only (1)
 *   - deleted: include soft-deleted items (1); excluded by default
 */
vaultRoutes.get('/items', async (c) => {
  const userId = c.get('userId');

  // Build the query dynamically based on optional filters
  const conditions: string[] = ['user_id = ?'];
  const params: (string | number)[] = [userId];

  // Filter by item_type if provided
  const typeFilter = c.req.query('type');
  if (typeFilter) {
    if (!VALID_ITEM_TYPES.has(typeFilter)) {
      return c.json(
        { error: `Invalid type filter. Must be one of: ${[...VALID_ITEM_TYPES].join(', ')}` },
        400,
      );
    }
    conditions.push('item_type = ?');
    params.push(typeFilter);
  }

  // Filter favorites
  const favoriteFilter = c.req.query('favorite');
  if (favoriteFilter === '1') {
    conditions.push('favorite = 1');
  }

  // Include or exclude soft-deleted items (excluded by default)
  const deletedFilter = c.req.query('deleted');
  if (deletedFilter !== '1') {
    conditions.push('deleted = 0');
  }

  const sql = `
    SELECT id, item_type, encrypted_data, iv, version, favorite, deleted, created_at, updated_at
    FROM vault_items
    WHERE ${conditions.join(' AND ')}
    ORDER BY updated_at DESC
  `;

  const { results } = await c.env.DB.prepare(sql)
    .bind(...params)
    .all<VaultItemRow>();

  const items = (results ?? []).map(serializeItem);

  return c.json({ items });
});

// ---------------------------------------------------------------------------
// GET /api/vault/items/:id
// ---------------------------------------------------------------------------

/**
 * Retrieve a single vault item by ID. Returns 404 if the item does not exist
 * or does not belong to the authenticated user.
 */
vaultRoutes.get('/items/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const row = await c.env.DB.prepare(
    `SELECT id, item_type, encrypted_data, iv, version, favorite, deleted, created_at, updated_at
     FROM vault_items
     WHERE id = ? AND user_id = ?`,
  )
    .bind(id, userId)
    .first<VaultItemRow>();

  if (!row) {
    return c.json({ error: 'Item not found' }, 404);
  }

  return c.json({ item: serializeItem(row) });
});

// ---------------------------------------------------------------------------
// POST /api/vault/items
// ---------------------------------------------------------------------------

/**
 * Create a new vault item. The client sends the fully encrypted item:
 *   - itemType:       'login' | 'card' | 'note' | 'identity'
 *   - encryptedData:  AES-256-GCM ciphertext (base64)
 *   - iv:             initialization vector (base64)
 *   - favorite:       boolean (optional, defaults to false)
 *
 * The server generates the item ID and sets version to 1.
 */
vaultRoutes.post('/items', async (c) => {
  const userId = c.get('userId');

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { itemType, encryptedData, iv, favorite } = body;

  // --- Input validation ----------------------------------------------------

  if (!isValidItemType(itemType)) {
    return c.json(
      { error: `Invalid or missing itemType. Must be one of: ${[...VALID_ITEM_TYPES].join(', ')}` },
      400,
    );
  }

  if (!isBase64String(encryptedData)) {
    return c.json({ error: 'Invalid or missing encryptedData (expected base64)' }, 400);
  }

  if (!isBase64String(iv)) {
    return c.json({ error: 'Invalid or missing iv (expected base64)' }, 400);
  }

  const isFavorite = favorite === true ? 1 : 0;
  const id = generateId();
  const now = new Date().toISOString();
  const encryptedBytes = base64ToUint8Array(encryptedData);
  const ivBytes = base64ToUint8Array(iv);

  await c.env.DB.prepare(
    `INSERT INTO vault_items (id, user_id, item_type, encrypted_data, iv, version, favorite, deleted, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, 0, ?, ?)`,
  )
    .bind(id, userId, itemType, encryptedBytes, ivBytes, isFavorite, now, now)
    .run();

  return c.json(
    {
      item: {
        id,
        itemType,
        encryptedData,
        iv,
        version: 1,
        favorite: isFavorite === 1,
        deleted: false,
        createdAt: now,
        updatedAt: now,
      } satisfies VaultItemResponse,
    },
    201,
  );
});

// ---------------------------------------------------------------------------
// PUT /api/vault/items/:id
// ---------------------------------------------------------------------------

/**
 * Update an existing vault item. Accepts the same fields as POST plus a
 * version number for optimistic concurrency control. The server rejects the
 * update if the provided version does not match the current stored version.
 *
 * Request body:
 *   - encryptedData: AES-256-GCM ciphertext (base64)
 *   - iv:            initialization vector (base64)
 *   - version:       the version the client last read (for OCC)
 *   - favorite:      boolean (optional)
 */
vaultRoutes.put('/items/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { encryptedData, iv, version, favorite } = body;

  // --- Input validation ----------------------------------------------------

  if (!isBase64String(encryptedData)) {
    return c.json({ error: 'Invalid or missing encryptedData (expected base64)' }, 400);
  }

  if (!isBase64String(iv)) {
    return c.json({ error: 'Invalid or missing iv (expected base64)' }, 400);
  }

  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return c.json({ error: 'Invalid or missing version (expected positive integer)' }, 400);
  }

  // --- Verify ownership and concurrency ------------------------------------

  const existing = await c.env.DB.prepare(
    `SELECT version, favorite, item_type, created_at FROM vault_items WHERE id = ? AND user_id = ?`,
  )
    .bind(id, userId)
    .first<{ version: number; favorite: number; item_type: string; created_at: string }>();

  if (!existing) {
    return c.json({ error: 'Item not found' }, 404);
  }

  if (existing.version !== version) {
    return c.json(
      {
        error: 'Version conflict',
        serverVersion: existing.version,
        clientVersion: version,
      },
      409,
    );
  }

  // --- Apply update --------------------------------------------------------

  const newVersion = version + 1;
  const now = new Date().toISOString();
  const encryptedBytes = base64ToUint8Array(encryptedData);
  const ivBytes = base64ToUint8Array(iv);

  // If favorite is explicitly provided use it; otherwise keep the existing value
  const newFavorite =
    typeof favorite === 'boolean' ? (favorite ? 1 : 0) : existing.favorite;

  await c.env.DB.prepare(
    `UPDATE vault_items
     SET encrypted_data = ?, iv = ?, version = ?, favorite = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
  )
    .bind(encryptedBytes, ivBytes, newVersion, newFavorite, now, id, userId)
    .run();

  return c.json({
    item: {
      id,
      itemType: existing.item_type,
      encryptedData,
      iv,
      version: newVersion,
      favorite: newFavorite === 1,
      deleted: false,
      createdAt: existing.created_at,
      updatedAt: now,
    } satisfies VaultItemResponse,
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/vault/items/:id
// ---------------------------------------------------------------------------

/**
 * Soft-delete a vault item by setting deleted = 1. The item remains in D1
 * for sync purposes and can be permanently purged later. Returns 404 if the
 * item does not exist or does not belong to the authenticated user.
 */
vaultRoutes.delete('/items/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  // Verify the item exists and belongs to the user
  const existing = await c.env.DB.prepare(
    `SELECT id FROM vault_items WHERE id = ? AND user_id = ?`,
  )
    .bind(id, userId)
    .first<{ id: string }>();

  if (!existing) {
    return c.json({ error: 'Item not found' }, 404);
  }

  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `UPDATE vault_items SET deleted = 1, updated_at = ? WHERE id = ? AND user_id = ?`,
  )
    .bind(now, id, userId)
    .run();

  return c.json({ message: 'Item deleted', id, updatedAt: now });
});
