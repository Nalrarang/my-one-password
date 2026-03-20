export const CRYPTO_CONFIG = {
  AES_KEY_LENGTH: 256,
  AES_IV_LENGTH: 12,
  AES_TAG_LENGTH: 128,
  ARGON2_SALT_LENGTH: 16,
  ARGON2_KEY_LENGTH: 32,
  HKDF_KEY_LENGTH: 256,
  CLIPBOARD_CLEAR_TIMEOUT: 30_000,
  AUTO_LOCK_TIMEOUT: 15 * 60 * 1000,
  SYNC_TOMBSTONE_TTL: 30 * 24 * 60 * 60 * 1000,
} as const;

export const ITEM_TYPE_LABELS: Record<string, string> = {
  login: 'Login',
  card: 'Credit Card',
  note: 'Secure Note',
  identity: 'Identity',
} as const;
