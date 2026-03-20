import { describe, it, expect } from "vitest";
import { encrypt, decrypt, importKey } from "../src/aes-gcm";

function randomKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

describe("AES-256-GCM", () => {
  it("encrypt then decrypt returns the original plaintext", async () => {
    const key = await importKey(randomKey());
    const plaintext = new TextEncoder().encode("vault secret data");

    const ciphertext = await encrypt(key, plaintext);
    const decrypted = await decrypt(key, ciphertext);

    expect(decrypted).toEqual(plaintext);
  });

  it("decrypt with wrong key throws", async () => {
    const key = await importKey(randomKey());
    const wrongKey = await importKey(randomKey());
    const plaintext = new TextEncoder().encode("sensitive");

    const ciphertext = await encrypt(key, plaintext);

    await expect(decrypt(wrongKey, ciphertext)).rejects.toThrow();
  });

  it("each encryption produces different ciphertext (unique IV)", async () => {
    const key = await importKey(randomKey());
    const plaintext = new TextEncoder().encode("same input every time");

    const c1 = await encrypt(key, plaintext);
    const c2 = await encrypt(key, plaintext);

    // The IVs (first 12 bytes) must differ with overwhelming probability.
    expect(c1).not.toEqual(c2);

    // Both must still decrypt to the original plaintext.
    expect(await decrypt(key, c1)).toEqual(plaintext);
    expect(await decrypt(key, c2)).toEqual(plaintext);
  });

  it("rejects ciphertext that is too short", async () => {
    const key = await importKey(randomKey());
    const tooShort = new Uint8Array(12); // IV only, no ciphertext

    await expect(decrypt(key, tooShort)).rejects.toThrow(RangeError);
  });

  it("importKey rejects keys that are not 32 bytes", async () => {
    await expect(importKey(new Uint8Array(16))).rejects.toThrow(RangeError);
    await expect(importKey(new Uint8Array(64))).rejects.toThrow(RangeError);
  });
});
