import { describe, it, expect } from "vitest";
import { generateVaultKey, wrapVaultKey, unwrapVaultKey } from "../src/vault-key";
import { importKey } from "../src/aes-gcm";

function randomEncryptionKey(): Promise<CryptoKey> {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  return importKey(raw);
}

describe("generateVaultKey", () => {
  it("returns 32 bytes", () => {
    const key = generateVaultKey();

    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.length).toBe(32);
  });

  it("returns unique values each call", () => {
    const key1 = generateVaultKey();
    const key2 = generateVaultKey();

    expect(key1).not.toEqual(key2);
  });
});

describe("wrapVaultKey / unwrapVaultKey", () => {
  it("wrap then unwrap returns original vault key", async () => {
    const encryptionKey = await randomEncryptionKey();
    const vaultKey = generateVaultKey();

    const wrapped = await wrapVaultKey(vaultKey, encryptionKey);
    const unwrapped = await unwrapVaultKey(wrapped, encryptionKey);

    expect(unwrapped).toEqual(vaultKey);
  });

  it("unwrap with wrong key throws", async () => {
    const correctKey = await randomEncryptionKey();
    const wrongKey = await randomEncryptionKey();
    const vaultKey = generateVaultKey();

    const wrapped = await wrapVaultKey(vaultKey, correctKey);

    await expect(unwrapVaultKey(wrapped, wrongKey)).rejects.toThrow();
  });

  it("wrapped key is different from original (it is encrypted)", async () => {
    const encryptionKey = await randomEncryptionKey();
    const vaultKey = generateVaultKey();

    const wrapped = await wrapVaultKey(vaultKey, encryptionKey);

    // Wrapped output includes IV (12 bytes) + ciphertext + auth tag (16 bytes),
    // so it will be longer and have completely different content.
    expect(wrapped.length).toBeGreaterThan(vaultKey.length);
    expect(wrapped).not.toEqual(vaultKey);
  });
});
