const SECRET_KEY_STORAGE = "my1p_secret_key";

/**
 * Generate a 128-bit (16 byte) random Secret Key.
 *
 * The Secret Key is a device-local credential that is combined with the master
 * password during key derivation.  Even if an attacker obtains the user's
 * email and master password, they cannot derive the correct master key without
 * the Secret Key (defense-in-depth, following 1Password's Account Key model).
 */
export function generateSecretKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToSecretKey(bytes);
}

/**
 * Format raw bytes as "XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX" (uppercase hex
 * with dashes for readability).
 */
function bytesToSecretKey(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 16)}-${hex.slice(16, 24)}-${hex.slice(24, 32)}`;
}

/**
 * Parse a formatted secret key back to raw lowercase hex (strip dashes).
 * Throws if the input is not a valid 128-bit hex string.
 */
export function parseSecretKey(formatted: string): string {
  const cleaned = formatted.replace(/-/g, "").trim();
  if (!/^[0-9a-fA-F]{32}$/.test(cleaned)) {
    throw new Error("Invalid secret key format");
  }
  return cleaned.toLowerCase();
}

/** Store the formatted secret key in localStorage. */
export function storeSecretKey(secretKey: string): void {
  localStorage.setItem(SECRET_KEY_STORAGE, secretKey);
}

/** Retrieve the stored secret key (returns null if not on this device). */
export function getStoredSecretKey(): string | null {
  return localStorage.getItem(SECRET_KEY_STORAGE);
}

/** Clear the stored secret key (called on logout). */
export function clearSecretKey(): void {
  localStorage.removeItem(SECRET_KEY_STORAGE);
}

/** Check whether this device has a stored secret key. */
export function hasSecretKey(): boolean {
  return localStorage.getItem(SECRET_KEY_STORAGE) !== null;
}
