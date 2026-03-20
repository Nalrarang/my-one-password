import { describe, it, expect } from "vitest";
import { deriveKey } from "../src/hkdf";

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

describe("HKDF-SHA256 deriveKey", () => {
  it("derived key is 32 bytes", async () => {
    const masterKey = randomBytes(32);
    const derived = await deriveKey(masterKey, "test");

    expect(derived).toBeInstanceOf(Uint8Array);
    expect(derived.length).toBe(32);
  });

  it("same input produces same output (deterministic)", async () => {
    const masterKey = randomBytes(32);
    const salt = randomBytes(32);

    const derived1 = await deriveKey(masterKey, "purpose", salt);
    const derived2 = await deriveKey(masterKey, "purpose", salt);

    expect(derived1).toEqual(derived2);
  });

  it("different info strings produce different keys", async () => {
    const masterKey = randomBytes(32);
    const salt = randomBytes(32);

    const authKey = await deriveKey(masterKey, "auth", salt);
    const encKey = await deriveKey(masterKey, "enc", salt);

    expect(authKey).not.toEqual(encKey);
  });

  it("different master keys produce different derived keys", async () => {
    const masterKey1 = randomBytes(32);
    const masterKey2 = randomBytes(32);
    const salt = randomBytes(32);

    const derived1 = await deriveKey(masterKey1, "same-info", salt);
    const derived2 = await deriveKey(masterKey2, "same-info", salt);

    expect(derived1).not.toEqual(derived2);
  });

  it("providing explicit salt vs default produces different keys", async () => {
    const masterKey = randomBytes(32);
    const explicitSalt = randomBytes(32);
    // Fill with non-zero so it differs from the default zero-filled salt
    explicitSalt.fill(0xab);

    const withExplicitSalt = await deriveKey(masterKey, "info", explicitSalt);
    const withDefaultSalt = await deriveKey(masterKey, "info");

    expect(withExplicitSalt).not.toEqual(withDefaultSalt);
  });

  it("empty info string works without error", async () => {
    const masterKey = randomBytes(32);

    const derived = await deriveKey(masterKey, "");

    expect(derived).toBeInstanceOf(Uint8Array);
    expect(derived.length).toBe(32);
  });
});
