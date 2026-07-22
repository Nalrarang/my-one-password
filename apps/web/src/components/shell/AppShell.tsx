import {
  LayoutGrid,
  Key,
  CreditCard,
  FileText,
  UserCircle,
  Star,
  ShieldCheck,
  Wand2,
  Sun,
  Moon,
  Lock,
  LogOut,
  ShieldAlert,
} from "lucide-react";

import { useTranslation } from "../../lib/i18n";
import { useThemeStore } from "../../stores/theme-store";
import { useIsDesktop } from "../../hooks/useMediaQuery";

// ---------------------------------------------------------------------------
// Navigation model
// ---------------------------------------------------------------------------

export type Section =
  | "all"
  | "login"
  | "card"
  | "note"
  | "identity"
  | "favorites"
  | "health"
  | "generator";

export interface AppShellProps {
  section: Section;
  onNavigate: (section: Section) => void;
  counts: Record<"all" | "login" | "card" | "note" | "identity" | "favorites", number>;
  issueCount: number;
  onLock: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

type CountKey = "all" | "login" | "card" | "note" | "identity";

const VAULT_ITEMS: { key: CountKey; labelKey: string; icon: typeof Key }[] = [
  { key: "all", labelKey: "vault.all", icon: LayoutGrid },
  { key: "login", labelKey: "vault.logins", icon: Key },
  { key: "card", labelKey: "vault.cards", icon: CreditCard },
  { key: "note", labelKey: "vault.notes", icon: FileText },
  { key: "identity", labelKey: "vault.identities", icon: UserCircle },
];

// ---------------------------------------------------------------------------
// Desktop sidebar
// ---------------------------------------------------------------------------

function Sidebar({ section, onNavigate, counts, issueCount, onLock, onLogout }: Omit<AppShellProps, "children">) {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const navBtn = (active: boolean) =>
    `flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
        : "text-[var(--text-2)] hover:bg-[var(--hover)]"
    }`;

  return (
    <aside className="flex h-screen w-[244px] min-w-[244px] flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--sidebar)] p-[18px_14px]">
      <div className="flex items-center gap-2.5 px-2 pb-[18px] pt-1">
        <div className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--accent)] text-white">
          <ShieldCheck className="h-[18px] w-[18px]" />
        </div>
        <div className="text-[15px] font-bold tracking-[-0.2px] text-[var(--text)]">My One Password</div>
      </div>

      <div className="px-2 pb-1.5 pt-2 text-[11px] font-semibold tracking-[0.3px] text-[var(--text-3)]">
        {t("shell.vault")}
      </div>
      {VAULT_ITEMS.map(({ key, labelKey, icon: Icon }) => (
        <button key={key} className={navBtn(section === key)} onClick={() => onNavigate(key)}>
          <Icon className="h-[17px] w-[17px] shrink-0 text-[var(--text-3)]" />
          {t(labelKey)}
          <span className="ml-auto text-xs font-medium text-[var(--text-3)]">{counts[key]}</span>
        </button>
      ))}

      <div className="mx-1.5 my-3 h-px bg-[var(--divider)]" />
      <button className={navBtn(section === "favorites")} onClick={() => onNavigate("favorites")}>
        <Star className="h-[17px] w-[17px] shrink-0 text-[var(--text-3)]" />
        {t("vault.favorites")}
        <span className="ml-auto text-xs font-medium text-[var(--text-3)]">{counts.favorites}</span>
      </button>

      <div className="px-2 pb-1.5 pt-[18px] text-[11px] font-semibold tracking-[0.3px] text-[var(--text-3)]">
        {t("shell.tools")}
      </div>
      <button className={navBtn(section === "health")} onClick={() => onNavigate("health")}>
        <ShieldAlert className="h-[17px] w-[17px] shrink-0 text-[var(--text-3)]" />
        {t("health.title")}
        {issueCount > 0 && (
          <span className="ml-auto inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-full bg-[var(--neg)] px-1.5 text-[11px] font-bold text-white">
            {issueCount}
          </span>
        )}
      </button>
      <button className={navBtn(section === "generator")} onClick={() => onNavigate("generator")}>
        <Wand2 className="h-[17px] w-[17px] shrink-0 text-[var(--text-3)]" />
        {t("generator.title")}
      </button>

      <div className="mt-auto pt-[18px]">
        <div className="mb-3 flex gap-1 rounded-[9px] border border-[var(--border)] bg-[var(--panel-2)] p-[3px]">
          {(["light", "dark"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setTheme(mode)}
              className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[7px] text-[13px] font-semibold transition-colors ${
                theme === mode ? "bg-[var(--accent)] text-white" : "text-[var(--text-2)]"
              }`}
            >
              {mode === "light" ? <Sun className="h-[15px] w-[15px]" /> : <Moon className="h-[15px] w-[15px]" />}
              {t(mode === "light" ? "shell.light" : "shell.dark")}
            </button>
          ))}
        </div>
        <button className={navBtn(false)} onClick={onLock}>
          <Lock className="h-[17px] w-[17px] shrink-0 text-[var(--text-3)]" />
          {t("vault.lock")}
        </button>
        <button className={navBtn(false)} onClick={onLogout}>
          <LogOut className="h-[17px] w-[17px] shrink-0 text-[var(--text-3)]" />
          {t("vault.signOut")}
        </button>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Mobile bottom tab bar
// ---------------------------------------------------------------------------

function BottomTabs({ section, onNavigate }: Pick<AppShellProps, "section" | "onNavigate">) {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);

  // "금고" is active for any vault section (list categories + favorites).
  const vaultActive = ["all", "login", "card", "note", "identity", "favorites"].includes(section);

  const tab = (active: boolean) =>
    `flex flex-1 flex-col items-center gap-[3px] pt-2 pb-0.5 text-[10px] font-semibold transition-colors ${
      active ? "text-[var(--accent)]" : "text-[var(--text-3)]"
    }`;

  return (
    <nav
      className="flex items-stretch border-t border-[var(--border)] px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      style={{ background: "var(--nav-bg)" }}
    >
      <button className={tab(vaultActive)} onClick={() => onNavigate("all")}>
        <LayoutGrid className="h-[22px] w-[22px]" />
        {t("shell.vault")}
      </button>
      <button className={tab(section === "health")} onClick={() => onNavigate("health")}>
        <ShieldAlert className="h-[22px] w-[22px]" />
        {t("shell.checker")}
      </button>
      <button className={tab(section === "generator")} onClick={() => onNavigate("generator")}>
        <Wand2 className="h-[22px] w-[22px]" />
        {t("shell.generator")}
      </button>
      <button className={tab(false)} onClick={toggle}>
        {theme === "dark" ? <Sun className="h-[22px] w-[22px]" /> : <Moon className="h-[22px] w-[22px]" />}
        {t("shell.theme")}
      </button>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Responsive shell
// ---------------------------------------------------------------------------

export function AppShell(props: AppShellProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-[var(--app-bg)] text-[var(--text)]">
        <Sidebar {...props} />
        <div className="flex min-w-0 flex-1">{props.children}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[var(--screen)] text-[var(--text)]">
      <div className="min-h-0 flex-1">{props.children}</div>
      <BottomTabs section={props.section} onNavigate={props.onNavigate} />
    </div>
  );
}
