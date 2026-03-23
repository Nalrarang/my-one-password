/**
 * 1Password .1pux file parser.
 *
 * The .1pux format is a ZIP archive containing an `export.data` file with
 * JSON-encoded vault items. This module decompresses the archive, parses the
 * JSON, and maps each item to our internal VaultItemData types.
 */

import { unzipSync } from "fflate";
import type {
  VaultItemData,
  LoginItem,
  CardItem,
  NoteItem,
  IdentityItem,
  CustomField,
} from "@my-one-password/shared";
import { parseOTPAuthURI } from "./totp";

// ---------------------------------------------------------------------------
// 1Password export types
// ---------------------------------------------------------------------------

interface OnePExport {
  accounts: Array<{
    attrs: { name: string; email: string };
    vaults: Array<{
      attrs: { name: string };
      items: OnePItem[];
    }>;
  }>;
}

interface OnePItem {
  uuid: string;
  favIndex: number;
  createdAt: number;
  updatedAt: number;
  state: string;
  categoryUuid: string;
  overview: {
    title: string;
    url?: string;
    urls?: Array<{ url: string }>;
    tags?: string[];
  };
  details: {
    loginFields?: Array<{
      designation?: string;
      value?: string;
      name?: string;
      type?: string;
    }>;
    sections?: Array<{
      title?: string;
      name?: string;
      fields?: Array<{
        title?: string;
        id?: string;
        value?: OnePFieldValue;
        n?: string;
      }>;
    }>;
    password?: string;
    notesPlain?: string;
  };
}

