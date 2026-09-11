import { AuthSession } from "@basket/contracts";

const ACCESS_TOKEN = "accessToken";
const REFRESH_TOKEN = "refreshToken";

/** Everything the app keeps about the signed-in user, cleared as one unit. */
const SESSION_KEYS = [
  ACCESS_TOKEN,
  REFRESH_TOKEN,
  "role",
  "organizationId",
  "selectedOrganizationId",
  "selectedOrganizationSlug",
  "selectedOrganizationName",
  "firstName",
  "lastName",
  "email",
];

function storage() {
  // Every accessor is guarded: these run during SSR too, and a browser with
  // site data blocked throws instead of returning null.
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readToken(key: string) {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function accessToken() {
  return readToken(ACCESS_TOKEN);
}

export function refreshTokenValue() {
  return readToken(REFRESH_TOKEN);
}

export function storeSession(session: AuthSession) {
  const store = storage();
  if (!store) return;

  try {
    store.setItem(ACCESS_TOKEN, session.accessToken);
    store.setItem(REFRESH_TOKEN, session.refreshToken);
    store.setItem("role", session.user.role);
    store.setItem("organizationId", session.user.organizationId ?? "");
    store.removeItem("selectedOrganizationId");
    store.removeItem("selectedOrganizationSlug");
    store.removeItem("selectedOrganizationName");
    store.setItem("firstName", session.user.firstName);
    store.setItem("lastName", session.user.lastName);
    store.setItem("email", session.user.email);
  } catch {
    // A full or blocked storage must not break the sign-in itself.
  }
}

/** Replaces only the token pair, keeping the rest of the session intact. */
export function storeTokens(accessTokenValue: string, refreshToken: string) {
  const store = storage();
  if (!store) return;

  try {
    store.setItem(ACCESS_TOKEN, accessTokenValue);
    store.setItem(REFRESH_TOKEN, refreshToken);
  } catch {
    // Ignored: the in-flight request still carries the fresh token.
  }
}

export function clearSession() {
  const store = storage();
  if (!store) return;

  try {
    for (const key of SESSION_KEYS) store.removeItem(key);
  } catch {
    // Nothing else to do: the tokens are rejected by the API anyway.
  }
}

/**
 * Sends the user back to the login page after a session has definitively
 * expired. Uses a full navigation so every cached client state is dropped.
 */
export function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/login")) return;
  window.location.assign("/login");
}
