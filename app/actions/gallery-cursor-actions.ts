"use server";

import { withAuth, requireContractAccess } from "@/lib/auth_utils";
import type { ReactionCounts } from "@/app/actions/gallery-reaction-actions";
import type { GalleryAlbum } from "@/app/actions/gallery-album-actions";
import type { GalleryImage } from "@/types/gallery";

// ============================================================================
// Gallery Cursor-Based Pagination API (Phase 3 - Future-proof)
// Prevents data shift when images are uploaded during browsing
// ============================================================================

export interface GalleryDataCursorResult {
  images: (GalleryImage & { cursor_id: string })[];
  totalCount: number;
  hasMore: boolean;
  cursor: string | null; // Last cursor for next page
  loadedCount: number;
  reactionCounts: ReactionCounts;
  commentCountsPerImage: Record<string, number>;
  totalCommentCount: number;
  albums: (GalleryAlbum & { imageCount: number })[];
}

/**
 * Cursor-based gallery data fetch
 *
 * Benefits over offset-based:
 * - No data shift when new images are uploaded
 * - Consistent pagination even during real-time updates
 * - Efficient for large galleries (no COUNT(*) on every page)
 *
 * Usage:
 * ```ts
 * // Initial load
 * const page1 = await getGalleryDataCursor(galleryId);
 *
 * // Next page
 * const page2 = await getGalleryDataCursor(galleryId, page1.data.cursor);
 * ```
 */
export async function getGalleryDataCursor(
  galleryId: string,
  afterCursor: string | null = null,
  limit = 200
) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { data, error } = await supabase.rpc("get_gallery_data_cursor", {
      p_gallery_id: galleryId,
      p_after_cursor: afterCursor,
      p_limit: limit,
    });

    if (error) {
      console.warn("[getGalleryDataCursor] RPC failed:", error.message);
      throw new Error(`Failed to load gallery: ${error.message}`);
    }

    if (!data) {
      throw new Error("No data returned from gallery cursor RPC");
    }

    // Parse RPC response
    const result = data as {
      images: (GalleryImage & { cursor_id: string })[];
      totalCount: number;
      hasMore: boolean;
      cursor: string | null;
      loadedCount: number;
      reactionCounts: Record<string, { hearts: number; stars: number }>;
      commentCountsPerImage: Record<string, number>;
      totalCommentCount: number;
      albums: (GalleryAlbum & { imageCount: number })[];
    };

    return {
      images: result.images || [],
      totalCount: result.totalCount || 0,
      hasMore: result.hasMore || false,
      cursor: result.cursor || null,
      loadedCount: result.loadedCount || 0,
      reactionCounts: result.reactionCounts || {},
      commentCountsPerImage: result.commentCountsPerImage || {},
      totalCommentCount: result.totalCommentCount || 0,
      albums: result.albums || [],
    } as GalleryDataCursorResult;
  });
}
