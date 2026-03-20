const IV_LENGTH = 12;
const ALGORITHM = "AES-GCM" as const;

/**
 * Encrypts plaintext using AES-256-GCM.
 *
 * Returns a single buffer: [IV (12 bytes) | ciphertext | auth tag (16 bytes)].
 * The IV is generated randomly for each call, so repeated encryptions of the
 * same plaintext produce different outputs.
 */
export async function encrypt(
  key: CryptoKey,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv as unknown as BufferSource },
    key,
    plaintext as unknown as BufferSource,
  );

  // Web Crypto returns ciphertext || tag in a single ArrayBuffer.
  const result = new Uint8Array(IV_LENGTH + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), IV_LENGTH);
  return result;
}

/**
 * Decrypts an AES-256-GCM ciphertext previously produced by {@link encrypt}.
 *
 * Expects the input layout: [IV (12 bytes) | ciphertext | auth tag (16 bytes)].
 * Throws on authentication failure or malformed input.
 */
export async function decrypt(
  key: CryptoKey,
  ciphertext: Uint8Array,
): Promise<Uint8Array> {
  if (ciphertext.length < IV_LENGTH + 1) {
    throw new RangeError(
      `Ciphertext too short: expected at least ${IV_LENGTH + 1} bytes, got ${ciphertext.length}`,
    );
  }

  const iv = ciphertext.slice(0, IV_LENGTH);
  const data = ciphertext.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv as unknown as BufferSource },
    key,
    data as unknown as BufferSource,
  );

  return new Uint8Array(decrypted);
}

/**
 * Imports raw key bytes as an AES-GCM {@link CryptoKey}.
 *
 * The raw key must be exactly 32 bytes (256 bits).
 */
export async function importKey(rawKey: Uint8Array): Promise<CryptoKey> {
  if (rawKey.length !== 32) {
    throw new RangeError(
      `AES-256 key must be 32 bytes, got ${rawKey.length}`,
    );
  }

  return crypto.subtle.importKey(
    "raw",
    rawKey as unknown as BufferSource,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"],
  );
}
