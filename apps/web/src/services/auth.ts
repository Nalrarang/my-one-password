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
import { clearCache } from "../lib/offline-cache";
import {
  generateSecretKey,
  parseSecretKey,
  storeSecretKey,
  getStoredSecretKey,
  clearSecretKey,
} from "../lib/secret-key";

// ---------------------------------------------------------------------------
// Derived-key helpers (shared between sign-up and sign-in)
// ---------------------------------------------------------------------------

async function deriveAuthAndEncKeys(
  password: string,
  salt: Uint8Array,
  secretKeyHex: string,
): Promise<{ authKeyBytes: Uint8Array; encKeyBytes: Uint8Array; masterKey: Uint8Array }> {
  // Combine password with secret key for defense-in-depth.
  // Even if an attacker knows the master password, they cannot derive the
  // correct master key without the device-local Secret Key.
  const combinedPassword = password + "." + secretKeyHex;
  const masterKey = await deriveKeyFromPassword(combinedPassword, salt);
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
export async function signUp(email: string, password: string, inviteCode?: string): Promise<{ secretKey: string; vaultKey: Uint8Array; sessionToken: string; userId: string; salt: Uint8Array }> {
  const secretKey = generateSecretKey();
  const secretKeyHex = parseSecretKey(secretKey);

  const salt = generateSalt();

  const { authKeyBytes, encKeyBytes, masterKey } = await deriveAuthAndEncKeys(
    password,
    salt,
    secretKeyHex,
  );

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
    inviteCode,
  );

  secureZero(authKeyBytes);

  // Store secret key on this device.
  storeSecretKey(secretKey);

  // Return credentials WITHOUT unlocking — the UI must show the Secret Key
  // dialog first, then call completeSignUp() to unlock.
  return { secretKey, vaultKey, sessionToken, userId, salt };
}

/**
 * Complete sign-up by persisting session and unlocking the vault.
 * Called from the UI after the user has seen and acknowledged the Secret Key.
 */
export function completeSignUp(
  result: { vaultKey: Uint8Array; sessionToken: string; userId: string; salt: Uint8Array },
  email: string,
): void {
  const store = useAuthStore.getState();
  store.setSession(result.sessionToken, result.userId, email);
  store.setSalt(result.salt);
  store.setVaultKey(result.vaultKey);
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
export async function signIn(
  email: string,
  password: string,
  secretKeyInput?: string,
): Promise<void> {
  // Use provided secret key (new device) or the one stored locally.
  const secretKey = secretKeyInput || getStoredSecretKey();
  if (!secretKey) {
    throw new Error("Secret key required. Enter your secret key for this new device.");
  }
  const secretKeyHex = parseSecretKey(secretKey);

  // Step 1 -- get salt.
  const { salt: saltB64 } = await api.getSalt(email);
  const salt = fromBase64(saltB64);

  // Step 2 -- derive keys (password + secret key).
  const { authKeyBytes, encKeyBytes, masterKey } = await deriveAuthAndEncKeys(
    password,
    salt,
    secretKeyHex,
  );
  secureZero(masterKey);

  // Step 3 -- authenticate.
  const { sessionToken, encVaultKey: encVaultKeyB64, userId } = await api.login(
    email,
    toHex(authKeyBytes),
  );
  secureZero(authKeyBytes);

  // Step 4 -- unwrap vault key.
  const encCryptoKey = await importKey(encKeyBytes);
  secureZero(encKeyBytes);

  const wrappedVaultKey = fromBase64(encVaultKeyB64);
  const vaultKey = await unwrapVaultKey(wrappedVaultKey, encCryptoKey);

  // If login succeeded and a key was manually provided, persist it on this device.
  if (secretKeyInput) {
    storeSecretKey(secretKeyInput);
  }

  // Step 5 -- persist session and unlock.
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
 * After a page refresh the in-memory salt is lost, so we fetch it from the
 * server via GET /auth/salt. Then we re-authenticate to obtain the encrypted
 * vault key and unwrap it.
 */
export async function unlock(password: string): Promise<void> {
  const { sessionToken, email } = useAuthStore.getState();
  let { salt } = useAuthStore.getState();

  if (!sessionToken || !email) {
    throw new Error("Cannot unlock: no active session.");
  }

  // The secret key must be present on the device to unlock.
  const secretKey = getStoredSecretKey();
  if (!secretKey) {
    throw new Error("Secret key not found on this device. Please sign in again.");
  }
  const secretKeyHex = parseSecretKey(secretKey);

  // After a page refresh, salt is null — fetch from server.
  if (!salt) {
    const { salt: saltB64 } = await api.getSalt(email);
    salt = fromBase64(saltB64);
    useAuthStore.getState().setSalt(salt);
  }

  // Re-derive keys from password + secret key + salt.
  const { authKeyBytes, encKeyBytes, masterKey } = await deriveAuthAndEncKeys(
    password,
    salt,
    secretKeyHex,
  );
  secureZero(masterKey);

  // Re-authenticate to obtain the encrypted vault key and refresh session.
  const { sessionToken: newToken, encVaultKey: encVaultKeyB64 } = await api.login(
    email,
    toHex(authKeyBytes),
  );
  secureZero(authKeyBytes);

  // Update session token so subsequent API calls use the fresh one.
  const store = useAuthStore.getState();
  store.setSession(newToken, store.userId!, email);

  // Unwrap the vault key using the encryption key.
  const encCryptoKey = await importKey(encKeyBytes);
  secureZero(encKeyBytes);

  const wrappedVaultKey = fromBase64(encVaultKeyB64);
  const vaultKey = await unwrapVaultKey(wrappedVaultKey, encCryptoKey);

  useAuthStore.getState().setVaultKey(vaultKey);
}

/**
 * Log out — invalidates the server session and clears all local state,
 * including the IndexedDB offline cache.
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

  // Clear the offline cache so no encrypted data persists after logout.
  await clearCache().catch(() => {});

  // Clear the device-local secret key on logout.
  clearSecretKey();

  useAuthStore.getState().logout();
}
