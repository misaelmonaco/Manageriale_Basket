import { AuthSession } from "@basket/contracts";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string; organizationId?: string; organizationSlug?: string } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.organizationId)
    headers.set("x-organization-id", init.organizationId);
  if (init.organizationSlug)
    headers.set("x-organization-slug", init.organizationSlug);

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    const errorBody = await response.text();
    let parsedMessage: string | undefined;
    try {
      const parsed = JSON.parse(errorBody) as { message?: string | string[] };
      parsedMessage = Array.isArray(parsed.message)
        ? parsed.message.join(" ")
        : parsed.message;
    } catch {
      parsedMessage = undefined;
    }
    throw new Error(parsedMessage || errorBody || "Request failed");
  }
  return response.json() as Promise<T>;
}

export function clientAuth() {
  if (typeof window === "undefined") return {};
  return {
    token: localStorage.getItem("accessToken") ?? undefined,
    organizationId: localStorage.getItem("organizationId") || undefined,
    organizationSlug: localStorage.getItem("selectedOrganizationSlug") || undefined,
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

export function createResource<TPayload, TResult>(path: string, payload: TPayload) {
  return apiFetch<TResult>(path, {
    ...clientAuth(),
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateResource<TPayload, TResult>(path: string, payload: TPayload) {
  return apiFetch<TResult>(path, {
    ...clientAuth(),
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateUserPassword(userId: string, password: string) {
  return updateResource<{ password: string; organizationSlug?: string }, { success: boolean }>(
    `/auth/users/${userId}/password`,
    {
      password,
      organizationSlug:
        typeof window === "undefined"
          ? undefined
          : localStorage.getItem("selectedOrganizationSlug") || undefined,
    },
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
  return apiFetch<AuthSession>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout(refreshToken: string, token: string) {
  return apiFetch<{ success: boolean }>("/auth/logout", {
    method: "POST",
    token,
    body: JSON.stringify({ refreshToken }),
  });
}
