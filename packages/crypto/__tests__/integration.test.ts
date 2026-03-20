import { describe, it, expect } from "vitest";
import { deriveKeyFromPassword, generateSalt } from "../src/argon2";
import { deriveKey } from "../src/hkdf";
import { importKey, encrypt, decrypt } from "../src/aes-gcm";
import { generateVaultKey, wrapVaultKey, unwrapVaultKey } from "../src/vault-key";
import { constantTimeEqual } from "../src/utils";

describe("Full key derivation chain integration", () => {
  it("complete password manager encryption flow round-trips correctly", async () => {
    // Step 1: User has a master password
    const masterPassword = "correct-horse-battery-staple";

    // Step 2: Generate salt and derive master key via Argon2id
    const salt = generateSalt();
    const masterKey = await deriveKeyFromPassword(masterPassword, salt);
    expect(masterKey.length).toBe(32);

    // Step 3: Derive auth key via HKDF (info="auth")
    const authKey = await deriveKey(masterKey, "auth");
    expect(authKey.length).toBe(32);

    // Step 4: Derive encryption key via HKDF (info="enc")
    const encryptionKeyBytes = await deriveKey(masterKey, "enc");
    expect(encryptionKeyBytes.length).toBe(32);

    // Step 5: Import encryption key as CryptoKey
    const encryptionKey = await importKey(encryptionKeyBytes);
    expect(encryptionKey).toBeInstanceOf(CryptoKey);

    // Step 6: Generate a random vault key
    const vaultKeyBytes = generateVaultKey();
    expect(vaultKeyBytes.length).toBe(32);

    // Step 7: Wrap vault key with encryption key
    const wrappedVaultKey = await wrapVaultKey(vaultKeyBytes, encryptionKey);
    expect(wrappedVaultKey.length).toBeGreaterThan(vaultKeyBytes.length);

    // Step 8: Unwrap vault key with encryption key - verify it matches original
    const unwrappedVaultKey = await unwrapVaultKey(wrappedVaultKey, encryptionKey);
    expect(unwrappedVaultKey).toEqual(vaultKeyBytes);

    // Step 9: Import vault key as CryptoKey
    const vaultCryptoKey = await importKey(unwrappedVaultKey);
    expect(vaultCryptoKey).toBeInstanceOf(CryptoKey);

    // Step 10: Create a sample vault item (JSON object with login data)
    const vaultItem = {
      id: "entry-001",
      title: "GitHub",
      username: "user@example.com",
      password: "s3cret!P@ssw0rd",
      url: "https://github.com/login",
      notes: "Personal account",
    };
    const plaintext = new TextEncoder().encode(JSON.stringify(vaultItem));

    // Step 11: Encrypt the item with vault key
    const ciphertext = await encrypt(vaultCryptoKey, plaintext);
    expect(ciphertext.length).toBeGreaterThan(plaintext.length);

    // Step 12: Decrypt the item with vault key - verify it matches original
    const decrypted = await decrypt(vaultCryptoKey, ciphertext);
    const recovered = JSON.parse(new TextDecoder().decode(decrypted));

    expect(recovered).toEqual(vaultItem);
    expect(recovered.password).toBe("s3cret!P@ssw0rd");
  });

  it("auth key and encryption key are different (key separation)", async () => {
    const salt = generateSalt();
    const masterKey = await deriveKeyFromPassword("my-password", salt);

    const authKey = await deriveKey(masterKey, "auth");
    const encKey = await deriveKey(masterKey, "enc");

    // Keys derived with different info strings must be cryptographically independent
    expect(authKey).not.toEqual(encKey);
    expect(constantTimeEqual(authKey, encKey)).toBe(false);
  });

  it("changing master password produces completely different keys", async () => {
    const salt = generateSalt();

    const masterKey1 = await deriveKeyFromPassword("password-one", salt);
    const masterKey2 = await deriveKeyFromPassword("password-two", salt);

    const authKey1 = await deriveKey(masterKey1, "auth");
    const authKey2 = await deriveKey(masterKey2, "auth");

    const encKey1 = await deriveKey(masterKey1, "enc");
    const encKey2 = await deriveKey(masterKey2, "enc");

    // Different master passwords must produce entirely different derived keys
    expect(masterKey1).not.toEqual(masterKey2);
    expect(authKey1).not.toEqual(authKey2);
    expect(encKey1).not.toEqual(encKey2);
  });

  it("full round-trip preserves data integrity", async () => {
    const password = "integration-test-password";
    const salt = generateSalt();

    // Derive keys
    const masterKey = await deriveKeyFromPassword(password, salt);
    const encKeyBytes = await deriveKey(masterKey, "enc");
    const encKey = await importKey(encKeyBytes);

    // Generate and wrap vault key
    const vaultKeyBytes = generateVaultKey();
    const wrapped = await wrapVaultKey(vaultKeyBytes, encKey);

    // Simulate storing and retrieving: re-derive everything from password + salt
    const masterKey2 = await deriveKeyFromPassword(password, salt);
    const encKeyBytes2 = await deriveKey(masterKey2, "enc");
    const encKey2 = await importKey(encKeyBytes2);

    // Unwrap vault key with re-derived encryption key
    const unwrapped = await unwrapVaultKey(wrapped, encKey2);
    expect(unwrapped).toEqual(vaultKeyBytes);

    // Encrypt with original vault key, decrypt with unwrapped vault key
    const originalVaultCryptoKey = await importKey(vaultKeyBytes);
    const recoveredVaultCryptoKey = await importKey(unwrapped);

    const sensitiveData = new TextEncoder().encode(
      JSON.stringify({ secret: "top-secret-value", pin: "1234" }),
    );

    const encrypted = await encrypt(originalVaultCryptoKey, sensitiveData);
    const decrypted = await decrypt(recoveredVaultCryptoKey, encrypted);

    expect(decrypted).toEqual(sensitiveData);
    expect(JSON.parse(new TextDecoder().decode(decrypted)).secret).toBe(
      "top-secret-value",
    );
  });
});
