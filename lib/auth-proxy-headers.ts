export const AUTH_PROXY_SOURCE_HEADER = "x-mood-auth-source";
export const AUTH_PROXY_SOURCE_VALUE = "supabase-claims";
export const AUTH_PROXY_SUB_HEADER = "x-mood-auth-sub";
export const AUTH_PROXY_EMAIL_HEADER = "x-mood-auth-email";
export const AUTH_PROXY_ROLE_HEADER = "x-mood-auth-role";
export const AUTH_PROXY_FULL_NAME_HEADER = "x-mood-auth-full-name";

const AUTH_PROXY_HEADERS = [
  AUTH_PROXY_SOURCE_HEADER,
  AUTH_PROXY_SUB_HEADER,
  AUTH_PROXY_EMAIL_HEADER,
  AUTH_PROXY_ROLE_HEADER,
  AUTH_PROXY_FULL_NAME_HEADER,
];

type HeaderReader = {
  get(name: string): string | null;
};

type HeaderWriter = HeaderReader & {
  set(name: string, value: string): void;
  delete(name: string): void;
};

type ClaimsMetadata = Record<string, unknown>;

type AuthProxyClaimsInput = {
  sub?: unknown;
  email?: unknown;
  app_metadata?: unknown;
  user_metadata?: unknown;
};

export type AuthProxyClaims = {
  id: string;
  email?: string;
  role?: string;
  fullName?: string;
};

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function metadata(value: unknown): ClaimsMetadata {
  return value && typeof value === "object" ? (value as ClaimsMetadata) : {};
}

function headerEncode(value: string) {
  return encodeURIComponent(value);
}

function headerDecode(value: string | null) {
  if (!value) return null;

  try {
    const decoded = decodeURIComponent(value);
    return decoded.trim() || null;
  } catch {
    return null;
  }
}

export function clearAuthProxyHeaders(headers: HeaderWriter) {
  for (const name of AUTH_PROXY_HEADERS) {
    headers.delete(name);
  }
}

export function writeAuthProxyHeaders(
  headers: HeaderWriter,
  claims: AuthProxyClaimsInput,
) {
  clearAuthProxyHeaders(headers);

  const id = stringValue(claims.sub);
  if (!id) return;

  const appMetadata = metadata(claims.app_metadata);
  const userMetadata = metadata(claims.user_metadata);
  const email = stringValue(claims.email);
  const role =
    stringValue(appMetadata.role) ??
    stringValue(userMetadata.role);
  const fullName =
    stringValue(userMetadata.full_name) ??
    stringValue(userMetadata.name);

  headers.set(AUTH_PROXY_SOURCE_HEADER, AUTH_PROXY_SOURCE_VALUE);
  headers.set(AUTH_PROXY_SUB_HEADER, headerEncode(id));
  if (email) headers.set(AUTH_PROXY_EMAIL_HEADER, headerEncode(email));
  if (role) headers.set(AUTH_PROXY_ROLE_HEADER, headerEncode(role));
  if (fullName) headers.set(AUTH_PROXY_FULL_NAME_HEADER, headerEncode(fullName));
}

export function readAuthProxyClaims(headers: HeaderReader): AuthProxyClaims | null {
  if (headers.get(AUTH_PROXY_SOURCE_HEADER) !== AUTH_PROXY_SOURCE_VALUE) {
    return null;
  }

  const id = headerDecode(headers.get(AUTH_PROXY_SUB_HEADER));
  if (!id) return null;

  return {
    id,
    email: headerDecode(headers.get(AUTH_PROXY_EMAIL_HEADER)) ?? undefined,
    role: headerDecode(headers.get(AUTH_PROXY_ROLE_HEADER)) ?? undefined,
    fullName: headerDecode(headers.get(AUTH_PROXY_FULL_NAME_HEADER)) ?? undefined,
  };
}
