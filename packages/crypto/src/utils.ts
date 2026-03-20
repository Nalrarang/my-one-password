const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Best-effort zeroing of a sensitive buffer.
 *
 * Uses {@link Uint8Array.fill} which the engine may optimise away in theory,
 * but in practice is reliable in current V8/SpiderMonkey/JSC runtimes.
 * For absolute guarantees, use libsodium's `sodium_memzero` instead.
 */
export function secureZero(buffer: Uint8Array): void {
  buffer.fill(0);
}

/**
 * Timing-safe comparison of two byte arrays.
 *
 * Returns `false` immediately if lengths differ (length itself is not secret
 * in typical usage). The byte-level comparison always inspects every element
 * so that the execution time depends only on the array length, not the content.
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}

/**
 * Encodes a string as UTF-8 bytes.
 */
export function encodeUtf8(str: string): Uint8Array {
  return encoder.encode(str);
}

/**
 * Decodes UTF-8 bytes to a string.
 */
export function decodeUtf8(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}
