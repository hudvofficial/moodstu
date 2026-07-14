import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_IMAGE_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;
const ALLOWED_IMAGE_HOSTS = new Set(["lh3.googleusercontent.com"]);

type SharpFactory = (input: Buffer) => {
  metadata: () => Promise<{ width?: number; height?: number }>;
};

export function isPrivateNetworkAddress(address: string) {
  if (!isIP(address)) return true;
  return /^(?:10\.|127\.|169\.254\.|192\.168\.|0\.|::1$|fc|fd|fe80)/i.test(address)
    || /^172\.(?:1[6-9]|2\d|3[01])\./.test(address);
}

export function isAllowedGalleryImageHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return ALLOWED_IMAGE_HOSTS.has(normalized) || normalized.endsWith(".supabase.co");
}

async function assertAllowedImageUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("Gallery image URL must use HTTPS");
  if (url.username || url.password) throw new Error("Gallery image URL must not contain credentials");

  const hostname = url.hostname.toLowerCase();
  if (!isAllowedGalleryImageHost(hostname)) {
    throw new Error("Gallery image host is not allowed");
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => isPrivateNetworkAddress(entry.address))) {
    throw new Error("Gallery image URL resolved to a private address");
  }
  return url;
}

export async function fetchAllowedGalleryImageBuffer(rawUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    let url = await assertAllowedImageUrl(rawUrl);
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      const response = await fetch(url, { redirect: "manual", signal: controller.signal });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location || redirectCount === MAX_REDIRECTS) throw new Error("Invalid gallery image redirect");
        url = await assertAllowedImageUrl(new URL(location, url).toString());
        continue;
      }
      if (!response.ok) throw new Error(`Gallery image returned HTTP ${response.status}`);
      if (!(response.headers.get("content-type") || "").startsWith("image/")) {
        throw new Error("Gallery image URL did not return an image");
      }

      const contentLength = Number(response.headers.get("content-length") || 0);
      if (contentLength > MAX_IMAGE_BYTES) throw new Error("Gallery image metadata response is too large");
      if (!response.body) throw new Error("Gallery image response has no body");

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_IMAGE_BYTES) {
          await reader.cancel();
          throw new Error("Gallery image metadata response is too large");
        }
        chunks.push(value);
      }
      return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
    }
    throw new Error("Gallery image redirect limit exceeded");
  } finally {
    clearTimeout(timeout);
  }
}

async function getDimensionsFromUrl(imageUrl: string) {
  const sharpModule = await import("sharp").catch(() => null);
  if (!sharpModule) return { width: 3000, height: 2000 };

  const url = imageUrl.includes("googleusercontent.com")
    ? `${imageUrl.split("=")[0]}=s800`
    : imageUrl;
  const sharpFactory = ((sharpModule as unknown as { default?: SharpFactory }).default
    || sharpModule) as SharpFactory;
  const metadata = await sharpFactory(await fetchAllowedGalleryImageBuffer(url)).metadata();
  return { width: metadata.width || 3000, height: metadata.height || 2000 };
}

export async function backfillGalleryDimensionsInternal(
  supabase: SupabaseClient,
  galleryId: string,
) {
  const { data: gallery, error: galleryError } = await supabase
    .from("galleries")
    .select("id")
    .eq("id", galleryId)
    .maybeSingle();
  if (galleryError) throw new Error(galleryError.message);
  if (!gallery) throw new Error("Gallery not found or inaccessible");

  const { data: images, error } = await supabase
    .from("gallery_images")
    .select("id, image_url, file_name")
    .eq("gallery_id", galleryId)
    .is("width", null)
    .limit(100);
  if (error) throw new Error(error.message);

  let processed = 0;
  let failed = 0;
  for (const image of images || []) {
    try {
      const dimensions = await getDimensionsFromUrl(image.image_url);
      const { error: updateError } = await supabase
        .from("gallery_images")
        .update(dimensions)
        .eq("id", image.id)
        .eq("gallery_id", galleryId);
      if (updateError) throw updateError;
      processed += 1;
    } catch (error) {
      console.error(`[gallery-dimensions] ${image.file_name}:`, error);
      failed += 1;
    }
  }

  return { processed, failed, total: images?.length || 0 };
}
