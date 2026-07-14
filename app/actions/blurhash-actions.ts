"use server";

import { z } from "zod";
import { withAdmin, withAuth } from "@/lib/auth_utils";
import {
  backfillGalleryBlurhashesInternal,
  generateGalleryBlurHash,
} from "@/lib/gallery/blurhash";

const uuidSchema = z.string().uuid();

export async function updateImageBlurHash(imageId: string, imageUrl: string) {
  const parsedId = uuidSchema.safeParse(imageId);
  if (!parsedId.success) return { success: false as const, error: "Invalid image ID" };
  return withAuth(async (supabase) => {
    const result = await generateGalleryBlurHash(imageUrl);
    const { error } = await supabase
      .from("gallery_images")
      .update({ blur_hash: result.blurHash, blur_data_url: result.dataUrl })
      .eq("id", parsedId.data);
    if (error) throw new Error(error.message);
    return result;
  });
}

export async function backfillGalleryBlurhashes(galleryId: string) {
  const parsedId = uuidSchema.safeParse(galleryId);
  if (!parsedId.success) return { success: false as const, error: "Invalid gallery ID" };
  const result = await withAdmin((supabase) =>
    backfillGalleryBlurhashesInternal(supabase, parsedId.data),
  );
  if (!result.success) return result;
  return { success: true as const, ...result.data };
}

export async function batchUpdateGalleryBlurHashes(galleryId: string) {
  return backfillGalleryBlurhashes(galleryId);
}
