import { encrypt, decrypt } from "./aes-gcm";

const VAULT_KEY_LENGTH = 32;

/**
 * Generates a random 256-bit vault key.
 *
 * Uses the platform CSPRNG via {@link crypto.getRandomValues}.
 */
export function generateVaultKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(VAULT_KEY_LENGTH));
}

/**
 * Encrypts (wraps) a vault key with the provided AES-GCM encryption key.
 *
 * The wrapped output includes the IV and authentication tag so it can be
 * stored alongside the user's encrypted vault.
 */
export async function wrapVaultKey(
  vaultKey: Uint8Array,
  encryptionKey: CryptoKey,
): Promise<Uint8Array> {
  return encrypt(encryptionKey, vaultKey);
}

/**
 * Decrypts (unwraps) a previously wrapped vault key.
 *
 * Throws if the encryption key is incorrect or the data has been tampered with.
 */
export async function unwrapVaultKey(
  wrappedKey: Uint8Array,
  encryptionKey: CryptoKey,
): Promise<Uint8Array> {
  return decrypt(encryptionKey, wrappedKey);
}
