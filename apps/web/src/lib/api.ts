import { AuthSession, RegisterResponse } from "@basket/contracts";
import {
  accessToken,
  clearSession,
  readToken,
  redirectToLogin,
  refreshTokenValue,
  storeTokens,
} from "./session";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type ApiInit = RequestInit & {
  token?: string;
  organizationId?: string;
  organizationSlug?: string;
};

/** Routes that must never trigger a refresh, or the retry would recurse. */
const NO_REFRESH_PATHS = ["/auth/login", "/auth/refresh", "/auth/logout", "/auth/register"];

/**
 * Shared across concurrent callers: a dashboard page firing five requests at
 * once must rotate the refresh token once, not five times. The server revokes
 * the old token on use, so parallel refreshes would invalidate each other.
 */
let refreshInFlight: Promise<string | null> | null = null;

function buildRequest(path: string, init: ApiInit) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.organizationId) headers.set("x-organization-id", init.organizationId);
  if (init.organizationSlug) headers.set("x-organization-slug", init.organizationSlug);

  return fetch(`${baseUrl}${path}`, { ...init, headers, cache: "no-store" });
}

async function failureMessage(response: Response) {
  const errorBody = await response.text();
  try {
    const parsed = JSON.parse(errorBody) as { message?: string | string[] };
    const message = Array.isArray(parsed.message) ? parsed.message.join(" ") : parsed.message;
    return message || errorBody || "Request failed";
  } catch {
    return errorBody || "Request failed";
  }
}

/** Rotates the token pair once, returning the new access token or null. */
async function refreshSession(): Promise<string | null> {
  const refreshToken = refreshTokenValue();
  if (!refreshToken) return null;

  const response = await fetch(`${baseUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });

  if (!response.ok) return null;

  const session = (await response.json()) as AuthSession;
  storeTokens(session.accessToken, session.refreshToken);
  return session.accessToken;
}

function refreshOnce() {
  refreshInFlight ??= refreshSession()
    .catch(() => null)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

export async function apiFetch<T>(path: string, init: ApiInit = {}): Promise<T> {
  let response = await buildRequest(path, init);

  // An expired access token is the common case after 15 minutes of work:
  // rotate it and replay the request instead of dropping the user at /login.
  if (response.status === 401 && init.token && !NO_REFRESH_PATHS.some((p) => path.startsWith(p))) {
    const renewed = await refreshOnce();

    if (renewed) {
      response = await buildRequest(path, { ...init, token: renewed });
    } else {
      clearSession();
      redirectToLogin();
      throw new Error("Session expired");
    }
  }

  if (!response.ok) throw new Error(await failureMessage(response));
  return response.json() as Promise<T>;
}

export function clientAuth() {
  if (typeof window === "undefined") return {};
  return {
    token: accessToken() ?? undefined,
    organizationId: readToken("organizationId") || undefined,
    organizationSlug: readToken("selectedOrganizationSlug") || undefined,
  };
}

export type ApiPage<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

export function listResource<T>(path: string) {
  return apiFetch<ApiPage<T>>(path, clientAuth());
}

export function listArrayResource<T>(path: string) {
  return apiFetch<T[]>(path, clientAuth());
}

export function createResource<TPayload, TResult>(
  path: string,
  payload: TPayload,
) {
  return apiFetch<TResult>(path, {
    ...clientAuth(),
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateResource<TPayload, TResult>(
  path: string,
  payload: TPayload,
) {
  return apiFetch<TResult>(path, {
    ...clientAuth(),
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateUserPassword(userId: string, password: string) {
  return updateResource<
    { password: string; organizationSlug?: string },
    { success: boolean }
  >(`/auth/users/${userId}/password`, {
    password,
    organizationSlug: readToken("selectedOrganizationSlug") || undefined,
  });
}

export function updateOwnPassword(currentPassword: string, password: string) {
  return updateResource<
    { currentPassword: string; password: string },
    { success: boolean }
  >(
    "/auth/me/password",
    { currentPassword, password },
  );
}

export function deleteResource(path: string) {
  return apiFetch<unknown>(path, {
    ...clientAuth(),
    method: "DELETE",
  });
}

export function login(email: string, password: string) {
  return apiFetch<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export type RegisterPayload = {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  birthDate: string;
  role: "PLAYER" | "DIRECTOR" | "COACH" | "SUPER_ADMIN";
  organizationName?: string;
  organizationSlug?: string;
};

export function register(payload: RegisterPayload) {
  return apiFetch<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyEmail(token: string) {
  return apiFetch<{ success: boolean }>(`/auth/verify-email?token=${encodeURIComponent(token)}`);
}

export function resendVerification(email: string) {
  return apiFetch<{ success: boolean }>("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function requestPasswordReset(email: string) {
  return apiFetch<{ success: boolean }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, password: string) {
  return apiFetch<{ success: boolean }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export function logout(refreshToken: string, token: string) {
  return apiFetch<{ success: boolean }>("/auth/logout", {
    method: "POST",
    token,
    body: JSON.stringify({ refreshToken }),
  });
}
