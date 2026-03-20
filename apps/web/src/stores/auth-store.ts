import { create } from "zustand";
import { secureZero } from "@my-one-password/crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthStatus = "unauthenticated" | "locked" | "unlocked";

export interface AuthState {
  status: AuthStatus;
  sessionToken: string | null;
  userId: string | null;
  email: string | null;
  vaultKey: Uint8Array | null;
  salt: Uint8Array | null;

  setSession: (token: string, userId: string, email: string) => void;
  setVaultKey: (key: Uint8Array) => void;
  setSalt: (salt: Uint8Array) => void;
  lock: () => void;
  logout: () => void;
}

// ---------------------------------------------------------------------------
// Session-storage helpers for the session token only.
// The vault key is NEVER persisted.
// ---------------------------------------------------------------------------

const SESSION_TOKEN_KEY = "mop:sessionToken";
const SESSION_USER_ID_KEY = "mop:userId";
const SESSION_EMAIL_KEY = "mop:email";

function persistSession(token: string, userId: string, email: string): void {
  try {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    sessionStorage.setItem(SESSION_USER_ID_KEY, userId);
    sessionStorage.setItem(SESSION_EMAIL_KEY, email);
  } catch {
    // sessionStorage may be unavailable in some contexts — silently ignore.
  }
}

function clearPersistedSession(): void {
  try {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_USER_ID_KEY);
    sessionStorage.removeItem(SESSION_EMAIL_KEY);
  } catch {
    // Ignore.
  }
}

function loadPersistedSession(): {
  sessionToken: string | null;
  userId: string | null;
  email: string | null;
  status: AuthStatus;
} {
  try {
    const sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
    const userId = sessionStorage.getItem(SESSION_USER_ID_KEY);
    const email = sessionStorage.getItem(SESSION_EMAIL_KEY);

    if (sessionToken && userId && email) {
      // We have a session but no vault key (page was refreshed) → locked.
      return { sessionToken, userId, email, status: "locked" };
    }
  } catch {
    // Ignore.
  }
  return { sessionToken: null, userId: null, email: null, status: "unauthenticated" };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const persisted = loadPersistedSession();

export const useAuthStore = create<AuthState>((set, get) => ({
  status: persisted.status,
  sessionToken: persisted.sessionToken,
  userId: persisted.userId,
  email: persisted.email,
  vaultKey: null,
  salt: null,

  setSession(token, userId, email) {
    persistSession(token, userId, email);
    set({ sessionToken: token, userId, email });
  },

  setVaultKey(key) {
    set({ vaultKey: key, status: "unlocked" });
  },

  setSalt(salt) {
    set({ salt });
  },

  lock() {
    const { vaultKey } = get();
    if (vaultKey) {
      secureZero(vaultKey);
    }
    set({ vaultKey: null, status: "locked" });
  },

  logout() {
    const { vaultKey } = get();
    if (vaultKey) {
      secureZero(vaultKey);
    }
    clearPersistedSession();
    set({
      vaultKey: null,
      sessionToken: null,
      userId: null,
      email: null,
      salt: null,
      status: "unauthenticated",
    });
  },
}));
