"use server";

import { withAuth, requireContractAccess } from "@/lib/auth_utils";
import type { ReactionCounts } from "@/app/actions/gallery-reaction-actions";
import type { GalleryAlbum } from "@/app/actions/gallery-album-actions";
import type { GalleryImage } from "@/types/gallery";

// ============================================================================
// Gallery Data V2 - Single RPC call for all gallery data
// Replaces 3 sequential calls: summaries + metadata + images
// ============================================================================

export interface GalleryCommentSummary {
  author_name: string;
  content: string;
  updated_at: string;
}

export interface GalleryDataV2Result {
  images: GalleryImage[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
  loadedCount: number;
  reactionCounts: ReactionCounts;
  commentCountsPerImage: Record<string, number>;
  totalCommentCount: number;
  albums: (GalleryAlbum & { imageCount: number })[];
}

export async function getGalleryDataV2(
  galleryId: string,
  page = 0,
  pageSize = 200
) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    // Try V3 (V2 + blur fields). Fallback V2 nếu function chưa có trên server.
    // Cả 2 RPC có shape return identical — chỉ khác fields blur_hash + blur_data_url trên image objects.
    let rpcName: "get_gallery_data_v3" | "get_gallery_data_v2" = "get_gallery_data_v3";
    let { data, error } = await supabase.rpc(rpcName, {
      p_gallery_id: galleryId,
      p_limit: pageSize,
      p_offset: page * pageSize,
    });

    // V3 không tồn tại (chưa migrate) → fallback V2
    if (error && /does not exist|function .* does not exist/i.test(error.message)) {
      console.warn("[getGalleryDataV2] V3 unavailable, falling back to V2");
      rpcName = "get_gallery_data_v2";
      const v2 = await supabase.rpc(rpcName, {
        p_gallery_id: galleryId,
        p_limit: pageSize,
        p_offset: page * pageSize,
      });
      data = v2.data;
      error = v2.error;
    }

    if (error) {
      console.warn(`[getGalleryDataV2] ${rpcName} failed, using legacy fallback:`, error.message);
      return null; // Legacy fallback (Promise.all sequential calls trong use-gallery-data.ts)
    }

    if (!data) return null;

    // Parse RPC response (shape identical v2/v3 — blur fields chỉ thêm vào image objects, optional)
    const result = data as {
      images: GalleryImage[];
      totalCount: number;
      hasMore: boolean;
      page: number;
      pageSize: number;
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
      page: result.page || 0,
      pageSize: result.pageSize || pageSize,
      loadedCount: result.loadedCount || 0,
      reactionCounts: result.reactionCounts || {},
      commentCountsPerImage: result.commentCountsPerImage || {},
      totalCommentCount: result.totalCommentCount || 0,
      albums: result.albums || [],
    } as GalleryDataV2Result;
  });
}

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
      supabase.from("gallery_comments").select("image_id, content, author_name, updated_at").eq("gallery_id", galleryId),
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
    const commentsPerImage: Record<string, GalleryCommentSummary[]> = {};
    let totalCommentCount = 0;
    if (commentsData.data) {
      for (const row of commentsData.data) {
        commentCountsPerImage[row.image_id] = (commentCountsPerImage[row.image_id] || 0) + 1;
        commentsPerImage[row.image_id] = commentsPerImage[row.image_id] || [];
        commentsPerImage[row.image_id].push({
          author_name: row.author_name || "Khách",
          content: row.content,
          updated_at: row.updated_at,
        });
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
      commentsPerImage,
      albums: finalAlbums,
    };
  });
}

/**
 * Chỉ lấy NỘI DUNG ghi chú theo ảnh cho cả gallery (admin).
 * V3 RPC đã cấp reaction/comment counts + albums; commentsPerImage là phần DUY NHẤT V3 thiếu.
 * Tách riêng để đường thành công KHÔNG phải gọi getGalleryMetadataAll (4 query) — chỉ 1 query.
 */
export async function getGalleryCommentContentAll(galleryId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);
    const { data, error } = await supabase
      .from("gallery_comments")
      .select("image_id, content, author_name, updated_at")
      .eq("gallery_id", galleryId)
      .order("created_at", { ascending: true });
    if (error) return {} as Record<string, GalleryCommentSummary[]>;
    const map: Record<string, GalleryCommentSummary[]> = {};
    for (const row of data || []) {
      (map[row.image_id] ||= []).push({
        author_name: row.author_name || "Khách",
        content: row.content,
        updated_at: row.updated_at,
      });
    }
    return map;
  });
}
