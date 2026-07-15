"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/types/gallery";
import { requirePublicGalleryImageAccess } from "./gallery-core";

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
  client_identifier: string;
  created_at: string;
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

/** Get comments for an image */
export async function getComments(imageId: string): Promise<GalleryComment[]> {
  try {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("gallery_comments")
      .select("*")
      .eq("image_id", imageId)
      .order("created_at", { ascending: true });

    if (error) return [];
    return data || [];
  } catch (error) {
    console.error("getComments error:", error);
    return [];
  }
}

/** Add a comment to an image */
export async function addComment(
  imageId: string,
  galleryId: string,
  content: string,
  authorName: string,
  clientIdentifier: string
) {
  try {
    if (!content.trim() || content.length > 500) {
      return { success: false, error: "Nội dung comment không hợp lệ (1-500 ký tự)" };
    }

    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("gallery_comments")
      .insert({
        image_id: imageId,
        gallery_id: galleryId,
        content: content.trim(),
        author_name: authorName.trim() || "Khách",
        client_identifier: clientIdentifier,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (error) {
    console.error("addComment error:", error);
    return { success: false, error: "Không thể thêm comment" };
  }
}

/** Delete a comment (only the creator can delete) */
export async function deleteComment(commentId: string, clientIdentifier: string) {
  try {
    const supabase = await createAdminClient();

    const { data: comment } = await supabase
      .from("gallery_comments")
      .select("client_identifier")
      .eq("id", commentId)
      .single();

    if (!comment || comment.client_identifier !== clientIdentifier) {
      return { success: false, error: "Không có quyền xóa comment này" };
    }

    await supabase.from("gallery_comments").delete().eq("id", commentId);
    return { success: true };
  } catch (error) {
    console.error("deleteComment error:", error);
    return { success: false, error: "Không thể xóa comment" };
  }
}

/** Get total comment count for a gallery */
export async function getGalleryCommentCount(galleryId: string): Promise<number> {
  try {
    const supabase = await createAdminClient();

    const { count, error } = await supabase
      .from("gallery_comments")
      .select("id", { count: "exact", head: true })
      .eq("gallery_id", galleryId);

    if (error) return 0;
    return count || 0;
  } catch (error) {
    console.error("getGalleryCommentCount error:", error);
    return 0;
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
