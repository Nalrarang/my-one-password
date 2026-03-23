/**
 * TOTP (RFC 6238) code generation using Web Crypto API.
 *
 * No external dependencies — everything is built on the browser's native
 * HMAC implementation for maximum security and minimal bundle size.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TOTPOptions {
  /** Base32-encoded secret key. */
  secret: string;
  /** Hash algorithm. Default: SHA1 */
  algorithm?: "SHA1" | "SHA256" | "SHA512";
  /** Number of output digits. Default: 6 */
  digits?: 6 | 8;
  /** Time step in seconds. Default: 30 */
  period?: number;
  /** Override current time in milliseconds (for testing). */
  timestamp?: number;
}

// ---------------------------------------------------------------------------
// Base32 decoder (RFC 4648)
// ---------------------------------------------------------------------------

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function decodeBase32(input: string): Uint8Array {
  const sanitized = input.toUpperCase().replace(/[=\s]/g, "");
  const length = sanitized.length;

  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(Math.floor((length * 5) / 8));

  for (let i = 0; i < length; i++) {
    const charIndex = BASE32_ALPHABET.indexOf(sanitized[i]);
    if (charIndex === -1) continue;

    value = (value << 5) | charIndex;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      output[index++] = (value >>> bits) & 0xff;
    }
  }

  return output.slice(0, index);
}

// ---------------------------------------------------------------------------
// TOTP generation
// ---------------------------------------------------------------------------

const ALGORITHM_MAP: Record<string, string> = {
  SHA1: "SHA-1",
  SHA256: "SHA-256",
  SHA512: "SHA-512",
};

/**
 * Generate a TOTP code following RFC 6238 / RFC 4226.
 */
export async function generateTOTP(options: TOTPOptions): Promise<string> {
  const {
    secret,
    algorithm = "SHA1",
    digits = 6,
    period = 30,
    timestamp,
  } = options;

  // 1. Decode the base32 secret.
  const keyBytes = decodeBase32(secret);

  // 2. Calculate the time counter.
  const time = timestamp ?? Date.now();
  const counter = Math.floor(time / 1000 / period);

  // 3. Convert counter to 8-byte big-endian buffer.
  const counterBuffer = new ArrayBuffer(8);
  const counterView = new DataView(counterBuffer);
  counterView.setUint32(0, Math.floor(counter / 0x100000000));
  counterView.setUint32(4, counter & 0xffffffff);

  // 4. HMAC.
  const hashName = ALGORITHM_MAP[algorithm] ?? "SHA-1";
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes as unknown as BufferSource,
    { name: "HMAC", hash: hashName },
    false,
    ["sign"],
  );
  const hmac = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, counterBuffer),
  );

  // 5. Dynamic truncation (RFC 4226 §5.4).
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 10 ** digits;

  return otp.toString().padStart(digits, "0");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Seconds remaining until the next code rotation.
 */
export function getRemainingSeconds(period = 30): number {
  return period - (Math.floor(Date.now() / 1000) % period);
}

/**
 * Parse an `otpauth://totp/...` URI into TOTPOptions.
 *
 * Returns null if the URI is invalid or missing the secret parameter.
 */
export function parseOTPAuthURI(uri: string): TOTPOptions | null {
  try {
    const url = new URL(uri);
    if (url.protocol !== "otpauth:" || url.hostname !== "totp") return null;

    const secret = url.searchParams.get("secret");
    if (!secret) return null;

    const algorithm = url.searchParams.get("algorithm")?.toUpperCase();
    const digits = url.searchParams.get("digits");
    const period = url.searchParams.get("period");

    return {
      secret,
      algorithm:
        algorithm === "SHA256" || algorithm === "SHA512" ? algorithm : "SHA1",
      digits: digits === "8" ? 8 : 6,
      period: period ? parseInt(period, 10) || 30 : 30,
    };
  } catch {
    return null;
  }
}
