import { encrypt, decrypt, importKey, encodeUtf8, decodeUtf8 } from "@my-one-password/crypto";
import type { VaultItemData, DecryptedVaultItem, ItemType } from "@my-one-password/shared";

import * as api from "./api";
import { toBase64, fromBase64 } from "../lib/encoding";
import { cacheItems, getCachedItems } from "../lib/offline-cache";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** AES-GCM IV length in bytes (must match the crypto package). */
const IV_LENGTH = 12;

// ---------------------------------------------------------------------------
// Encryption helpers
// ---------------------------------------------------------------------------

/**
 * Encrypt a VaultItemData payload and create a new vault item on the server.
 *
 * Flow:
 *  1. Serialize data to JSON, encode as UTF-8 bytes.
 *  2. Import the raw vault key as an AES-256-GCM CryptoKey.
 *  3. Encrypt (produces [IV (12 B) | ciphertext | auth tag]).
 *  4. Split result into IV and ciphertext, base64-encode both.
 *  5. POST to server.
 *  6. Return a DecryptedVaultItem containing the plaintext data.
 */
export async function encryptAndSaveItem(
  vaultKey: Uint8Array,
  itemType: ItemType,
  data: VaultItemData,
  sessionToken: string,
  favorite?: boolean,
): Promise<DecryptedVaultItem> {
  const plaintext = encodeUtf8(JSON.stringify(data));
  const cryptoKey = await importKey(vaultKey);
  const combined = await encrypt(cryptoKey, plaintext);

  const iv = combined.slice(0, IV_LENGTH);
  const encryptedData = combined.slice(IV_LENGTH);

  const response = await api.createVaultItem(sessionToken, {
    itemType,
    encryptedData: toBase64(encryptedData),
    iv: toBase64(iv),
    favorite,
  });

  return {
    id: response.id,
    itemType: response.itemType as ItemType,
    version: response.version,
    favorite: response.favorite,
    deleted: response.deleted,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
    data,
  };
}

/**
 * Encrypt updated data and send a PUT request to the server.
 */
export async function encryptAndUpdateItem(
  vaultKey: Uint8Array,
  itemId: string,
  data: VaultItemData,
  version: number,
  sessionToken: string,
  favorite?: boolean,
): Promise<DecryptedVaultItem> {
  const plaintext = encodeUtf8(JSON.stringify(data));
  const cryptoKey = await importKey(vaultKey);
  const combined = await encrypt(cryptoKey, plaintext);

  const iv = combined.slice(0, IV_LENGTH);
  const encryptedData = combined.slice(IV_LENGTH);

  const response = await api.updateVaultItem(sessionToken, itemId, {
    encryptedData: toBase64(encryptedData),
    iv: toBase64(iv),
    version,
    favorite,
  });

  return {
    id: response.id,
    itemType: response.itemType as ItemType,
    version: response.version,
    favorite: response.favorite,
    deleted: response.deleted,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
    data,
  };
}

/**
 * Decrypt a list of raw API/cached items using the provided CryptoKey.
 */
async function decryptRawItems(
  cryptoKey: CryptoKey,
  items: Array<{ id: string; itemType: string; encryptedData: string; iv: string; version: number; favorite: boolean; deleted: boolean; createdAt: string; updatedAt: string }>,
): Promise<DecryptedVaultItem[]> {
  return Promise.all(
    items.map(async (item) => {
      const iv = fromBase64(item.iv);
      const encryptedData = fromBase64(item.encryptedData);

      const combined = new Uint8Array(iv.length + encryptedData.length);
      combined.set(iv, 0);
      combined.set(encryptedData, iv.length);

      const plaintext = await decrypt(cryptoKey, combined);
      const data = JSON.parse(decodeUtf8(plaintext)) as VaultItemData;

      return {
        id: item.id,
        itemType: item.itemType as ItemType,
        version: item.version,
        favorite: item.favorite,
        deleted: item.deleted,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        data,
      } satisfies DecryptedVaultItem;
    }),
  );
}

/**
 * Fetch all vault items from the server, decrypt each one, and return
 * an array of DecryptedVaultItem objects.
 *
 * When the network is unavailable, falls back to IndexedDB-cached
 * encrypted items (populated on previous successful fetches).
 */
export async function fetchAndDecryptItems(
  vaultKey: Uint8Array,
  sessionToken: string,
  filter?: { type?: string; favorite?: boolean },
): Promise<DecryptedVaultItem[]> {
  const cryptoKey = await importKey(vaultKey);

  try {
    const items = await api.getVaultItems(sessionToken, filter);

    // Cache encrypted items in IndexedDB for offline access.
    cacheItems(items).catch(() => {/* best-effort */});

    return decryptRawItems(cryptoKey, items);
  } catch (err) {
    // If offline, try IndexedDB cache.
    if (!navigator.onLine) {
      const cached = await getCachedItems();
      if (cached.length > 0) {
        return decryptRawItems(cryptoKey, cached);
      }
    }
    throw err;
  }
}

/**
 * Delete a vault item from the server.
 */
export async function deleteItem(
  itemId: string,
  sessionToken: string,
): Promise<void> {
  await api.deleteVaultItem(sessionToken, itemId);
}
