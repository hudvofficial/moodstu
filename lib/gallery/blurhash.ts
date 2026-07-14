import "server-only";

import { decode, encode } from "blurhash";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllowedGalleryImageBuffer } from "@/lib/gallery/image-dimensions";

type SharpFactory = (input: Buffer, options?: unknown) => unknown;

async function getSharp() {
  const sharpModule = await import("sharp");
  return ((sharpModule as unknown as { default?: SharpFactory }).default || sharpModule) as SharpFactory;
}

async function blurHashToDataUrl(blurHash: string, width = 32, height = 32) {
  const sharp = await getSharp();
  const pixels = decode(blurHash, width, height);
  const pipeline = sharp(Buffer.from(pixels), {
    raw: { width, height, channels: 4 },
  }) as { png: () => { toBuffer: () => Promise<Buffer> } };
  const pngBuffer = await pipeline.png().toBuffer();
  return `data:image/png;base64,${pngBuffer.toString("base64")}`;
}

export async function generateGalleryBlurHash(imageUrl: string) {
  const sharp = await getSharp();
  const buffer = await fetchAllowedGalleryImageBuffer(imageUrl);
  const pipeline = sharp(buffer) as {
    resize: (width: number, height: number, options: { fit: string }) => {
      ensureAlpha: () => {
        raw: () => {
          toBuffer: (options: { resolveWithObject: true }) => Promise<{
            data: Buffer;
            info: { width: number; height: number };
          }>;
        };
      };
    };
  };
  const { data, info } = await pipeline
    .resize(32, 32, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const blurHash = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 3);
  return { blurHash, dataUrl: await blurHashToDataUrl(blurHash) };
}

export async function backfillGalleryBlurhashesInternal(
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
    .select("id, image_url, thumbnail_url, file_name")
    .eq("gallery_id", galleryId)
    .is("blur_hash", null)
    .limit(100);
  if (error) throw new Error(error.message);

  let processed = 0;
  let failed = 0;
  for (const image of images || []) {
    try {
      const result = await generateGalleryBlurHash(image.thumbnail_url || image.image_url);
      const { error: updateError } = await supabase
        .from("gallery_images")
        .update({ blur_hash: result.blurHash, blur_data_url: result.dataUrl })
        .eq("id", image.id)
        .eq("gallery_id", galleryId);
      if (updateError) throw updateError;
      processed += 1;
    } catch (error) {
      console.error(`[gallery-blurhash] ${image.file_name}:`, error);
      failed += 1;
    }
  }
  return { processed, failed, total: images?.length || 0 };
}
