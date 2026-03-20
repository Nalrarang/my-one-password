import {
  deriveKeyFromPassword,
  deriveKey,
  generateSalt,
  importKey,
  generateVaultKey,
  wrapVaultKey,
  unwrapVaultKey,
  secureZero,
} from "@my-one-password/crypto";

import * as api from "./api";
import { useAuthStore } from "../stores/auth-store";
import { toBase64, fromBase64, toHex } from "../lib/encoding";

// ---------------------------------------------------------------------------
// Derived-key helpers (shared between sign-up and sign-in)
// ---------------------------------------------------------------------------

async function deriveAuthAndEncKeys(
  password: string,
  salt: Uint8Array,
): Promise<{ authKeyBytes: Uint8Array; encKeyBytes: Uint8Array; masterKey: Uint8Array }> {
  const masterKey = await deriveKeyFromPassword(password, salt);
  const [authKeyBytes, encKeyBytes] = await Promise.all([
    deriveKey(masterKey, "auth"),
    deriveKey(masterKey, "enc"),
  ]);
  return { authKeyBytes, encKeyBytes, masterKey };
}

// ---------------------------------------------------------------------------
// Public auth operations
// ---------------------------------------------------------------------------

/**
 * Register a new account and immediately unlock the vault.
 *
 * Flow:
 *  1. Generate a random salt
 *  2. Derive master key from password + salt (Argon2id)
 *  3. HKDF-expand master key into auth key and encryption key
 *  4. Generate a random vault key
 *  5. Wrap (encrypt) vault key with the encryption key
 *  6. Send registration payload to server
 *  7. Store session and vault key in memory
 */
export async function signUp(email: string, password: string): Promise<void> {
  const salt = generateSalt();

  const { authKeyBytes, encKeyBytes, masterKey } = await deriveAuthAndEncKeys(password, salt);

  // We no longer need the master key after deriving sub-keys.
  secureZero(masterKey);

  const encCryptoKey = await importKey(encKeyBytes);
  const vaultKey = generateVaultKey();
  const wrappedVaultKey = await wrapVaultKey(vaultKey, encCryptoKey);

  // Zero the encryption key bytes now that we have the CryptoKey handle.
  secureZero(encKeyBytes);

  const { sessionToken, userId } = await api.register(
    email,
    toBase64(salt),
    toHex(authKeyBytes),
    toBase64(wrappedVaultKey),
  );

  secureZero(authKeyBytes);

  // Persist session and unlock.
  const store = useAuthStore.getState();
  store.setSession(sessionToken, userId, email);
  store.setSalt(salt);
  store.setVaultKey(vaultKey);
}

/**
 * Log in to an existing account and unlock the vault.
 *
 * Flow:
 *  1. Retrieve the user's salt from the server
 *  2. Derive master key, auth key, and encryption key
 *  3. Authenticate with the server using auth key
 *  4. Unwrap the encrypted vault key returned by the server
 *  5. Store session and vault key in memory
 */
export async function signIn(email: string, password: string): Promise<void> {
  // Step 1 – get salt.
  const { salt: saltB64 } = await api.getSalt(email);
  const salt = fromBase64(saltB64);

  // Step 2 – derive keys.
  const { authKeyBytes, encKeyBytes, masterKey } = await deriveAuthAndEncKeys(password, salt);
  secureZero(masterKey);

  // Step 3 – authenticate.
  const { sessionToken, encVaultKey: encVaultKeyB64, userId } = await api.login(
    email,
    toHex(authKeyBytes),
  );
  secureZero(authKeyBytes);

  // Step 4 – unwrap vault key.
  const encCryptoKey = await importKey(encKeyBytes);
  secureZero(encKeyBytes);

  const wrappedVaultKey = fromBase64(encVaultKeyB64);
  const vaultKey = await unwrapVaultKey(wrappedVaultKey, encCryptoKey);

  // Step 5 – persist session and unlock.
  const store = useAuthStore.getState();
  store.setSession(sessionToken, userId, email);
  store.setSalt(salt);
  store.setVaultKey(vaultKey);
}

/**
 * Lock the vault — clears the vault key from memory but keeps the session
 * alive so the user can unlock again without re-authenticating.
 */
export function lock(): void {
  useAuthStore.getState().lock();
}

/**
 * Unlock the vault by re-deriving keys from the master password.
 *
 * Requires a valid session token and the encrypted vault key from the server.
 * The salt is already stored in the auth store from the last login.
 */
export async function unlock(password: string): Promise<void> {
  const { salt, sessionToken, email } = useAuthStore.getState();

  if (!salt || !sessionToken || !email) {
    throw new Error("Cannot unlock: no active session.");
  }

  // Re-derive keys from password + stored salt.
  const { authKeyBytes, encKeyBytes, masterKey } = await deriveAuthAndEncKeys(password, salt);
  secureZero(masterKey);

  // Re-authenticate to obtain the encrypted vault key.
  const { encVaultKey: encVaultKeyB64 } = await api.login(
    email,
    toHex(authKeyBytes),
  );
  secureZero(authKeyBytes);

  // Unwrap the vault key using the encryption key.
  const encCryptoKey = await importKey(encKeyBytes);
  secureZero(encKeyBytes);

  const wrappedVaultKey = fromBase64(encVaultKeyB64);
  const vaultKey = await unwrapVaultKey(wrappedVaultKey, encCryptoKey);

  useAuthStore.getState().setVaultKey(vaultKey);
}

/**
 * Log out — invalidates the server session and clears all local state.
 */
export async function logOut(): Promise<void> {
  const { sessionToken } = useAuthStore.getState();

  if (sessionToken) {
    try {
      await api.logout(sessionToken);
    } catch {
      // Best-effort — still clear local state even if the server request fails.
    }
  }

  useAuthStore.getState().logout();
}
