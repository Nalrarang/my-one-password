import type { LoginItem } from './login';
import type { CardItem } from './card';
import type { NoteItem } from './note';
import type { IdentityItem } from './identity';

export type ItemType = 'login' | 'card' | 'note' | 'identity';

export interface VaultItemMeta {
  id: string;
  itemType: ItemType;
  version: number;
  favorite: boolean;
  deleted: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface EncryptedVaultItem extends VaultItemMeta {
  encryptedData: Uint8Array;
  iv: Uint8Array;
}

/** Union type for all decrypted item types */
export type VaultItemData = LoginItem | CardItem | NoteItem | IdentityItem;

export interface DecryptedVaultItem extends VaultItemMeta {
  data: VaultItemData;
}
