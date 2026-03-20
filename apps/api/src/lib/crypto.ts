/**
 * Server-side cryptographic utilities.
 *
 * Uses the Web Crypto API available in the Cloudflare Workers runtime.
 * The server never handles plaintext master passwords -- only the derived
 * auth key which is immediately hashed with SHA-256 before storage.
 */

/**
 * Hash an auth key (provided as a hex string) with SHA-256.
 *
 * The auth key is derived client-side via HKDF(masterKey, "auth"). The
 * server hashes it before storage as defense-in-depth so that a database
 * leak does not directly expose the auth key.
 *
 * @param authKeyHex - The auth key as a hex-encoded string
 * @returns The SHA-256 hash as a lowercase hex string
 */
export async function hashAuthKey(authKeyHex: string): Promise<string> {
  const bytes = hexToBytes(authKeyHex);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * Generate a UUID v4 identifier using the runtime's CSPRNG.
 */
export function generateId(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function hexToBytes(hex: string): Uint8Array {
  const len = hex.length;
  if (len % 2 !== 0) {
    throw new Error('Invalid hex string: odd length');
  }
  const bytes = new Uint8Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    const hi = parseInt(hex[i], 16);
    const lo = parseInt(hex[i + 1], 16);
    if (Number.isNaN(hi) || Number.isNaN(lo)) {
      throw new Error(`Invalid hex character at position ${i}`);
    }
    bytes[i / 2] = (hi << 4) | lo;
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  const parts: string[] = [];
  for (const b of bytes) {
    parts.push(b.toString(16).padStart(2, '0'));
  }
  return parts.join('');
}
