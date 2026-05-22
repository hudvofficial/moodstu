"use server";

import { withAuth, requireContractAccess } from "@/lib/auth_utils";
import type { ReactionCounts } from "@/app/actions/gallery-reaction-actions";
import type { GalleryAlbum } from "@/app/actions/gallery-album-actions";

/**
 * Lấy toàn bộ siêu dữ liệu của một Gallery trong 1 lần gọi duy nhất.
 * Tối ưu hoá Network Waterfall và N+1 Query.
 */
export async function getGalleryMetadataAll(galleryId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const [reactionsData, commentsData, albumsData, albumCountsData] = await Promise.all([
      // 1. Reactions
      supabase.from("gallery_reactions").select("image_id, reaction_type").eq("gallery_id", galleryId),
      // 2. Comments per image
      supabase.from("gallery_comments").select("image_id").eq("gallery_id", galleryId),
      // 3. Albums
      supabase.from("gallery_albums").select("*").eq("gallery_id", galleryId).order("sort_order", { ascending: true }),
      // 4. Album image counts
      supabase.from("gallery_images").select("album_id").eq("gallery_id", galleryId).not("album_id", "is", null)
    ]);

    // Process reactions
    const reactionCounts: ReactionCounts = {};
    if (reactionsData.data) {
      for (const row of reactionsData.data) {
        if (!reactionCounts[row.image_id]) {
          reactionCounts[row.image_id] = { hearts: 0, stars: 0 };
        }
        if (row.reaction_type === "heart") reactionCounts[row.image_id].hearts++;
        if (row.reaction_type === "star") reactionCounts[row.image_id].stars++;
      }
    }

    // Process comments
    const commentCountsPerImage: Record<string, number> = {};
    let totalCommentCount = 0;
    if (commentsData.data) {
      for (const row of commentsData.data) {
        commentCountsPerImage[row.image_id] = (commentCountsPerImage[row.image_id] || 0) + 1;
        totalCommentCount++;
      }
    }

    // Process albums
    const albums = (albumsData.data || []) as GalleryAlbum[];
    const countMap: Record<string, number> = {};
    if (albumCountsData.data) {
      for (const row of albumCountsData.data) {
        if (row.album_id) {
          countMap[row.album_id] = (countMap[row.album_id] || 0) + 1;
        }
      }
    }
    const finalAlbums = albums.map((album) => ({
      ...album,
      imageCount: countMap[album.id] || 0,
    }));

    return {
      reactionCounts,
      totalCommentCount,
      commentCountsPerImage,
      albums: finalAlbums,
    };
  });
}
