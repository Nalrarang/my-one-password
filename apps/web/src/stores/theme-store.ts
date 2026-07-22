import { create } from "zustand";

export type Theme = "light" | "dark";

const STORAGE_KEY = "mop:theme";

function readInitial(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // ignore
  }
  return "dark";
}

/** Apply the theme to <html data-theme> so the design tokens resolve. */
function apply(theme: Theme): void {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
  }
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const initial = readInitial();
apply(initial);

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initial,
  setTheme(theme) {
    apply(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
    set({ theme });
  },
  toggle() {
    get().setTheme(get().theme === "dark" ? "light" : "dark");
  },
}));
