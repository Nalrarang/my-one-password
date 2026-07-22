import { useEffect, useState, useMemo } from "react";
import { KeyRound } from "lucide-react";
import type { ItemType, VaultItemData } from "@my-one-password/shared";
import { CRYPTO_CONFIG } from "@my-one-password/shared";

import { useTranslation } from "../lib/i18n";
import { lock, logOut } from "../services/auth";
import { useVaultStore } from "../stores/vault-store";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { copyToClipboard } from "../lib/clipboard";
import { AppShell, type Section } from "../components/shell/AppShell";
import { VaultList, getTitle, getSubtitle } from "../components/shell/VaultList";
import { PasswordGenerator } from "../components/PasswordGenerator";
import { ItemFormPage } from "./ItemFormPage";
import { ItemDetailPage } from "./ItemDetailPage";
import { ImportPage } from "./ImportPage";
import { BackupPage } from "./BackupPage";
import { PasswordHealthPage } from "./PasswordHealthPage";

type View =
  | { kind: "list" }
  | { kind: "detail"; itemId: string }
  | { kind: "create" }
  | { kind: "edit"; itemId: string }
  | { kind: "import" }
  | { kind: "backup" };

const TYPE_SECTIONS: Section[] = ["login", "card", "note", "identity"];

export function VaultPage() {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();

  const items = useVaultStore((s) => s.items);
  const loadItems = useVaultStore((s) => s.loadItems);
  const addItem = useVaultStore((s) => s.addItem);
  const updateItem = useVaultStore((s) => s.updateItem);
  const removeItem = useVaultStore((s) => s.removeItem);
  const toggleFavorite = useVaultStore((s) => s.toggleFavorite);
  const startAutoSync = useVaultStore((s) => s.startAutoSync);
  const clearVault = useVaultStore((s) => s.clearVault);

  const [section, setSection] = useState<Section>("all");
  const [view, setView] = useState<View>({ kind: "list" });
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadItems().then(() => startAutoSync());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => clearVault();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(
    () => ({
      all: items.length,
      login: items.filter((i) => i.itemType === "login").length,
      card: items.filter((i) => i.itemType === "card").length,
      note: items.filter((i) => i.itemType === "note").length,
      identity: items.filter((i) => i.itemType === "identity").length,
      favorites: items.filter((i) => i.favorite).length,
    }),
    [items],
  );

  const listItems = useMemo(() => {
    let r = items;
    if (section === "favorites") r = r.filter((i) => i.favorite);
    else if (TYPE_SECTIONS.includes(section)) r = r.filter((i) => i.itemType === section);
    const q = search.trim().toLowerCase();
    if (q) r = r.filter((i) => getTitle(i).toLowerCase().includes(q) || getSubtitle(i).toLowerCase().includes(q));
    return r;
  }, [items, section, search]);

  const catTitle = useMemo(() => {
    const map: Record<string, string> = {
      all: t("vault.all"),
      login: t("vault.logins"),
      card: t("vault.cards"),
      note: t("vault.notes"),
      identity: t("vault.identities"),
      favorites: t("vault.favorites"),
    };
    return map[section] ?? t("vault.all");
  }, [section, t]);

  // --- Handlers ---
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
  async function handleUpdate(itemId: string, data: VaultItemData) {
    await updateItem(itemId, data);
    setView({ kind: "detail", itemId });
  }
  async function handleDelete(itemId: string) {
    await removeItem(itemId);
    setView({ kind: "list" });
  }
  async function handleImport(imported: Array<{ itemType: ItemType; data: VaultItemData; favorite: boolean }>) {
    for (const it of imported) await addItem(it.itemType, it.data, it.favorite);
  }

  function navigate(s: Section) {
    setSection(s);
    setView({ kind: "list" });
  }

  const selectedId = view.kind === "detail" ? view.itemId : view.kind === "edit" ? view.itemId : null;

  // --- Active pane (detail / form) shared by desktop right-pane and mobile screen ---
  function activePane(): React.ReactNode {
    if (view.kind === "create") {
      return <ItemFormPage mode="create" onSave={handleCreate} onCancel={() => setView({ kind: "list" })} />;
    }
    if (view.kind === "edit") {
      const item = items.find((i) => i.id === view.itemId);
      if (!item) return null;
      return (
        <ItemFormPage
          mode="edit"
          editItem={item}
          onSave={(_ty, data) => handleUpdate(view.itemId, data)}
          onCancel={() => setView({ kind: "detail", itemId: view.itemId })}
        />
      );
    }
    if (view.kind === "detail") {
      const item = items.find((i) => i.id === view.itemId);
      if (!item) return null;
      return (
        <ItemDetailPage
          item={item}
          onEdit={() => setView({ kind: "edit", itemId: item.id })}
          onDelete={() => handleDelete(item.id)}
          onBack={() => setView({ kind: "list" })}
        />
      );
    }
    return null;
  }

  function noSelection() {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[var(--canvas)] text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--panel-2)] text-[var(--text-4)]">
          <KeyRound className="h-7 w-7" />
        </div>
        <div className="mt-4 text-[15px] font-medium text-[var(--text-3)]">{t("detail.selectPrompt")}</div>
      </div>
    );
  }

  const list = (
    <VaultList
      section={section}
      title={catTitle}
      items={listItems}
      counts={counts}
      search={search}
      onSearch={setSearch}
      selectedId={selectedId}
      onSelect={(id) => setView({ kind: "detail", itemId: id })}
      onAdd={() => setView({ kind: "create" })}
      onToggleFavorite={(id) => toggleFavorite(id)}
      onImport={() => setView({ kind: "import" })}
      onBackup={() => setView({ kind: "backup" })}
      onNavigate={navigate}
      onLock={handleLock}
    />
  );

  // --- Build content ---
  let content: React.ReactNode;

  if (section === "health") {
    content = (
      <PasswordHealthPage
        onBack={() => navigate("all")}
        onSelectItem={(id) => {
          setSection("all");
          setView({ kind: "detail", itemId: id });
        }}
      />
    );
  } else if (section === "generator") {
    content = (
      <div className="flex h-full items-start justify-center overflow-y-auto bg-[var(--canvas)] p-6">
        <div className="w-full max-w-lg">
          <PasswordGenerator onSelect={(pw) => copyToClipboard(pw, CRYPTO_CONFIG.CLIPBOARD_CLEAR_TIMEOUT)} />
        </div>
      </div>
    );
  } else if (view.kind === "import") {
    content = <ImportPage onImport={handleImport} onBack={() => { loadItems(); setView({ kind: "list" }); }} />;
  } else if (view.kind === "backup") {
    content = <BackupPage onBack={() => setView({ kind: "list" })} />;
  } else if (isDesktop) {
    content = (
      <>
        <div className="w-[372px] min-w-[372px] border-r border-[var(--border)]">{list}</div>
        <div className="min-w-0 flex-1 overflow-y-auto bg-[var(--canvas)]">{activePane() ?? noSelection()}</div>
      </>
    );
  } else {
    // mobile: one screen at a time
    content =
      view.kind === "detail" || view.kind === "create" || view.kind === "edit"
        ? <div className="h-full overflow-y-auto">{activePane()}</div>
        : list;
  }

  return (
    <AppShell
      section={section}
      onNavigate={navigate}
      counts={counts}
      issueCount={0}
      onLock={handleLock}
      onLogout={handleLogout}
    >
      {content}
    </AppShell>
  );
}
