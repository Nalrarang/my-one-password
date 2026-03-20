import sodium from "libsodium-wrappers-sumo";

const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

/**
 * Derives a 32-byte key from a user password using Argon2id.
 *
 * Uses libsodium's MODERATE limits, which balance security and latency for
 * interactive logins (~0.7 s on modern hardware):
 *   - OPS_LIMIT_MODERATE  (3 iterations)
 *   - MEMLIMIT_MODERATE   (256 MiB)
 *
 * @param password - The user's master password.
 * @param salt     - A 16-byte salt (use {@link generateSalt} to create one).
 * @returns A 32-byte derived key suitable for use with HKDF or AES-GCM.
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  await sodium.ready;

  if (salt.length !== SALT_LENGTH) {
    throw new RangeError(
      `Salt must be ${SALT_LENGTH} bytes, got ${salt.length}`,
    );
  }

  const key = sodium.crypto_pwhash(
    KEY_LENGTH,
    password,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_MODERATE,
    sodium.crypto_pwhash_MEMLIMIT_MODERATE,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  );

  return key;
}

/**
 * Generates a cryptographically random 16-byte salt for Argon2id.
 *
 * Uses libsodium's internal CSPRNG.
 */
export function generateSalt(): Uint8Array {
  // sodium.randombytes_buf is synchronous and always available after
  // sodium.ready resolves, but callers should ensure readiness.
  return sodium.randombytes_buf(SALT_LENGTH);
}
