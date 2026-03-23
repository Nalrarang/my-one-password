import { encrypt, decrypt, importKey, encodeUtf8, decodeUtf8 } from "@my-one-password/crypto";
import type { DecryptedVaultItem, VaultItemData } from "@my-one-password/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BackupData {
  version: 1;
  exportedAt: string; // ISO 8601
  itemCount: number;
  items: Array<{
    itemType: string;
    data: VaultItemData;
    favorite: boolean;
  }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** ASCII bytes for "MY1P" */
const MAGIC_HEADER = new Uint8Array([0x4d, 0x59, 0x31, 0x50]);
const FORMAT_VERSION = 0x01;
const HEADER_LENGTH = MAGIC_HEADER.length + 1; // 5 bytes total

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * Encrypts all vault items into a downloadable `.my1p` backup blob.
 *
 * Layout: [MAGIC (4B) | VERSION (1B) | AES-GCM encrypted JSON]
 */
export async function exportVault(
  items: DecryptedVaultItem[],
  vaultKey: Uint8Array,
): Promise<Blob> {
  const backupData: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    itemCount: items.length,
    items: items.map((item) => ({
      itemType: item.itemType,
      data: item.data,
      favorite: item.favorite,
    })),
  };

  const jsonBytes = encodeUtf8(JSON.stringify(backupData));
  const cryptoKey = await importKey(vaultKey);
  const encrypted = await encrypt(cryptoKey, jsonBytes);

  // Build final buffer: header + encrypted payload
  const result = new Uint8Array(HEADER_LENGTH + encrypted.length);
  result.set(MAGIC_HEADER, 0);
  result[MAGIC_HEADER.length] = FORMAT_VERSION;
  result.set(encrypted, HEADER_LENGTH);

  return new Blob([result], { type: "application/octet-stream" });
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/**
 * Decrypts a `.my1p` backup file and returns the parsed vault data.
 *
 * Validates the magic header, version byte, and backup structure.
 */
export async function importBackup(
  file: File,
  vaultKey: Uint8Array,
): Promise<BackupData> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Validate minimum size
  if (bytes.length < HEADER_LENGTH) {
    throw new Error("Invalid backup file: too small.");
  }

  // Check magic header "MY1P"
  for (let i = 0; i < MAGIC_HEADER.length; i++) {
    if (bytes[i] !== MAGIC_HEADER[i]) {
      throw new Error("Invalid backup file: missing MY1P header.");
    }
  }

  // Check version byte
  if (bytes[MAGIC_HEADER.length] !== FORMAT_VERSION) {
    throw new Error(
      `Unsupported backup version: ${bytes[MAGIC_HEADER.length]}.`,
    );
  }

  // Decrypt payload
  const encryptedPayload = bytes.slice(HEADER_LENGTH);
  const cryptoKey = await importKey(vaultKey);
  const decryptedBytes = await decrypt(cryptoKey, encryptedPayload);
  const json = decodeUtf8(decryptedBytes);
  const parsed: unknown = JSON.parse(json);

  // Validate structure
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    !("items" in parsed) ||
    !Array.isArray((parsed as BackupData).items)
  ) {
    throw new Error("Invalid backup file: malformed data structure.");
  }

  return parsed as BackupData;
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

/**
 * Triggers a browser download for the given blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  // Clean up after a small delay to ensure the download starts
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 100);
}