interface OnePFieldValue {
  totp?: string;
  string?: string;
  concealed?: string;
  date?: number;
  monthYear?: number;
  phone?: string;
  email?: { email_address: string };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  creditCardNumber?: string;
  creditCardType?: string;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ImportedItem {
  itemType: "login" | "card" | "note" | "identity";
  data: VaultItemData;
  favorite: boolean;
}

export interface ParseResult {
  items: ImportedItem[];
  errors: string[];
}

// ---------------------------------------------------------------------------
// Category mapping
// ---------------------------------------------------------------------------

type ItemType = "login" | "card" | "note" | "identity";

const CATEGORY_MAP: Record<string, ItemType> = {
  "001": "login",
  "002": "card",
  "003": "note",
  "004": "identity",
  "005": "login", // password type → login
};

function categoryToItemType(categoryUuid: string): ItemType {
  return CATEGORY_MAP[categoryUuid] ?? "note";
}

// ---------------------------------------------------------------------------
// Field value helpers
// ---------------------------------------------------------------------------

/** Extract a plain string from a 1Password field value. */
function fieldValueToString(v: OnePFieldValue | undefined): string {
  if (!v) return "";
  return (
    v.string ??
    v.concealed ??
    v.phone ??
    v.email?.email_address ??
    v.creditCardNumber ??
    ""
  );
}

/** Determine custom field type from the value shape. */
function inferFieldType(v: OnePFieldValue | undefined): CustomField["type"] {
  if (!v) return "text";
  if (v.concealed !== undefined) return "concealed";
  if (v.email !== undefined) return "email";
  return "text";
}

/** Collect all fields from all sections into a flat array. */
function flattenSectionFields(
  item: OnePItem,
): Array<{ title: string; n: string; value: OnePFieldValue }> {
  const result: Array<{ title: string; n: string; value: OnePFieldValue }> = [];
  for (const section of item.details.sections ?? []) {
    for (const field of section.fields ?? []) {
      if (field.value) {
        result.push({
          title: field.title ?? "",
          n: field.n ?? "",
          value: field.value,
        });
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Item mappers
// ---------------------------------------------------------------------------

function mapLoginItem(item: OnePItem): LoginItem {
  const loginFields = item.details.loginFields ?? [];

  const usernameField = loginFields.find((f) => f.designation === "username");
  const passwordField = loginFields.find((f) => f.designation === "password");

  const username = usernameField?.value ?? "";
  const password =
    passwordField?.value ?? item.details.password ?? "";

  const urls: string[] = [];
  if (item.overview.url) urls.push(item.overview.url);
  if (item.overview.urls) {
    for (const entry of item.overview.urls) {
      if (entry.url && !urls.includes(entry.url)) {
        urls.push(entry.url);
      }
    }
  }

  let totpSecret: string | undefined;
  let totpAlgorithm: LoginItem["totpAlgorithm"];
  let totpDigits: LoginItem["totpDigits"];
  let totpPeriod: number | undefined;

  const customFields: CustomField[] = [];
  const sectionFields = flattenSectionFields(item);

  for (const field of sectionFields) {
    // TOTP field
    if (field.value.totp) {
      const parsed = parseOTPAuthURI(field.value.totp);
      if (parsed) {
        totpSecret = parsed.secret;
        totpAlgorithm = parsed.algorithm;
        totpDigits = parsed.digits;
        totpPeriod = parsed.period;
      }
      continue;
    }

    // Everything else becomes a custom field
    const strValue = fieldValueToString(field.value);
    if (strValue) {
      customFields.push({
        name: field.title || field.n || "unknown",
        value: strValue,
        type: inferFieldType(field.value),
      });
    }
  }

  return {
    type: "login",
    title: item.overview.title ?? "",
    url: urls[0] ?? "",
    urls,
    username,
    password,
    totpSecret,
    totpAlgorithm,
    totpDigits,
    totpPeriod,
    notes: item.details.notesPlain ?? "",
    customFields,
  };
}

function mapCardItem(item: OnePItem): CardItem {
  const fields = flattenSectionFields(item);

  let cardholderName = "";
  let cardNumber = "";
  let expiryMonth = "";
  let expiryYear = "";
  let cvv = "";
  let pin: string | undefined;

  for (const field of fields) {
    const n = field.n.toLowerCase();
    const titleLower = field.title.toLowerCase();

    if (n === "cardholder" || titleLower.includes("cardholder")) {
      cardholderName = fieldValueToString(field.value);
    } else if (n === "ccnum" || field.value.creditCardNumber) {
      cardNumber =
        field.value.creditCardNumber ?? fieldValueToString(field.value);
    } else if (n === "expiry" && field.value.monthYear !== undefined) {
      // monthYear is encoded as YYYYMM (e.g. 202512)
      const raw = field.value.monthYear;
      const str = String(raw);
      if (str.length >= 6) {
        expiryYear = str.slice(0, 4);
        expiryMonth = str.slice(4, 6);
      } else if (str.length === 4) {
        // Could be MMYY
        expiryMonth = str.slice(0, 2);
        expiryYear = "20" + str.slice(2, 4);
      }
    } else if (n === "cvv") {
      cvv = fieldValueToString(field.value);
    } else if (n === "pin") {
      pin = fieldValueToString(field.value);
    }
  }

  return {
    type: "card",
    title: item.overview.title ?? "",
    cardholderName,
    cardNumber,
    expiryMonth,
    expiryYear,
    cvv,
    pin: pin || undefined,
    notes: item.details.notesPlain ?? "",
  };
}

function mapNoteItem(item: OnePItem): NoteItem {
  return {
    type: "note",
    title: item.overview.title ?? "",
    content: item.details.notesPlain ?? "",
    notes: "",
  };
}

function mapIdentityItem(item: OnePItem): IdentityItem {
  const fields = flattenSectionFields(item);

  let firstName = "";
  let lastName = "";
  let email = "";
  let phone = "";
  const address = {
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  };

  for (const field of fields) {
    const n = field.n.toLowerCase();
    const titleLower = field.title.toLowerCase();

    if (n === "firstname" || titleLower.includes("first name")) {
      firstName = fieldValueToString(field.value);
    } else if (n === "lastname" || titleLower.includes("last name")) {
      lastName = fieldValueToString(field.value);
    } else if (
      n === "email" ||
      titleLower === "email" ||
      field.value.email
    ) {
      email =
        field.value.email?.email_address ?? fieldValueToString(field.value);
    } else if (
      n === "telephone" ||
      n === "phone" ||
      titleLower.includes("phone") ||
      field.value.phone
    ) {
      phone = field.value.phone ?? fieldValueToString(field.value);
    } else if (n === "address" || field.value.address) {
      const addr = field.value.address;
      if (addr) {
        address.street = addr.street ?? "";
        address.city = addr.city ?? "";
        address.state = addr.state ?? "";
        address.postalCode = addr.zip ?? "";
        address.country = addr.country ?? "";
      }
    }
  }

  return {
    type: "identity",
    title: item.overview.title ?? "",
    firstName,
    lastName,
    email,
    phone,
    address,
    notes: item.details.notesPlain ?? "",
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Parse a 1Password .1pux export file.
 *
 * @param fileBuffer - The raw bytes of the .1pux ZIP archive.
 * @returns Parsed items and any errors encountered during mapping.
 */
export function parseOnePux(fileBuffer: ArrayBuffer): ParseResult {
  const items: ImportedItem[] = [];
  const errors: string[] = [];

  // 1. Decompress the ZIP archive.
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(fileBuffer));
  } catch (err) {
    errors.push(
      `Failed to decompress .1pux archive: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { items, errors };
  }

  // 2. Locate export.data.
  const exportDataBytes = files["export.data"];
  if (!exportDataBytes) {
    errors.push(
      'Archive does not contain "export.data". Found entries: ' +
        Object.keys(files).join(", "),
    );
    return { items, errors };
  }

  // 3. Parse JSON.
  let exportData: OnePExport;
  try {
    const jsonText = new TextDecoder().decode(exportDataBytes);
    exportData = JSON.parse(jsonText) as OnePExport;
  } catch (err) {
    errors.push(
      `Failed to parse export.data JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { items, errors };
  }

  // 4. Collect items from all accounts and vaults.
  const rawItems: OnePItem[] = [];
  if (Array.isArray(exportData.accounts)) {
    for (const account of exportData.accounts) {
      for (const vault of account.vaults ?? []) {
        if (Array.isArray(vault.items)) {
          rawItems.push(...vault.items);
        }
      }
    }
  }

  if (rawItems.length === 0) {
    errors.push("No items found in any vault within the .1pux export.");
    return { items, errors };
  }

  // 5. Map each item.
  for (const rawItem of rawItems) {
    try {
      // Skip archived/trashed items.
      if (rawItem.state === "archived" || rawItem.state === "trashed") {
        continue;
      }

      const itemType = categoryToItemType(rawItem.categoryUuid);
      let data: VaultItemData;

      switch (itemType) {
        case "login":
          data = mapLoginItem(rawItem);
          break;
        case "card":
          data = mapCardItem(rawItem);
          break;
        case "note":
          data = mapNoteItem(rawItem);
          break;
        case "identity":
          data = mapIdentityItem(rawItem);
          break;
      }

      items.push({
        itemType,
        data,
        favorite: rawItem.favIndex > 0,
      });
    } catch (err) {
      const title = rawItem.overview?.title ?? rawItem.uuid ?? "unknown";
      errors.push(
        `Failed to map item "${title}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { items, errors };
}
