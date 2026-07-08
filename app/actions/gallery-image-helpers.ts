"use server";

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireContractAccess, withAuth } from "@/lib/auth_utils";
import type { GalleryImage } from "@/types/gallery";

// ═══════════════════════════════════════════
// Gallery Image Server Actions — Pagination
// ═══════════════════════════════════════════

const IMAGE_COLS = "id, image_url, thumbnail_url, sort_order, is_selected, is_starred, client_note, drive_file_id, file_name, file_group, selected_at, starred_at, created_at, width, height, blur_hash, blur_data_url";

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
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) throw new Error(`Lỗi tải ảnh: ${error.message}`);

    const images = (data || []) as GalleryImage[];
    const totalCount = count ?? 0;
    const hasMore = from + images.length < totalCount;

    return { images, totalCount, hasMore, page };
  });
}

// ═══════════════════════════════════════════
// Gallery Fetch Caching cho Download Manager
// ═══════════════════════════════════════════

/**
 * Cached function để lấy TẤT CẢ ảnh của 1 gallery 
 * Caching bằng unstable_cache của Next.js (lưu trên server cache)
 */
async function getCachedGalleryImages(galleryId: string) {
  const fetcher = unstable_cache(
    async (id: string) => {
      const supabase = await createAdminClient();
      const { data, error } = await supabase
        .from("gallery_images")
        .select("id, file_name, drive_file_id, is_selected, selected_at, sort_order")
        .eq("gallery_id", id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      
      if (error) {
        console.error("Lỗi lấy danh sách ảnh từ cache:", error);
        return [];
      }
      return data || [];
    },
    [`gallery-images-download-${galleryId}`],
    {
      tags: [`gallery-images-${galleryId}`],
      revalidate: 7200, // Cache 2 tiếng, sẽ bị xóa (invalidate) khi khách thao tác (tim ảnh)
    }
  );

  return fetcher(galleryId);
}

/** Lấy danh sách id, file_name, drive_file_id của TẤT CẢ ảnh được chọn (Bỏ qua pagination) */
export async function getAllSelectedImagesForAction(galleryId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const allImages = await getCachedGalleryImages(galleryId);
    
    return allImages
      .filter((img) => img.is_selected)
      .sort((a, b) => {
        const timeA = a.selected_at ? new Date(a.selected_at).getTime() : 0;
        const timeB = b.selected_at ? new Date(b.selected_at).getTime() : 0;
        return timeA - timeB;
      })
      .map(img => ({
        id: img.id,
        file_name: img.file_name,
        drive_file_id: img.drive_file_id
      }));
  });
}

/** Lấy danh sách id, file_name, drive_file_id của TẤT CẢ ảnh được khách thả tim */
export async function getAllHeartedImagesForAction(galleryId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const [allImages, reactionsResult] = await Promise.all([
      getCachedGalleryImages(galleryId),
      supabase
        .from("gallery_reactions")
        .select("image_id")
        .eq("gallery_id", galleryId)
        .eq("reaction_type", "heart"),
    ]);

    if (reactionsResult.error) {
      throw new Error(`Lỗi tải danh sách ảnh tim: ${reactionsResult.error.message}`);
    }

    const heartedIds = new Set((reactionsResult.data || []).map((row) => row.image_id));

    return allImages
      .filter((img) => img.is_selected || heartedIds.has(img.id))
      .map((img) => ({
        id: img.id,
        file_name: img.file_name,
        drive_file_id: img.drive_file_id,
      }));
  });
}

/** Lấy danh sách id, file_name, drive_file_id của TẤT CẢ ảnh (Bỏ qua pagination) */
export async function getAllImagesForAction(galleryId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const allImages = await getCachedGalleryImages(galleryId);
    
    return allImages.map(img => ({
      id: img.id,
      file_name: img.file_name,
      drive_file_id: img.drive_file_id
    }));
  });
}
