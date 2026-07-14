"use server";

import { z } from "zod";
import { withAdmin } from "@/lib/auth_utils";
import { backfillGalleryDimensionsInternal } from "@/lib/gallery/image-dimensions";

const galleryIdSchema = z.string().uuid();

export async function backfillGalleryDimensions(galleryId: string) {
  const parsed = galleryIdSchema.safeParse(galleryId);
  if (!parsed.success) return { success: false as const, error: "Invalid gallery ID" };

  const result = await withAdmin(async (supabase) =>
    backfillGalleryDimensionsInternal(supabase, parsed.data),
  );
  if (!result.success) return result;
  return { success: true as const, ...result.data };
}

export async function backfillAllDimensions() {
  const result = await withAdmin(async (supabase) => {
    const { data: galleries, error } = await supabase
      .from("galleries")
      .select("id, title")
      .limit(10);
    if (error) throw new Error(error.message);

    const output = [];
    for (const gallery of galleries || []) {
      output.push({
        galleryId: gallery.id,
        title: gallery.title,
        ...await backfillGalleryDimensionsInternal(supabase, gallery.id),
      });
    }
    return output;
  });
  if (!result.success) return result;
  return { success: true as const, galleries: result.data };
}
