/**
 * Multi-device sync manager.
 *
 * Handles incremental pull/push synchronization with the server,
 * automatic sync on visibility change, and periodic polling.
 */

import { decrypt, importKey, decodeUtf8 } from "@my-one-password/crypto";
import type { DecryptedVaultItem, ItemType, VaultItemData } from "@my-one-password/shared";

import * as api from "../services/api";
import type { VaultItemResponse } from "../services/api";
import { fromBase64 } from "./encoding";
import { cacheItems } from "./offline-cache";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEVICE_ID_KEY = "my1p_device_id";
const LAST_SYNC_KEY = "my1p_last_sync_at";
const SYNC_INTERVAL_MS = 60_000; // 1 minute

// ---------------------------------------------------------------------------
// Device ID
// ---------------------------------------------------------------------------

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// ---------------------------------------------------------------------------
// Last sync timestamp
// ---------------------------------------------------------------------------

function getLastSyncAt(): string {
  return localStorage.getItem(LAST_SYNC_KEY) ?? "1970-01-01T00:00:00.000Z";
}

function setLastSyncAt(timestamp: string): void {
  localStorage.setItem(LAST_SYNC_KEY, timestamp);
}

// ---------------------------------------------------------------------------
// Decrypt helper
// ---------------------------------------------------------------------------

async function decryptItems(
  vaultKey: Uint8Array,
  items: VaultItemResponse[],
): Promise<DecryptedVaultItem[]> {
  const cryptoKey = await importKey(vaultKey);

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

// ---------------------------------------------------------------------------
// Pull changes
// ---------------------------------------------------------------------------

export interface SyncResult {
  updatedItems: DecryptedVaultItem[];
  deletedIds: string[];
  hasMore: boolean;
}

/**
 * Pull changes from the server since the last sync.
 * Returns decrypted items that were created/updated and IDs of deleted items.
 */
export async function pullChanges(
  vaultKey: Uint8Array,
  sessionToken: string,
): Promise<SyncResult> {
  const since = getLastSyncAt();
  const deviceId = getDeviceId();

  const response = await api.getSyncChanges(sessionToken, since, deviceId);

  // Separate active items from deleted tombstones
  const activeRaw = response.items.filter((i) => !i.deleted);
  const deletedIds = response.items.filter((i) => i.deleted).map((i) => i.id);

  // Decrypt active items
  const updatedItems = activeRaw.length > 0
    ? await decryptItems(vaultKey, activeRaw)
    : [];

  // Cache encrypted items for offline access
  if (activeRaw.length > 0) {
    cacheItems(activeRaw).catch(() => {/* best-effort */});
  }

  // Update last sync timestamp
  setLastSyncAt(response.syncToken);

  return {
    updatedItems,
    deletedIds,
    hasMore: response.hasMore,
  };
}

// ---------------------------------------------------------------------------
// Merge into local state
// ---------------------------------------------------------------------------

/**
 * Merge sync results into the current items array.
 * - Updated items replace existing ones by ID or are appended.
 * - Deleted IDs are removed.
 */
export function mergeItems(
  current: DecryptedVaultItem[],
  syncResult: SyncResult,
): DecryptedVaultItem[] {
  const { updatedItems, deletedIds } = syncResult;
  const deletedSet = new Set(deletedIds);
  const updatedMap = new Map(updatedItems.map((item) => [item.id, item]));

  // Start with current items, filtering out deleted and replacing updated
  const merged = current
    .filter((item) => !deletedSet.has(item.id))
    .map((item) => updatedMap.get(item.id) ?? item);

  // Remove IDs that were already in current from updatedMap
  for (const item of current) {
    updatedMap.delete(item.id);
  }

  // Append truly new items
  for (const newItem of updatedMap.values()) {
    merged.push(newItem);
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Sync manager (auto-sync with visibility change + polling)
// ---------------------------------------------------------------------------

type SyncCallback = (result: SyncResult) => void;

let syncIntervalId: ReturnType<typeof setInterval> | null = null;
let visibilityHandler: (() => void) | null = null;

/**
 * Start automatic background sync.
 *
 * Syncs immediately, then on:
 * - Periodic interval (every 60 seconds)
 * - Tab becomes visible (document.visibilitychange)
 *
 * @param getAuth - Function that returns current auth state (returns null if locked)
 * @param onSync  - Callback with sync results to merge into store
 */
export function startSync(
  getAuth: () => { vaultKey: Uint8Array; sessionToken: string } | null,
  onSync: SyncCallback,
): void {
  stopSync(); // Clean up any existing sync

  async function doSync() {
    const auth = getAuth();
    if (!auth) return;

    try {
      let result = await pullChanges(auth.vaultKey, auth.sessionToken);
      onSync(result);

      // If there are more changes, keep pulling
      while (result.hasMore) {
        const nextAuth = getAuth();
        if (!nextAuth) break;
        result = await pullChanges(nextAuth.vaultKey, nextAuth.sessionToken);
        onSync(result);
      }
    } catch {
      // Silently fail — will retry on next interval
    }
  }

  // Initial sync
  doSync();

  // Periodic polling
  syncIntervalId = setInterval(doSync, SYNC_INTERVAL_MS);

  // Visibility change (tab becomes active)
  visibilityHandler = () => {
    if (document.visibilityState === "visible") {
      doSync();
    }
  };
  document.addEventListener("visibilitychange", visibilityHandler);
}

/**
 * Stop automatic background sync.
 */
export function stopSync(): void {
  if (syncIntervalId !== null) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
  if (visibilityHandler) {
    document.removeEventListener("visibilitychange", visibilityHandler);
    visibilityHandler = null;
  }
}
