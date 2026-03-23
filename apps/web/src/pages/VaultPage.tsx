import { useEffect, useState, useMemo } from "react";
import type { ItemType, VaultItemData, DecryptedVaultItem } from "@my-one-password/shared";
import {
  Search,
  Plus,
  Lock,
  LogOut,
  Star,
  Key,
  CreditCard,
  FileText,
  UserCircle,
  Upload,
  Loader2,
} from "lucide-react";

import { useTranslation } from "../lib/i18n";
import { lock, logOut } from "../services/auth";
import { useVaultStore } from "../stores/vault-store";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { ItemFormPage } from "./ItemFormPage";
import { ItemDetailPage } from "./ItemDetailPage";
import { ImportPage } from "./ImportPage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type View =
  | { kind: "list" }
  | { kind: "detail"; itemId: string }
  | { kind: "create" }
  | { kind: "edit"; itemId: string }
  | { kind: "import" };

type FilterType = "all" | ItemType;

// ---------------------------------------------------------------------------
// Icons by item type
// ---------------------------------------------------------------------------

function ItemTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "login":
      return <Key className="h-5 w-5" aria-hidden="true" />;
    case "card":
      return <CreditCard className="h-5 w-5" aria-hidden="true" />;
    case "note":
      return <FileText className="h-5 w-5" aria-hidden="true" />;
    case "identity":
      return <UserCircle className="h-5 w-5" aria-hidden="true" />;
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
// Main component
// ---------------------------------------------------------------------------

export function VaultPage() {
  const { t } = useTranslation();

  const items = useVaultStore((s) => s.items);
  const loading = useVaultStore((s) => s.loading);
  const error = useVaultStore((s) => s.error);
  const loadItems = useVaultStore((s) => s.loadItems);
  const addItem = useVaultStore((s) => s.addItem);
  const updateItem = useVaultStore((s) => s.updateItem);
  const removeItem = useVaultStore((s) => s.removeItem);
  const toggleFavorite = useVaultStore((s) => s.toggleFavorite);
  const startAutoSync = useVaultStore((s) => s.startAutoSync);
  const clearVault = useVaultStore((s) => s.clearVault);

  const [view, setView] = useState<View>({ kind: "list" });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  // Filter definitions using t() for labels.
  const FILTERS: { value: FilterType; label: string }[] = useMemo(
    () => [
      { value: "all", label: t("vault.all") },
      { value: "login", label: t("vault.logins") },
      { value: "card", label: t("vault.cards") },
      { value: "note", label: t("vault.notes") },
      { value: "identity", label: t("vault.identities") },
    ],
    [t],
  );

  // Load items on mount and start background sync.
  useEffect(() => {
    loadItems().then(() => startAutoSync());
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

  async function handleImport(importItems: Array<{ itemType: ItemType; data: VaultItemData; favorite: boolean }>) {
    for (const item of importItems) {
      await addItem(item.itemType, item.data, item.favorite);
    }
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

  // Import view.
  if (view.kind === "import") {
    return (
      <ImportPage
        onImport={handleImport}
        onBack={() => {
          loadItems();
          setView({ kind: "list" });
        }}
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
        <h1 className="text-xl font-bold text-foreground">{t("vault.title")}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView({ kind: "import" })}
            aria-label={t("vault.import")}
          >
            <Upload className="mr-1 h-4 w-4" />
            {t("vault.import")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLock}
            aria-label={t("vault.lock")}
          >
            <Lock className="mr-1 h-4 w-4" />
            {t("vault.lock")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            aria-label={t("vault.signOut")}
          >
            <LogOut className="mr-1 h-4 w-4" />
            {t("vault.signOut")}
          </Button>
        </div>
      </header>

      {/* Search */}
      <div className="mt-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("vault.search")}
            className="pl-10"
            aria-label={t("vault.search")}
          />
        </div>
      </div>

      {/* Filter bar */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Filter by item type">
        {FILTERS.map((f) => (
          <Badge
            key={f.value}
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            variant={filter === f.value ? "default" : "outline"}
            className={`cursor-pointer whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value
                ? ""
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {f.label}
          </Badge>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div role="alert" className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <span className="sr-only">{t("vault.loading")}</span>
        </div>
      )}

      {/* Item list */}
      {!loading && filteredItems.length > 0 && (
        <ul className="mt-4 space-y-1.5" aria-label="Vault items">
          {filteredItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setView({ kind: "detail", itemId: item.id })}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <span className="flex-shrink-0 text-muted-foreground">
                  <ItemTypeIcon type={item.itemType} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {getTitle(item)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {getSubtitle(item)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={(e) => handleToggleFavorite(e, item.id)}
                  className="flex-shrink-0 rounded p-1 hover:bg-accent focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label={item.favorite ? t("vault.removeFromFavorites") : t("vault.addToFavorites")}
                >
                  <Star
                    className={`h-4 w-4 ${
                      item.favorite
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Empty state */}
      {!loading && filteredItems.length === 0 && (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-muted p-4">
            <Lock className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {items.length === 0
              ? t("vault.noItems")
              : t("vault.noResults")}
          </p>
        </div>
      )}

      {/* FAB */}
      <Button
        size="icon"
        onClick={() => setView({ kind: "create" })}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        aria-label={t("vault.addItem")}
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </Button>
    </div>
  );
}
