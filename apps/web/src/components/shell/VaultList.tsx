import { useState } from "react";
import { Search, Plus, Lock, Upload, Download, Star, ChevronRight } from "lucide-react";
import type { DecryptedVaultItem } from "@my-one-password/shared";

import { useTranslation } from "../../lib/i18n";
import { useIsDesktop } from "../../hooks/useMediaQuery";
import type { Section } from "./AppShell";

// ---------------------------------------------------------------------------
// Item display helpers
// ---------------------------------------------------------------------------

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

const PALETTE = ["#4769F7", "#7C5CFC", "#EC4899", "#F59E0B", "#10B981", "#06B6D4", "#EF4444", "#6366F1"];

export function colorOf(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function monoOf(title: string): string {
  const c = title.trim()[0];
  return c ? c.toUpperCase() : "?";
}

export type Strength = { key: "weak" | "medium" | "strong"; color: string; soft: string; pct: string };

/** Lightweight strength for list badges (full analysis lives in the health report). */
export function strengthOf(item: DecryptedVaultItem): Strength | null {
  if (item.data.type !== "login") return null;
  const pw = item.data.password;
  if (!pw) return null;
  let cls = 0;
  if (/[a-z]/.test(pw)) cls++;
  if (/[A-Z]/.test(pw)) cls++;
  if (/[0-9]/.test(pw)) cls++;
  if (/[^a-zA-Z0-9]/.test(pw)) cls++;
  if (pw.length < 8 || cls <= 1) return { key: "weak", color: "var(--neg)", soft: "var(--neg-soft)", pct: "34%" };
  if (pw.length >= 12 && cls >= 3) return { key: "strong", color: "var(--pos)", soft: "var(--pos-soft)", pct: "100%" };
  return { key: "medium", color: "var(--warn)", soft: "var(--warn-soft)", pct: "67%" };
}

export function Mono({ title, size, radius, font }: { title: string; size: number; radius: number; font: number }) {
  return (
    <div
      className="grid flex-none place-items-center font-bold text-white"
      style={{ width: size, height: size, borderRadius: radius, background: colorOf(title), fontSize: font }}
    >
      {monoOf(title)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type ViewMode = "card" | "compact" | "group";
const VIEW_KEY = "mop:viewMode";

interface VaultListProps {
  section: Section;
  title: string;
  items: DecryptedVaultItem[];
  counts: Record<"all" | "login" | "card" | "note" | "identity" | "favorites", number>;
  search: string;
  onSearch: (v: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onToggleFavorite: (id: string) => void;
  onImport: () => void;
  onBackup: () => void;
  onNavigate: (s: Section) => void;
  onLock: () => void;
}

const TYPE_ORDER: Array<{ type: DecryptedVaultItem["itemType"]; labelKey: string }> = [
  { type: "login", labelKey: "vault.logins" },
  { type: "card", labelKey: "vault.cards" },
  { type: "note", labelKey: "vault.notes" },
  { type: "identity", labelKey: "vault.identities" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VaultList(props: VaultListProps) {
  const isDesktop = useIsDesktop();
  return isDesktop ? <DesktopList {...props} /> : <MobileList {...props} />;
}

// --- Desktop: view-mode toggle + card/compact/group ---

function DesktopList({
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
  const [mode, setMode] = useState<ViewMode>(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "card" || v === "compact" || v === "group") return v;
    } catch {
      /* ignore */
    }
    return "card";
  });
  function pickMode(m: ViewMode) {
    setMode(m);
    try {
      localStorage.setItem(VIEW_KEY, m);
    } catch {
      /* ignore */
    }
  }

  const iconBtn =
    "grid h-[34px] w-[34px] place-items-center rounded-lg text-[var(--text-3)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)]";
  const seg = (on: boolean) =>
    `h-8 flex-1 rounded-[7px] text-[13px] font-semibold transition-colors ${
      on ? "bg-[var(--accent)] text-white" : "text-[var(--text-2)]"
    }`;

  function strengthBadge(item: DecryptedVaultItem) {
    const s = strengthOf(item);
    if (!s) return null;
    return (
      <span
        className="rounded-full px-2 py-[3px] text-[11px] font-semibold"
        style={{ background: s.soft, color: s.color }}
      >
        {t(`strength.${s.key}`)}
      </span>
    );
  }

  function favBtn(item: DecryptedVaultItem) {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(item.id);
        }}
        className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg text-[var(--text-4)] hover:bg-[var(--hover)]"
      >
        <Star className={`h-[17px] w-[17px] ${item.favorite ? "fill-[#FFCD00] text-[#FFCD00]" : ""}`} />
      </span>
    );
  }

  function cardRow(item: DecryptedVaultItem) {
    return (
      <div
        key={item.id}
        onClick={() => onSelect(item.id)}
        data-selected={item.id === selectedId}
        className="mb-[5px] flex cursor-pointer items-center gap-3 rounded-xl px-3 py-[11px] transition-colors hover:bg-[var(--hover)] data-[selected=true]:bg-[var(--sel)]"
      >
        <Mono title={getTitle(item)} size={40} radius={11} font={16} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[var(--text)]">{getTitle(item)}</div>
          <div className="truncate text-[13px] text-[var(--text-3)]">{getSubtitle(item)}</div>
        </div>
        {strengthBadge(item)}
        {favBtn(item)}
      </div>
    );
  }

  function compactRow(item: DecryptedVaultItem) {
    const s = strengthOf(item);
    return (
      <div
        key={item.id}
        onClick={() => onSelect(item.id)}
        data-selected={item.id === selectedId}
        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--hover)] data-[selected=true]:bg-[var(--sel)]"
      >
        <Mono title={getTitle(item)} size={28} radius={8} font={12} />
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="max-w-[55%] flex-none truncate text-[13px] font-semibold text-[var(--text)]">
            {getTitle(item)}
          </span>
          <span className="truncate text-xs text-[var(--text-3)]">{getSubtitle(item)}</span>
        </div>
        {s && <span className="h-2 w-2 flex-none rounded-full" style={{ background: s.color }} />}
      </div>
    );
  }

  const empty = (
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
  );

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
              className="ml-1 inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-[13px] font-semibold text-white hover:brightness-95"
            >
              <Plus className="h-[15px] w-[15px]" />
              {t("vault.add")}
            </button>
          </div>
        </div>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-[var(--text-3)]" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t("vault.search")}
            className="h-[42px] w-full rounded-[10px] border border-[var(--border)] bg-[var(--field)] pl-10 pr-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-3)] focus:border-[var(--accent)]"
          />
        </div>
        <div className="flex gap-[3px] rounded-[9px] border border-[var(--border)] bg-[var(--panel-2)] p-[3px]">
          <button className={seg(mode === "card")} onClick={() => pickMode("card")}>{t("view.card")}</button>
          <button className={seg(mode === "compact")} onClick={() => pickMode("compact")}>{t("view.compact")}</button>
          <button className={seg(mode === "group")} onClick={() => pickMode("group")}>{t("view.group")}</button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-1.5">
        {items.length === 0
          ? empty
          : mode === "card"
            ? items.map(cardRow)
            : mode === "compact"
              ? items.map(compactRow)
              : TYPE_ORDER.map(({ type, labelKey }) => {
                  const group = items.filter((i) => i.itemType === type);
                  if (group.length === 0) return null;
                  return (
                    <div key={type}>
                      <div className="flex items-center gap-2 px-2.5 pb-1.5 pt-3.5">
                        <span className="text-xs font-bold text-[var(--text-2)]">{t(labelKey)}</span>
                        <span className="text-[11px] text-[var(--text-3)]">{group.length}</span>
                      </div>
                      {group.map(compactRow)}
                    </div>
                  );
                })}
      </div>
    </div>
  );
}

