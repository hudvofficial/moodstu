"use server";

import { withAuth, requireContractAccess } from "@/lib/auth_utils";
import { createAdminClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/types/gallery";
import type { GalleryCommentSummary } from "./gallery-composite-actions";
import { requirePublicGalleryAccess, requirePublicGalleryImageAccess } from "./gallery-core";

// ═══════════════════════════════════════════
// Gallery Reaction & Comment Server Actions
// Phase 2: Like/Comment System
// ═══════════════════════════════════════════

// ─── Types ─────────────────────────────────

export type ReactionType = "heart" | "star";

export interface ReactionCounts {
  [imageId: string]: { hearts: number; stars: number };
}

export interface GalleryComment {
  id: string;
  image_id: string;
  gallery_id: string;
  content: string;
  author_name: string | null;
  is_mine: boolean;
  created_at: string;
  updated_at: string;
}

// ─── REACTION ACTIONS ──────────────────────

/** Toggle reaction (heart/star) on an image — used by both admin and public */
export async function toggleReaction(
  imageId: string,
  galleryId: string,
  reactionType: ReactionType,
  clientIdentifier: string,
  accessUrl?: string,
  accessToken?: string,
) {
  try {
    if (!imageId || !isValidUUID(imageId) || !galleryId || !isValidUUID(galleryId)) {
      return { success: false, action: "error" as const, error: "Invalid image or gallery id" };
    }

    if (!accessUrl?.trim() || !accessToken?.trim()) {
      return { success: false, action: "error" as const, error: "Gallery access proof required" };
    }

    const supabase = await createAdminClient();

    // Tim = hành động xã giao, KHÔNG cần mật khẩu (nghiệp vụ chốt 15/07):
    // chấp nhận VIEW-token (album có pass) LẪN token đầy đủ (album không pass).
    let access;
    try {
      access = await requirePublicGalleryImageAccess(supabase, accessUrl.trim(), accessToken.trim(), imageId, "view");
    } catch {
      access = await requirePublicGalleryImageAccess(supabase, accessUrl.trim(), accessToken.trim(), imageId);
    }
    const { gallery } = access;

    if (gallery.id !== galleryId) {
      return { success: false, action: "error" as const, error: "Image does not belong to gallery" };
    }

    // Check if reaction exists
    const { data: existing } = await supabase
      .from("gallery_reactions")
      .select("id")
      .eq("image_id", imageId)
      .eq("client_identifier", clientIdentifier)
      .eq("reaction_type", reactionType)
      .maybeSingle();

    if (existing) {
      // Remove reaction
      await supabase
        .from("gallery_reactions")
        .delete()
        .eq("id", existing.id);
      return { success: true, action: "removed" as const };
    } else {
      // Add reaction
      await supabase
        .from("gallery_reactions")
        .insert({
          image_id: imageId,
          gallery_id: galleryId,
          reaction_type: reactionType,
          client_identifier: clientIdentifier,
        });
      return { success: true, action: "added" as const };
    }
  } catch (error) {
    console.error("toggleReaction error:", error);
    return { success: false, action: "error" as const, error: "Unable to update reaction" };
  }
}

/** Get aggregated reaction counts per image for a gallery */
export async function getReactionCounts(galleryId: string): Promise<ReactionCounts> {
  try {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("gallery_reactions")
      .select("image_id, reaction_type")
      .eq("gallery_id", galleryId);

    if (error || !data) return {};

    const counts: ReactionCounts = {};
    for (const row of data) {
      if (!counts[row.image_id]) {
        counts[row.image_id] = { hearts: 0, stars: 0 };
      }
      if (row.reaction_type === "heart") counts[row.image_id].hearts++;
      if (row.reaction_type === "star") counts[row.image_id].stars++;
    }
    return counts;
  } catch (error) {
    console.error("getReactionCounts error:", error);
    return {};
  }
}

/** Check which images the current client has reacted to */
export async function getClientReactions(galleryId: string, clientIdentifier: string) {
  try {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("gallery_reactions")
      .select("image_id, reaction_type")
      .eq("gallery_id", galleryId)
      .eq("client_identifier", clientIdentifier);

    if (error || !data) return {};

    const reactions: { [imageId: string]: { heart: boolean; star: boolean } } = {};
    for (const row of data) {
      if (!reactions[row.image_id]) reactions[row.image_id] = { heart: false, star: false };
      if (row.reaction_type === "heart") reactions[row.image_id].heart = true;
      if (row.reaction_type === "star") reactions[row.image_id].star = true;
    }
    return reactions;
  } catch (error) {
    console.error("getClientReactions error:", error);
    return {};
  }
}

// ─── COMMENT ACTIONS ───────────────────────

/** Ghi chú theo ảnh cho CẢ gallery — cấp dữ liệu cho chip + preview trên grid trang khách. */
export async function getGalleryComments(
  galleryId: string,
  accessUrl: string,
  accessToken: string,
): Promise<Record<string, GalleryCommentSummary[]>> {
  try {
    if (!accessUrl?.trim() || !accessToken?.trim()) return {};
    const supabase = await createAdminClient();
    // "view": ĐÚNG mức bảo mật hiện tại — hôm nay client_note vốn đã nằm trong payload ảnh
    // (IMAGE_COLS) gửi cho MỌI người có link; UI mới là chỗ giấu nội dung với người không pass.
    // KHÔNG siết thêm ngoài phạm vi task.
    await requirePublicGalleryAccess(supabase, accessUrl.trim(), accessToken.trim(), galleryId, "view");
    const { data, error } = await supabase
      .from("gallery_comments")
      .select("image_id, content, author_name, updated_at")
      .eq("gallery_id", galleryId)
      .order("created_at", { ascending: true });
    if (error) return {};
    const map: Record<string, GalleryCommentSummary[]> = {};
    for (const row of data || []) {
      (map[row.image_id] ||= []).push({
        author_name: row.author_name || "Khách",
        content: row.content,
        updated_at: row.updated_at,
      });
    }
    return map;
  } catch (error) {
    console.error("getGalleryComments error:", error);
    return {};
  }
}

/** Get comments for an image. is_mine tính ở server — KHÔNG trả client_identifier ra ngoài. */
export async function getComments(imageId: string, accessUrl?: string, accessToken?: string, clientIdentifier?: string): Promise<GalleryComment[]> {
  const toComment = (row: { id: string; image_id: string; gallery_id: string; content: string; author_name: string | null; client_identifier: string; created_at: string; updated_at: string }): GalleryComment => ({
    id: row.id,
    image_id: row.image_id,
    gallery_id: row.gallery_id,
    content: row.content,
    author_name: row.author_name,
    is_mine: !!clientIdentifier && row.client_identifier === clientIdentifier,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
  try {
    if (accessUrl?.trim() && accessToken?.trim()) {
      const supabase = await createAdminClient();
      await requirePublicGalleryImageAccess(supabase, accessUrl.trim(), accessToken.trim(), imageId, "view");
      const { data, error } = await supabase.from("gallery_comments").select("id, image_id, gallery_id, content, author_name, client_identifier, created_at, updated_at").eq("image_id", imageId).order("created_at", { ascending: true });
      if (error) return [];
      return (data || []).map(toComment);
    }
    const result = await withAuth(async (supabase, userId) => {
      await requireContractAccess(supabase, userId);
      const { data, error } = await supabase.from("gallery_comments").select("id, image_id, gallery_id, content, author_name, client_identifier, created_at, updated_at").eq("image_id", imageId).order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map(toComment);
    });
    return result.success ? result.data : [];
  } catch (error) {
    console.error("getComments error:", error);
    return [];
  }
}

/** Upsert a client note for an image */
export async function upsertComment(imageId: string, galleryId: string, content: string, authorName: string, clientIdentifier: string, accessUrl: string, accessToken: string) {
  try {
    if (!accessUrl?.trim() || !accessToken?.trim()) return { success: false as const, error: "Thiếu quyền truy cập." };
    if (!clientIdentifier?.trim()) return { success: false as const, error: "Thiếu định danh client." };
    const trimmed = (content || "").trim();
    if (trimmed.length > 500) return { success: false as const, error: "Ghi chú tối đa 500 ký tự." };
    const supabase = await createAdminClient();
    // Ghi chú = chỉ dẫn hậu kỳ/in ấn → CÙNG gate với chọn ảnh (mật khẩu Mood cấp).
    // Giữ đúng hành vi updateClientNote cũ; KHÔNG được nới xuống "view".
    await requirePublicGalleryImageAccess(supabase, accessUrl.trim(), accessToken.trim(), imageId, "select");
    // Xoá trắng ô = xoá ghi chú của chính mình.
    if (!trimmed) {
      await supabase.from("gallery_comments").delete().eq("image_id", imageId).eq("client_identifier", clientIdentifier);
      return { success: true as const, data: null };
    }
    const author = (authorName || "").trim().slice(0, 50) || "Khách";
    const { data, error } = await supabase.from("gallery_comments").upsert({ image_id: imageId, gallery_id: galleryId, content: trimmed, author_name: author, client_identifier: clientIdentifier, updated_at: new Date().toISOString() }, { onConflict: "image_id,client_identifier" }).select().single();
    if (error) return { success: false as const, error: error.message };
    return { success: true as const, data };
  } catch (error) {
    console.error("upsertComment error:", error);
    return { success: false as const, error: error instanceof Error ? error.message : "Không thể lưu ghi chú" };
  }
}

/** Delete a comment (only the creator can delete) */
export async function deleteComment(commentId: string, clientIdentifier: string, accessUrl: string, accessToken: string) {
  try {
    if (!accessUrl?.trim() || !accessToken?.trim()) return { success: false as const, error: "Thiếu quyền truy cập." };
    const supabase = await createAdminClient();
    const { data: comment, error } = await supabase.from("gallery_comments").select("image_id, client_identifier").eq("id", commentId).single();
    if (error || !comment) return { success: false as const, error: "Không tìm thấy ghi chú." };
    await requirePublicGalleryImageAccess(supabase, accessUrl.trim(), accessToken.trim(), comment.image_id, "select");
    if (comment.client_identifier !== clientIdentifier) return { success: false as const, error: "Không có quyền xóa comment này" };
    const { error: deleteError } = await supabase.from("gallery_comments").delete().eq("id", commentId).eq("client_identifier", clientIdentifier);
    if (deleteError) return { success: false as const, error: deleteError.message };
    return { success: true as const };
  } catch (error) {
    console.error("deleteComment error:", error);
    return { success: false as const, error: error instanceof Error ? error.message : "Không thể xóa comment" };
  }
}

/** Get comment counts per image for a gallery (for filter bar) */
export async function getCommentCountsPerImage(galleryId: string): Promise<Record<string, number>> {
  try {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("gallery_comments")
      .select("image_id")
      .eq("gallery_id", galleryId);

    if (error || !data) return {};

    const counts: Record<string, number> = {};
    for (const row of data) {
      counts[row.image_id] = (counts[row.image_id] || 0) + 1;
    }
    return counts;
  } catch (error) {
    console.error("getCommentCountsPerImage error:", error);
    return {};
  }
}
