import { create } from "zustand";
import type { DecryptedVaultItem, VaultItemData, ItemType } from "@my-one-password/shared";

import {
  encryptAndSaveItem,
  encryptAndUpdateItem,
  fetchAndDecryptItems,
  deleteItem,
} from "../services/vault";
import { useAuthStore } from "./auth-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VaultState {
  items: DecryptedVaultItem[];
  loading: boolean;
  error: string | null;
  selectedItemId: string | null;

  loadItems: () => Promise<void>;
  addItem: (itemType: ItemType, data: VaultItemData, favorite?: boolean) => Promise<void>;
  updateItem: (id: string, data: VaultItemData, favorite?: boolean) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  setSelectedItem: (id: string | null) => void;
  clearVault: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAuthState() {
  const { vaultKey, sessionToken } = useAuthStore.getState();
  if (!vaultKey || !sessionToken) {
    throw new Error("Vault is locked or session is invalid.");
  }
  return { vaultKey, sessionToken };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useVaultStore = create<VaultState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  selectedItemId: null,

  async loadItems() {
    set({ loading: true, error: null });
    try {
      const { vaultKey, sessionToken } = getAuthState();
      const items = await fetchAndDecryptItems(vaultKey, sessionToken);
      set({ items, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load vault items.";
      set({ error: message, loading: false });
    }
  },

  async addItem(itemType, data, favorite) {
    set({ error: null });
    try {
      const { vaultKey, sessionToken } = getAuthState();
      const newItem = await encryptAndSaveItem(vaultKey, itemType, data, sessionToken, favorite);
      set((state) => ({ items: [newItem, ...state.items] }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create item.";
      set({ error: message });
      throw err;
    }
  },

  async updateItem(id, data, favorite) {
    set({ error: null });
    try {
      const { vaultKey, sessionToken } = getAuthState();
      const existing = get().items.find((item) => item.id === id);
      if (!existing) throw new Error("Item not found.");

      const updated = await encryptAndUpdateItem(
        vaultKey,
        id,
        data,
        existing.version,
        sessionToken,
        favorite ?? existing.favorite,
      );

      set((state) => ({
        items: state.items.map((item) => (item.id === id ? updated : item)),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update item.";
      set({ error: message });
      throw err;
    }
  },

  async removeItem(id) {
    set({ error: null });
    try {
      const { sessionToken } = getAuthState();
      await deleteItem(id, sessionToken);
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete item.";
      set({ error: message });
      throw err;
    }
  },

  async toggleFavorite(id) {
    const existing = get().items.find((item) => item.id === id);
    if (!existing) return;
    await get().updateItem(id, existing.data, !existing.favorite);
  },

  setSelectedItem(id) {
    set({ selectedItemId: id });
  },

  clearVault() {
    set({ items: [], loading: false, error: null, selectedItemId: null });
  },
}));