// --- Mobile: category chips + chevron rows ---

function MobileList({
  section,
  items,
  counts,
  search,
  onSearch,
  onSelect,
  onToggleFavorite,
  onNavigate,
  onLock,
}: VaultListProps) {
  const { t } = useTranslation();

  const CHIPS: { key: Section; label: string; count?: number }[] = [
    { key: "all", label: `${t("vault.all")} ${counts.all}` },
    { key: "favorites", label: t("vault.favorites") },
    { key: "login", label: t("vault.logins") },
    { key: "card", label: t("vault.cards") },
    { key: "note", label: t("vault.notes") },
    { key: "identity", label: t("vault.identities") },
  ];

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[var(--screen)] px-5 pt-6">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="text-[28px] font-bold tracking-[-0.4px] text-[var(--text)]">{t("nav.vault")}</div>
        <button
          onClick={onLock}
          className="grid h-[38px] w-[38px] place-items-center rounded-full bg-[var(--field)] text-[var(--text-2)]"
          aria-label={t("vault.lock")}
        >
          <Lock className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div className="relative mb-3.5">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--text-3)]" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t("nav.search")}
          className="h-[46px] w-full rounded-[13px] bg-[var(--field)] pl-[42px] pr-3.5 text-[15px] text-[var(--text)] outline-none placeholder:text-[var(--text-3)]"
        />
      </div>

      <div className="-mx-5 mb-2 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CHIPS.map((c) => {
          const on = section === c.key;
          return (
            <button
              key={c.key}
              onClick={() => onNavigate(c.key)}
              data-on={on}
              className="inline-flex h-[34px] flex-none items-center gap-1.5 rounded-full border px-[15px] text-[13px] font-semibold whitespace-nowrap transition-colors data-[on=false]:border-[var(--border)] data-[on=false]:bg-[var(--panel)] data-[on=false]:text-[var(--text-2)] data-[on=true]:border-[var(--accent)] data-[on=true]:bg-[var(--accent)] data-[on=true]:text-white"
            >
              {c.key === "favorites" && <Star className="h-[13px] w-[13px] fill-current" />}
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="rounded-[18px] bg-[var(--panel)] px-3.5 py-1">
          {items.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto mb-3.5 grid h-[60px] w-[60px] place-items-center rounded-full bg-[var(--field)] text-[var(--text-4)]">
                <Lock className="h-[26px] w-[26px]" />
              </div>
              <div className="text-[15px] font-semibold text-[var(--text-2)]">{t("vault.noItems")}</div>
            </div>
          ) : (
            items.map((item, idx) => {
              const s = strengthOf(item);
              return (
                <div key={item.id}>
                  <div onClick={() => onSelect(item.id)} className="flex cursor-pointer items-center gap-3 py-3">
                    <Mono title={getTitle(item)} size={44} radius={13} font={18} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold text-[var(--text)]">{getTitle(item)}</div>
                      <div className="truncate text-[13px] text-[var(--text-3)]">{getSubtitle(item)}</div>
                    </div>
                    {s && <span className="h-[9px] w-[9px] flex-none rounded-full" style={{ background: s.color }} />}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(item.id);
                      }}
                      className="flex-none text-[var(--text-4)]"
                    >
                      <Star className={`h-[15px] w-[15px] ${item.favorite ? "fill-[#FFCD00] text-[#FFCD00]" : ""}`} />
                    </span>
                    <ChevronRight className="h-[18px] w-[18px] flex-none text-[var(--text-4)]" />
                  </div>
                  {idx < items.length - 1 && <div className="ml-[57px] h-px bg-[var(--divider)]" />}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
