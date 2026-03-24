const DEFAULT_BASE_URL = "http://localhost:8787/api";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RegisterRequest {
  email: string;
  salt: string;
  authKey: string;
  encVaultKey: string;
  inviteCode?: string;
}

interface RegisterResponse {
  sessionToken: string;
  userId: string;
}

interface LoginRequest {
  email: string;
  authKey: string;
}

interface LoginResponse {
  sessionToken: string;
  salt: string;
  encVaultKey: string;
  userId: string;
}

interface SaltResponse {
  salt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message: string;
    try {
      const body = (await response.json()) as { error?: string };
      message = body.error ?? response.statusText;
    } catch {
      message = response.statusText;
    }
    throw new ApiError(response.status, message);
  }

  // 204 No Content – nothing to parse
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function authHeaders(sessionToken: string): Record<string, string> {
  return { Authorization: `Bearer ${sessionToken}` };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Retrieve the Argon2 salt for a given email address.
 *
 * The salt is public and required by the client to derive the master key
 * before it can compute the auth key for login.
 */
export async function getSalt(email: string): Promise<SaltResponse> {
  return request<SaltResponse>(
    `/auth/salt?email=${encodeURIComponent(email)}`,
  );
}

/**
 * Register a new account.
 *
 * @param email       - User email address
 * @param salt        - Base64-encoded Argon2 salt
 * @param authKey     - Hex-encoded auth key derived via HKDF(masterKey, "auth")
 * @param encVaultKey - Base64-encoded wrapped vault key
 */
export async function register(
  email: string,
  salt: string,
  authKey: string,
  encVaultKey: string,
  inviteCode?: string,
): Promise<RegisterResponse> {
  return request<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, salt, authKey, encVaultKey, inviteCode } satisfies RegisterRequest),
  });
}

/**
 * Log in to an existing account.
 *
 * @param email   - User email address
 * @param authKey - Hex-encoded auth key
 */
export async function login(
  email: string,
  authKey: string,
): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, authKey } satisfies LoginRequest),
  });
}

/**
 * Log out the current session.
 */
export async function logout(sessionToken: string): Promise<void> {
  return request<void>("/auth/logout", {
    method: "POST",
    headers: authHeaders(sessionToken),
  });
}

// ---------------------------------------------------------------------------
// Vault item types
// ---------------------------------------------------------------------------

export interface VaultItemResponse {
  id: string;
  itemType: string;
  encryptedData: string; // base64
  iv: string; // base64
  version: number;
  favorite: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemRequest {
  itemType: string;
  encryptedData: string; // base64
  iv: string; // base64
  favorite?: boolean;
}

export interface UpdateItemRequest {
  encryptedData: string; // base64
  iv: string; // base64
  version: number;
  favorite?: boolean;
}

// ---------------------------------------------------------------------------
// Vault item API
// ---------------------------------------------------------------------------

/**
 * Fetch all vault items, optionally filtered by type or favorite status.
 */
export async function getVaultItems(
  sessionToken: string,
  params?: { type?: string; favorite?: boolean },
): Promise<VaultItemResponse[]> {
  const query = new URLSearchParams();
  if (params?.type) query.set("type", params.type);
  if (params?.favorite != null) query.set("favorite", String(params.favorite));

  const qs = query.toString();
  const path = `/vault/items${qs ? `?${qs}` : ""}`;

  const res = await request<{ items: VaultItemResponse[] }>(path, {
    headers: authHeaders(sessionToken),
  });
  return res.items;
}

/**
 * Fetch a single vault item by ID.
 */
export async function getVaultItem(
  sessionToken: string,
  id: string,
): Promise<VaultItemResponse> {
  const res = await request<{ item: VaultItemResponse }>(`/vault/items/${id}`, {
    headers: authHeaders(sessionToken),
  });
  return res.item;
}

/**
 * Create a new vault item.
 */
export async function createVaultItem(
  sessionToken: string,
  body: CreateItemRequest,
): Promise<VaultItemResponse> {
  const res = await request<{ item: VaultItemResponse }>("/vault/items", {
    method: "POST",
    headers: authHeaders(sessionToken),
    body: JSON.stringify(body),
  });
  return res.item;
}

/**
 * Update an existing vault item.
 */
export async function updateVaultItem(
  sessionToken: string,
  id: string,
  body: UpdateItemRequest,
): Promise<VaultItemResponse> {
  const res = await request<{ item: VaultItemResponse }>(`/vault/items/${id}`, {
    method: "PUT",
    headers: authHeaders(sessionToken),
    body: JSON.stringify(body),
  });
  return res.item;
}

/**
 * Soft-delete a vault item.
 */
export async function deleteVaultItem(
  sessionToken: string,
  id: string,
): Promise<void> {
  return request<void>(`/vault/items/${id}`, {
    method: "DELETE",
    headers: authHeaders(sessionToken),
  });
}

// ---------------------------------------------------------------------------
// Sync API
// ---------------------------------------------------------------------------

export interface SyncChangesResponse {
  items: VaultItemResponse[];
  syncToken: string;
  hasMore: boolean;
}

export interface SyncPushItem {
  id: string;
  itemType: string;
  encryptedData: string;
  iv: string;
  version: number;
  favorite: boolean;
  deleted: boolean;
}

export interface SyncPushResponse {
  accepted: VaultItemResponse[];
  conflicts: Array<{
    clientItem: { id: string; version: number };
    serverItem: VaultItemResponse;
  }>;
}

/**
 * Pull changes from the server since a given timestamp.
 */
export async function getSyncChanges(
  sessionToken: string,
  since: string,
  deviceId: string,
): Promise<SyncChangesResponse> {
  const query = new URLSearchParams({ since, device_id: deviceId });
  return request<SyncChangesResponse>(`/sync/changes?${query}`, {
    headers: authHeaders(sessionToken),
  });
}

/**
 * Push locally modified items to the server.
 */
export async function pushSyncChanges(
  sessionToken: string,
  items: SyncPushItem[],
  deviceId: string,
): Promise<SyncPushResponse> {
  return request<SyncPushResponse>("/sync/push", {
    method: "POST",
    headers: authHeaders(sessionToken),
    body: JSON.stringify({ items, device_id: deviceId }),
  });
}
