import { createHmac, timingSafeEqual } from "node:crypto";

const GALLERY_ACCESS_TTL_MS = 12 * 60 * 60 * 1000;
const GALLERY_ACCESS_SCOPE = "public-gallery";
const DEFAULT_GALLERY_CAPABILITY = "select";

export type GalleryAccessCapability = "select" | "view" | "download";

type GalleryAccessPayload = {
  scope: typeof GALLERY_ACCESS_SCOPE;
  galleryId: string;
  accessUrl: string;
  accessVersion: number;
  capability?: GalleryAccessCapability;
  exp: number;
};

type GalleryAccessInput = {
  galleryId: string;
  accessUrl: string;
  accessVersion: number | null | undefined;
  capability?: GalleryAccessCapability | null;
};

function getGalleryAccessSecret() {
  const secret =
    process.env.GALLERY_ACCESS_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("Missing gallery access signing secret");
  }

  return secret;
}

function normalizeAccessVersion(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeCapability(value: GalleryAccessCapability | string | null | undefined) {
  return value === "view" || value === "download" ? value : DEFAULT_GALLERY_CAPABILITY;
}

function signBody(body: string) {
  return createHmac("sha256", getGalleryAccessSecret())
    .update(body)
    .digest("base64url");
}

export function signGalleryAccessProof(input: GalleryAccessInput) {
  const payload: GalleryAccessPayload = {
    scope: GALLERY_ACCESS_SCOPE,
    galleryId: input.galleryId,
    accessUrl: input.accessUrl,
    accessVersion: normalizeAccessVersion(input.accessVersion),
    capability: normalizeCapability(input.capability),
    exp: Date.now() + GALLERY_ACCESS_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signBody(body);
  return `${body}.${signature}`;
}

export function verifyGalleryAccessProof(
  proof: string | null | undefined,
  expected: GalleryAccessInput,
) {
  if (!proof || typeof proof !== "string") return false;

  const [body, signature] = proof.split(".");
  if (!body || !signature) return false;

  const expectedSignature = signBody(body);
  const signatureBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expectedSignature, "base64url");

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return false;
  }

  let payload: GalleryAccessPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return false;
  }

  return (
    payload.scope === GALLERY_ACCESS_SCOPE &&
    payload.galleryId === expected.galleryId &&
    payload.accessUrl === expected.accessUrl &&
    payload.accessVersion === normalizeAccessVersion(expected.accessVersion) &&
    normalizeCapability(payload.capability) === normalizeCapability(expected.capability) &&
    payload.exp > Date.now()
  );
}

export function getGalleryCapability(gallery: { capability?: string | null }) {
  return (gallery.capability || "select") as "select" | "view" | "download";
}

export function getGalleryAccessVersion(gallery: { access_version?: number | null; share_link_access_version?: number | null }) {
  return (gallery.access_version || 1) + (gallery.share_link_access_version || 0);
}
