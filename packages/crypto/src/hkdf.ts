import { encodeUtf8 } from "./utils";

const HASH = "SHA-256" as const;
const DERIVED_KEY_LENGTH_BITS = 256;

/**
 * Derives a 256-bit key from {@link masterKey} using HKDF-SHA256.
 *
 * @param masterKey  - Input keying material (e.g. output of Argon2).
 * @param info       - Context string (e.g. "auth", "enc") encoded as UTF-8.
 * @param salt       - Optional salt. When omitted a zero-filled buffer of
 *                     hash-length (32 bytes) is used per the RFC 5869 spec.
 * @returns A 32-byte derived key.
 */
export async function deriveKey(
  masterKey: Uint8Array,
  info: string,
  salt?: Uint8Array,
): Promise<Uint8Array> {
  const hkdfSalt = salt ?? new Uint8Array(32);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    masterKey as unknown as BufferSource,
    { name: "HKDF" },
    false,
    ["deriveBits"],
  );

  const infoBytes = encodeUtf8(info);

  const derived = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: HASH,
      salt: hkdfSalt as unknown as BufferSource,
      info: infoBytes as unknown as BufferSource,
    } as HkdfParams,
    baseKey,
    DERIVED_KEY_LENGTH_BITS,
  );

  return new Uint8Array(derived);
}
