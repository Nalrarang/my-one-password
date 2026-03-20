import { useEffect, useState, useMemo } from "react";
import type { ItemType, VaultItemData, DecryptedVaultItem } from "@my-one-password/shared";

import { lock, logOut } from "../services/auth";
import { useVaultStore } from "../stores/vault-store";
import { ItemFormPage } from "./ItemFormPage";
import { ItemDetailPage } from "./ItemDetailPage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type View =
  | { kind: "list" }
  | { kind: "detail"; itemId: string }
  | { kind: "create" }
  | { kind: "edit"; itemId: string };

type FilterType = "all" | ItemType;

// ---------------------------------------------------------------------------
// Icons by item type
// ---------------------------------------------------------------------------

function ItemTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "login":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
        </svg>
      );
    case "card":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
        </svg>
      );
    case "note":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      );
    case "identity":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Subtitle helpers
// ---------------------------------------------------------------------------

function getSubtitle(item: DecryptedVaultItem): string {
  const { data } = item;
  switch (data.type) {
    case "login":
      return data.username || data.url || "";
    case "card":
      return data.cardNumber ? `\u2022\u2022\u2022\u2022 ${data.cardNumber.slice(-4)}` : "";
    case "note":
      return data.content ? data.content.slice(0, 60) : "";
    case "identity": {
      const name = [data.firstName, data.lastName].filter(Boolean).join(" ");
      return name || data.email || "";
    }
    default:
      return "";
  }
}

function getTitle(item: DecryptedVaultItem): string {
  if ("title" in item.data) return (item.data as { title: string }).title || "Untitled";
  return "Untitled";
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <svg className="h-8 w-8 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="sr-only">Loading vault items...</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Star icon
// ---------------------------------------------------------------------------

function StarIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg className="h-4 w-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

const FILTERS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "login", label: "Logins" },
  { value: "card", label: "Cards" },
  { value: "note", label: "Notes" },
  { value: "identity", label: "Identities" },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function VaultPage() {
  const items = useVaultStore((s) => s.items);
  const loading = useVaultStore((s) => s.loading);
  const error = useVaultStore((s) => s.error);
  const loadItems = useVaultStore((s) => s.loadItems);
  const addItem = useVaultStore((s) => s.addItem);
  const updateItem = useVaultStore((s) => s.updateItem);
  const removeItem = useVaultStore((s) => s.removeItem);
  const toggleFavorite = useVaultStore((s) => s.toggleFavorite);
  const clearVault = useVaultStore((s) => s.clearVault);

  const [view, setView] = useState<View>({ kind: "list" });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  // Load items on mount.
  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear vault when component unmounts (lock/logout).
  useEffect(() => {
    return () => {
      clearVault();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered and searched items.
  const filteredItems = useMemo(() => {
    let result = items;

    // Type filter.
    if (filter !== "all") {
      result = result.filter((item) => item.itemType === filter);
    }

    // Search filter.
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((item) => {
        const title = getTitle(item).toLowerCase();
        const subtitle = getSubtitle(item).toLowerCase();
        return title.includes(q) || subtitle.includes(q);
      });
    }

    return result;
  }, [items, filter, search]);

  // Handlers.
  function handleLock() {
    clearVault();
    lock();
  }

  async function handleLogout() {
    clearVault();
    await logOut();
  }

  async function handleCreate(itemType: ItemType, data: VaultItemData) {
    await addItem(itemType, data);
    setView({ kind: "list" });
  }

  async function handleUpdate(itemId: string, _itemType: ItemType, data: VaultItemData) {
    await updateItem(itemId, data);
    setView({ kind: "detail", itemId });
  }

  async function handleDelete(itemId: string) {
    await removeItem(itemId);
    setView({ kind: "list" });
  }

  async function handleToggleFavorite(e: React.MouseEvent, itemId: string) {
    e.stopPropagation();
    await toggleFavorite(itemId);
  }

  // ---------------------------------------------------------------------------
  // View routing
  // ---------------------------------------------------------------------------

  // Detail view.
  if (view.kind === "detail") {
    const item = items.find((i) => i.id === view.itemId);
    if (!item) {
      setView({ kind: "list" });
      return null;
    }
    return (
      <ItemDetailPage
        item={item}
        onEdit={() => setView({ kind: "edit", itemId: view.itemId })}
        onDelete={() => handleDelete(view.itemId)}
        onBack={() => setView({ kind: "list" })}
      />
    );
  }

  // Create view.
  if (view.kind === "create") {
    return (
      <ItemFormPage
        mode="create"
        onSave={handleCreate}
        onCancel={() => setView({ kind: "list" })}
      />
    );
  }

  // Edit view.
  if (view.kind === "edit") {
    const item = items.find((i) => i.id === view.itemId);
    if (!item) {
      setView({ kind: "list" });
      return null;
    }
    return (
      <ItemFormPage
        mode="edit"
        editItem={item}
        onSave={(_type, data) => handleUpdate(view.itemId, _type, data)}
        onCancel={() => setView({ kind: "detail", itemId: view.itemId })}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // List view (default)
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">My Vault</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLock}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950"
            aria-label="Lock vault"
          >
            Lock
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950"
            aria-label="Sign out"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="mt-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vault..."
            className="block w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-3 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Search vault items"
          />
        </div>
      </div>

      {/* Filter bar */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Filter by item type">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-blue-600 text-white"
                : "border border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div role="alert" className="mt-4 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && <Spinner />}

      {/* Item list */}
      {!loading && filteredItems.length > 0 && (
        <ul className="mt-4 space-y-1.5" aria-label="Vault items">
          {filteredItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setView({ kind: "detail", itemId: item.id })}
                className="flex w-full items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-left transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                <span className="flex-shrink-0 text-slate-400">
                  <ItemTypeIcon type={item.itemType} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-100">
                    {getTitle(item)}
                  </span>
                  <span className="block truncate text-xs text-slate-400">
                    {getSubtitle(item)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={(e) => handleToggleFavorite(e, item.id)}
                  className="flex-shrink-0 rounded p-1 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={item.favorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <StarIcon filled={item.favorite} />
                </button>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Empty state */}
      {!loading && filteredItems.length === 0 && (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-slate-800 p-4">
            <svg
              className="h-8 w-8 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            {items.length === 0
              ? "No items yet. Add your first item."
              : "No items match your search."}
          </p>
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => setView({ kind: "create" })}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950"
        aria-label="Add item"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
    </div>
  );
}
