import { Search, Plus, Key, CreditCard, FileText, UserCircle, Star, Lock, Upload, Download } from "lucide-react";
import type { DecryptedVaultItem } from "@my-one-password/shared";

import { useTranslation } from "../../lib/i18n";
import type { Section } from "./AppShell";

function ItemIcon({ type }: { type: string }) {
  const cls = "h-[18px] w-[18px]";
  switch (type) {
    case "login":
      return <Key className={cls} />;
    case "card":
      return <CreditCard className={cls} />;
    case "note":
      return <FileText className={cls} />;
    case "identity":
      return <UserCircle className={cls} />;
    default:
      return null;
  }
}

export function getTitle(item: DecryptedVaultItem): string {
  if ("title" in item.data) return (item.data as { title?: string }).title || "Untitled";
  return "Untitled";
}

export function getSubtitle(item: DecryptedVaultItem): string {
  const { data } = item;
  switch (data.type) {
    case "login":
      return data.username || data.url || "";
    case "card":
      return data.cardNumber ? `•••• ${data.cardNumber.slice(-4)}` : "";
    case "note":
      return data.content ? data.content.slice(0, 60) : "";
    case "identity":
      return [data.firstName, data.lastName].filter(Boolean).join(" ") || data.email || "";
    default:
      return "";
  }
}

interface VaultListProps {
  section: Section;
  title: string;
  items: DecryptedVaultItem[];
  search: string;
  onSearch: (v: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onToggleFavorite: (id: string) => void;
  onImport: () => void;
  onBackup: () => void;
}

/** The vault list pane — desktop left column and mobile main screen. */
export function VaultList({
  title,
  items,
  search,
  onSearch,
  selectedId,
  onSelect,
  onAdd,
  onToggleFavorite,
  onImport,
  onBackup,
}: VaultListProps) {
  const { t } = useTranslation();
  const iconBtn =
    "grid h-[34px] w-[34px] place-items-center rounded-lg text-[var(--text-3)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)]";

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[var(--panel)]">
      <div className="px-5 pb-3 pt-5">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="text-xl font-bold text-[var(--text)]">{title}</div>
            <div className="mt-0.5 text-xs text-[var(--text-3)]">
              {t("vault.itemCount").replace("{n}", String(items.length))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className={iconBtn} onClick={onImport} aria-label={t("vault.import")}>
              <Upload className="h-[17px] w-[17px]" />
            </button>
            <button className={iconBtn} onClick={onBackup} aria-label={t("backup.title")}>
              <Download className="h-[17px] w-[17px]" />
            </button>
            <button
              onClick={onAdd}
              className="ml-1 inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-[13px] font-semibold text-white transition-[filter] hover:brightness-95"
            >
              <Plus className="h-[15px] w-[15px]" />
              {t("vault.add")}
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-[var(--text-3)]" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t("vault.search")}
            className="h-[42px] w-full rounded-[10px] border border-[var(--border)] bg-[var(--field)] pl-10 pr-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-3)] focus:border-[var(--accent)]"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-1.5">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-5 py-10 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--panel-2)] text-[var(--text-4)]">
              <Lock className="h-7 w-7" />
            </div>
            <div className="mt-4 text-[15px] font-semibold text-[var(--text-2)]">{t("vault.noItems")}</div>
            <button
              onClick={onAdd}
              className="mt-[18px] inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-[13px] font-semibold text-white hover:brightness-95"
            >
              <Plus className="h-[14px] w-[14px]" />
              {t("vault.addItem")}
            </button>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {items.map((item) => {
              const selected = item.id === selectedId;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onSelect(item.id)}
                    data-selected={selected}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--hover)] data-[selected=true]:bg-[var(--sel)]"
                  >
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[var(--panel-2)] text-[var(--text-2)]">
                      <ItemIcon type={item.itemType} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[var(--text)]">
                        {getTitle(item)}
                      </span>
                      <span className="block truncate text-xs text-[var(--text-3)]">{getSubtitle(item)}</span>
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(item.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          onToggleFavorite(item.id);
                        }
                      }}
                      className="flex-none rounded p-1 text-[var(--text-4)] hover:text-[var(--text-2)]"
                    >
                      <Star className={`h-4 w-4 ${item.favorite ? "fill-[var(--warn)] text-[var(--warn)]" : ""}`} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
