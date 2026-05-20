import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ENCRYPTED_PREFIX = "enc:v1:";
const SECRET_FIELDS = new Set(["access_token", "refresh_token", "id_token"]);

function getSecretKey() {
  const secret =
    process.env.SETTINGS_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (process.env.NODE_ENV !== "production"
      ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      : undefined);

  if (!secret) {
    throw new Error("Missing SETTINGS_SECRET_KEY");
  }

  return createHash("sha256").update(secret).digest();
}

function encode(value: Buffer) {
  return value.toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url");
}

export function isEncryptedSecret(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX);
}

export function encryptSecret(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (isEncryptedSecret(normalized)) return normalized;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getSecretKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(normalized, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${encode(iv)}.${encode(tag)}.${encode(ciphertext)}`;
}

export function decryptSecret(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (!isEncryptedSecret(normalized)) return normalized;

  const payload = normalized.slice(ENCRYPTED_PREFIX.length);
  const [ivRaw, tagRaw, ciphertextRaw] = payload.split(".");
  if (!ivRaw || !tagRaw || !ciphertextRaw) return null;

  try {
    const decipher = createDecipheriv("aes-256-gcm", getSecretKey(), decode(ivRaw));
    decipher.setAuthTag(decode(tagRaw));
    return Buffer.concat([
      decipher.update(decode(ciphertextRaw)),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

export function safeCompareSecret(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function encryptGoogleOAuth<T extends Record<string, unknown>>(
  authData: T,
): T {
  const encrypted: Record<string, unknown> = { ...authData };

  for (const field of SECRET_FIELDS) {
    const value = encrypted[field];
    if (typeof value === "string" && value.trim()) {
      encrypted[field] = encryptSecret(value);
    }
  }

  return encrypted as T;
}

export function decryptGoogleOAuth(
  authData: unknown,
): Record<string, unknown> | null {
  if (!authData || typeof authData !== "object" || Array.isArray(authData)) {
    return null;
  }

  const decrypted = { ...(authData as Record<string, unknown>) };

  for (const field of SECRET_FIELDS) {
    const value = decrypted[field];
    if (typeof value === "string" && value.trim()) {
      decrypted[field] = decryptSecret(value);
    }
  }

  return decrypted;
}

export function redactGoogleOAuth(authData: unknown) {
  const auth =
    authData && typeof authData === "object" && !Array.isArray(authData)
      ? (authData as Record<string, unknown>)
      : null;

  return {
    connected: Boolean(auth),
    updated_at:
      typeof auth?.updated_at === "string" ? auth.updated_at : undefined,
    has_access_token: typeof auth?.access_token === "string" && !!auth.access_token,
    has_refresh_token:
      typeof auth?.refresh_token === "string" && !!auth.refresh_token,
  };
}

// ─── Deprecated aliases (remove after full migration) ───
/** @deprecated Use encryptGoogleOAuth */
export const encryptGoogleCalendarAuth = encryptGoogleOAuth;
/** @deprecated Use decryptGoogleOAuth */
export const decryptGoogleCalendarAuth = decryptGoogleOAuth;
/** @deprecated Use redactGoogleOAuth */
export const redactGoogleCalendarAuth = redactGoogleOAuth;
