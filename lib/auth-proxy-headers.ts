export const AUTH_PROXY_SOURCE_HEADER = "x-mood-auth-source";
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
  readonly get: (name: string) => string | null;
};

type HeaderWriter = HeaderReader & {
  set(name: string, value: string): void;
  delete(name: string): void;
};

export function clearAuthProxyHeaders(headers: HeaderWriter) {
  for (const name of AUTH_PROXY_HEADERS) {
    headers.delete(name);
  }
}
