"use server";

import { requireContractAccess, withAuth } from "@/lib/auth_utils";
import type { GalleryImage } from "@/types/gallery";

// ═══════════════════════════════════════════
// Gallery Image Server Actions — Pagination
// ═══════════════════════════════════════════

const IMAGE_COLS = "id, image_url, thumbnail_url, sort_order, is_selected, client_note, drive_file_id, file_name, file_group, selected_at, created_at";

/** Server action: paginated images for lazy-load UI */
export async function getGalleryImagesPaginated(
  galleryId: string,
  page: number,
  pageSize = 200,
) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from("gallery_images")
      .select(IMAGE_COLS, { count: "exact" })
      .eq("gallery_id", galleryId)
      .order("sort_order", { ascending: true })
      .range(from, to);

    if (error) throw new Error(`Lỗi tải ảnh: ${error.message}`);

    const images = (data || []) as GalleryImage[];
    const totalCount = count ?? 0;
    const hasMore = from + images.length < totalCount;

    return { images, totalCount, hasMore, page };
  });
}
