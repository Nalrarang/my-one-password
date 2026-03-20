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
): Promise<RegisterResponse> {
  return request<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, salt, authKey, encVaultKey } satisfies RegisterRequest),
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
