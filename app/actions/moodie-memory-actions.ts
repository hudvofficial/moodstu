"use server";

import { revalidatePath } from "next/cache";
import { withAuth, withAuthRead, requireMoodieAccess } from "@/lib/auth_utils";
import { validateMoodieMemoryCandidate } from "@/lib/moodie/memory-policy";
import type { MoodieMemoryCandidate, MoodieMemoryStatus } from "@/lib/moodie/memory-policy";

export async function listMoodieMemories() {
  return withAuthRead(async (supabase, userId) => {
    await requireMoodieAccess(supabase, userId);
    const { data, error } = await supabase
      .from("moodie_memories")
      .select("id, scope, memory_type, content, confidence, status, conversation_id, source_message_id, expires_at, created_at, updated_at")
      .or("user_id.eq." + userId + ",scope.eq.studio")
      .neq("status", "deleted")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Không thể tải Moodie memory: " + error.message);
    return data || [];
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

    const { error } = await supabase.from("moodie_memories").insert({
      scope: validation.candidate.scope,
      user_id: validation.candidate.scope === "studio" ? null : userId,
      conversation_id: validation.candidate.conversationId || null,
      memory_type: validation.candidate.memoryType,
      content: validation.candidate.content,
      source_message_id: validation.candidate.sourceMessageId || null,
      confidence: validation.candidate.confidence,
      status: "pending",
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
      .select("id, scope, user_id")
      .eq("id", memoryId)
      .single();
    if (memoryError || !memory) throw new Error("Không tìm thấy ghi nhớ");
    const canManage = memory.user_id === userId || (memory.scope === "studio" && (role === "admin" || role === "manager"));
    if (!canManage) throw new Error("Bạn không có quyền cập nhật ghi nhớ này");

    const { error } = await supabase
      .from("moodie_memories")
      .update({ status, last_confirmed_at: status === "active" ? new Date().toISOString() : undefined })
      .eq("id", memoryId);
    if (error) throw new Error("Không thể cập nhật memory: " + error.message);
    revalidatePath("/moodie");
    return { success: true };
  });
}
