import { describe, it, expect, beforeAll } from "vitest";
import sodium from "libsodium-wrappers-sumo";
import { deriveKeyFromPassword, generateSalt } from "../src/argon2";

// generateSalt() calls sodium.randombytes_buf synchronously, so libsodium
// must be fully initialized before any test that uses it.
beforeAll(async () => {
  await sodium.ready;
});

describe("Argon2id deriveKeyFromPassword", () => {
  it("derived key is 32 bytes", async () => {
    const salt = generateSalt();
    const key = await deriveKeyFromPassword("my-password", salt);

    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.length).toBe(32);
  });

  it("same password + salt produces same key (deterministic)", async () => {
    const salt = generateSalt();
    const password = "deterministic-test";

    const key1 = await deriveKeyFromPassword(password, salt);
    const key2 = await deriveKeyFromPassword(password, salt);

    expect(key1).toEqual(key2);
  });

  it("different passwords produce different keys", async () => {
    const salt = generateSalt();

    const key1 = await deriveKeyFromPassword("password-alpha", salt);
    const key2 = await deriveKeyFromPassword("password-beta", salt);

    expect(key1).not.toEqual(key2);
  });

  it("different salts produce different keys", async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const password = "same-password";

    const key1 = await deriveKeyFromPassword(password, salt1);
    const key2 = await deriveKeyFromPassword(password, salt2);

    expect(key1).not.toEqual(key2);
  });
});

describe("Argon2id generateSalt", () => {
  it("returns 16 bytes", () => {
    const salt = generateSalt();

    expect(salt).toBeInstanceOf(Uint8Array);
    expect(salt.length).toBe(16);
  });

  it("returns unique values each call", () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();

    expect(salt1).not.toEqual(salt2);
  });
});

describe("Argon2id salt validation", () => {
  it("rejects salt that is not 16 bytes", async () => {
    const tooShort = new Uint8Array(8);
    const tooLong = new Uint8Array(32);

    await expect(
      deriveKeyFromPassword("password", tooShort),
    ).rejects.toThrow(RangeError);

    await expect(
      deriveKeyFromPassword("password", tooLong),
    ).rejects.toThrow(RangeError);
  });
});
