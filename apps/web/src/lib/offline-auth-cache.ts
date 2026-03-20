/**
 * IndexedDB cache for the authentication data needed to unlock the vault
 * offline.
 *
 * Stored fields:
 *  - `email`        -- identifies the account.
 *  - `salt`         -- PBKDF2 salt used to derive the master key.
 *  - `encVaultKey`  -- the vault encryption key, itself encrypted by the
 *                      master key (AES-256-GCM).
 *  - `authKeyHash`  -- hash of the auth key so we can verify the master
 *                      password without a server round-trip.
 *
 * All sensitive values are already encrypted or hashed before reaching this
 * layer.  The plaintext master password is never stored.
 */

import { openCache } from "./offline-cache";

const AUTH_STORE = "auth-cache";

/**
 * Single well-known key used for the one auth-data record.
 * Using a constant key means `put` always overwrites the previous entry.
 */
const AUTH_RECORD_KEY = "auth-data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthCacheData {
  email: string;
  salt: string;
  encVaultKey: string;
  authKeyHash: string;
}

/** Internal shape stored in IndexedDB (adds the synthetic key). */
interface AuthRecord extends AuthCacheData {
  key: string;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * Persist auth data so the vault can be unlocked without network access.
 *
 * Call this after a successful online login/unlock so subsequent offline
 * sessions have the material they need.
 */
export async function cacheAuthData(data: AuthCacheData): Promise<void> {
  const db = await openCache();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(AUTH_STORE, "readwrite");
      const record: AuthRecord = { key: AUTH_RECORD_KEY, ...data };
      tx.objectStore(AUTH_STORE).put(record);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Retrieve the cached auth data, or `null` if nothing has been cached yet
 * (e.g. the user has never logged in on this device).
 */
export async function getAuthData(): Promise<AuthCacheData | null> {
  const db = await openCache();
  try {
    return await new Promise<AuthCacheData | null>((resolve, reject) => {
      const tx = db.transaction(AUTH_STORE, "readonly");
      const request = tx.objectStore(AUTH_STORE).get(AUTH_RECORD_KEY);

      request.onsuccess = () => {
        const record = request.result as AuthRecord | undefined;
        if (!record) {
          resolve(null);
          return;
        }
        const { email, salt, encVaultKey, authKeyHash } = record;
        resolve({ email, salt, encVaultKey, authKeyHash });
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Remove cached auth data. Call this on logout alongside `clearCache()` so
 * no authentication material remains on the device.
 */
export async function clearAuthData(): Promise<void> {
  const db = await openCache();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(AUTH_STORE, "readwrite");
      tx.objectStore(AUTH_STORE).clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
