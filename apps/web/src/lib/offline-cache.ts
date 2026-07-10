/**
 * IndexedDB offline cache for encrypted vault items.
 *
 * Items stored here are already encrypted with AES-256-GCM before reaching
 * this layer, so persisting them in IndexedDB does not expose plaintext.
 * The cache lets the app display vault contents when the network is
 * unavailable and sync changes once connectivity returns.
 */

const DB_NAME = "my-one-password";
const DB_VERSION = 1;

const ITEMS_STORE = "encrypted-items";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CachedItem {
  id: string;
  itemType: string;
  /** Base64-encoded ciphertext. */
  encryptedData: string;
  /** Base64-encoded initialisation vector. */
  iv: string;
  version: number;
  favorite: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Database lifecycle
// ---------------------------------------------------------------------------

/**
 * Open (or create/upgrade) the IndexedDB database.
 *
 * Creates the `encrypted-items` object store, which holds only AES-GCM
 * ciphertext for offline access.
 */
export function openCache(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(ITEMS_STORE)) {
        db.createObjectStore(ITEMS_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// Item operations
// ---------------------------------------------------------------------------

/**
 * Bulk upsert encrypted vault items into the cache.
 *
 * Each item is written via `put` so existing entries with the same `id` are
 * replaced, making this safe to call on every sync without clearing first.
 */
export async function cacheItems(items: CachedItem[]): Promise<void> {
  const db = await openCache();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ITEMS_STORE, "readwrite");
      const store = tx.objectStore(ITEMS_STORE);

      for (const item of items) {
        store.put(item);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Retrieve every cached item from the store.
 */
export async function getCachedItems(): Promise<CachedItem[]> {
  const db = await openCache();
  try {
    return await new Promise<CachedItem[]>((resolve, reject) => {
      const tx = db.transaction(ITEMS_STORE, "readonly");
      const request = tx.objectStore(ITEMS_STORE).getAll();

      request.onsuccess = () => resolve(request.result as CachedItem[]);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Remove a single cached item by its id.
 */
export async function removeCachedItem(id: string): Promise<void> {
  const db = await openCache();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ITEMS_STORE, "readwrite");
      const store = tx.objectStore(ITEMS_STORE);
      store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Clear all cached items. Call this on logout so no encrypted data persists
 * after the user signs out.
 */
export async function clearCache(): Promise<void> {
  const db = await openCache();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ITEMS_STORE, "readwrite");
      tx.objectStore(ITEMS_STORE).clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
