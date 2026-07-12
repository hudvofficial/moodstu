"use server";

import { fireAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { withAuth, withAuthRead, requireMoodieAccess } from "@/lib/auth_utils";
import { validateMoodieMemoryCandidate } from "@/lib/moodie/memory-policy";
import { moodieMemoryReviewPolicy } from "@/lib/moodie/memory-lifecycle";
import type { MoodieMemoryCandidate, MoodieMemoryStatus } from "@/lib/moodie/memory-policy";

export async function exportMoodieMemories() {
  return withAuthRead(async (supabase, userId) => {
    await requireMoodieAccess(supabase, userId);
    const { data, error } = await supabase.from("moodie_memories")
      .select("id, scope, memory_type, content, confidence, importance, status, subject, predicate, value, source_message_ids, source_voice_turn_id, supersedes_memory_id, consolidated_into_memory_id, expires_at, review_after, last_confirmed_at, created_at, updated_at")
      .eq("user_id", userId).order("created_at", { ascending: true });
    if (error) throw new Error("Không thể export memory: " + error.message);
    return {
      exported_at: new Date().toISOString(),
      schema_version: 3,
      memories: data || [],
    };
  });
}

export async function eraseAllMoodieMemories(confirmation: string) {
  return withAuth(async (supabase, userId) => {
    await requireMoodieAccess(supabase, userId);
    if (confirmation.trim() !== "XÓA TOÀN BỘ MEMORY") throw new Error("Câu xác nhận không chính xác");
    const { count, error } = await supabase.from("moodie_memories")
      .delete({ count: "exact" }).eq("user_id", userId);
    if (error) throw new Error("Không thể xoá memory: " + error.message);
    fireAuditLog({
      action: "DELETE",
      tableName: "moodie_memories",
      description: `Người dùng yêu cầu hard-delete ${count || 0} Moodie memories của chính mình`,
      source: "server_action",
    });
    revalidatePath("/moodie");
    return { success: true, deletedCount: count || 0 };
  });
}

export async function listMoodieMemories() {
  return withAuthRead(async (supabase, userId) => {
    await requireMoodieAccess(supabase, userId);
    const { data, error } = await supabase
      .from("moodie_memories")
      .select("id, scope, memory_type, content, confidence, importance, status, subject, predicate, value, conversation_id, source_message_id, source_message_ids, supersedes_memory_id, consolidated_into_memory_id, expires_at, reconfirmation_interval_days, review_after, archived_reason, deleted_at, last_confirmed_at, last_used_at, use_count, created_at, updated_at")
      .or("user_id.eq." + userId + ",scope.eq.studio")
      .neq("status", "deleted")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Không thể tải Moodie memory: " + error.message);
    return data || [];
  });
}

export async function updateMoodieMemoryContent(memoryId: string, content: string) {
  return withAuth(async (supabase, userId) => {
    const { role } = await requireMoodieAccess(supabase, userId);
    if (!/^[0-9a-f-]{36}$/i.test(memoryId)) throw new Error("Memory id không hợp lệ");
    const normalized = content.replace(/\s+/g, " ").trim();
    if (!normalized || normalized.length > 1000) throw new Error("Nội dung memory không hợp lệ");
    const validation = validateMoodieMemoryCandidate({ scope: "user", memoryType: "fact", content: normalized, confidence: 1 });
    if (!validation.ok) throw new Error("Memory không an toàn: " + validation.reason);
    const { data: memory, error: memoryError } = await supabase.from("moodie_memories")
      .select("id, scope, user_id, reconfirmation_interval_days").eq("id", memoryId).single();
    if (memoryError || !memory) throw new Error("Không tìm thấy ghi nhớ");
    const canManage = memory.user_id === userId || (memory.scope === "studio" && (role === "admin" || role === "manager"));
    if (!canManage) throw new Error("Bạn không có quyền sửa ghi nhớ này");
    const now = new Date();
    const reviewAfter = memory.reconfirmation_interval_days
      ? new Date(now.getTime() + memory.reconfirmation_interval_days * 86_400_000).toISOString()
      : null;
    const { error } = await supabase.from("moodie_memories").update({
      content: normalized,
      value: { text: normalized },
      status: "active",
      last_confirmed_at: now.toISOString(),
      review_after: reviewAfter,
      embedding: null,
      embedding_model: null,
      embedding_updated_at: null,
      archived_reason: null,
      deleted_at: null,
    }).eq("id", memoryId);
    if (error) throw new Error("Không thể sửa memory: " + error.message);
    revalidatePath("/moodie");
    return { success: true };
  });
}

export async function proposeMoodieMemory(candidate: MoodieMemoryCandidate) {
  return withAuth(async (supabase, userId) => {
    const { role } = await requireMoodieAccess(supabase, userId);
    const validation = validateMoodieMemoryCandidate(candidate);
    if (!validation.ok) throw new Error("Memory không hợp lệ: " + validation.reason);
    if (validation.candidate.scope === "studio" && role !== "admin" && role !== "manager") {
      throw new Error("Chỉ quản lý studio mới có thể tạo studio memory");
    }

    const now = new Date();
    const lifecycle = moodieMemoryReviewPolicy(validation.candidate.memoryType, now);
    const { error } = await supabase.from("moodie_memories").insert({
      scope: validation.candidate.scope,
      user_id: validation.candidate.scope === "studio" ? null : userId,
      conversation_id: validation.candidate.conversationId || null,
      memory_type: validation.candidate.memoryType,
      content: validation.candidate.content,
      source_message_id: validation.candidate.sourceMessageId || null,
      source_message_ids: validation.candidate.sourceMessageIds || (validation.candidate.sourceMessageId ? [validation.candidate.sourceMessageId] : []),
      source_voice_turn_id: validation.candidate.sourceVoiceTurnId || null,
      confidence: validation.candidate.confidence,
      importance: validation.candidate.importance,
      subject: validation.candidate.subject,
      predicate: validation.candidate.predicate,
      value: validation.candidate.value,
      status: validation.candidate.autoActivate ? "active" : "pending",
      reconfirmation_interval_days: lifecycle.reconfirmationIntervalDays,
      review_after: validation.candidate.autoActivate ? lifecycle.reviewAfter : null,
      last_confirmed_at: validation.candidate.autoActivate ? now.toISOString() : null,
    });
    if (error) throw new Error("Không thể tạo memory: " + error.message);
    revalidatePath("/moodie");
    return { success: true };
  });
}

export async function updateMoodieMemoryStatus(memoryId: string, status: MoodieMemoryStatus) {
  return withAuth(async (supabase, userId) => {
    const { role } = await requireMoodieAccess(supabase, userId);
    if (!/^[0-9a-f-]{36}$/i.test(memoryId)) throw new Error("Memory id không hợp lệ");
    if (!["active", "archived", "deleted"].includes(status)) throw new Error("Memory status không hợp lệ");

    const { data: memory, error: memoryError } = await supabase
      .from("moodie_memories")
      .select("id, scope, user_id, reconfirmation_interval_days")
      .eq("id", memoryId)
      .single();
    if (memoryError || !memory) throw new Error("Không tìm thấy ghi nhớ");
    const canManage = memory.user_id === userId || (memory.scope === "studio" && (role === "admin" || role === "manager"));
    if (!canManage) throw new Error("Bạn không có quyền cập nhật ghi nhớ này");

    const now = new Date();
    const intervalDays = memory.reconfirmation_interval_days;
    const reviewAfter = status === "active" && intervalDays
      ? new Date(now.getTime() + intervalDays * 86_400_000).toISOString()
      : undefined;
    const { error } = await supabase
      .from("moodie_memories")
      .update({
        status,
        last_confirmed_at: status === "active" ? now.toISOString() : undefined,
        review_after: reviewAfter,
        archived_reason: status === "archived" ? "manual" : status === "active" ? null : undefined,
        deleted_at: status === "deleted" ? now.toISOString() : status === "active" ? null : undefined,
      })
      .eq("id", memoryId);
    if (error) throw new Error("Không thể cập nhật memory: " + error.message);
    revalidatePath("/moodie");
    return { success: true };
  });
}
