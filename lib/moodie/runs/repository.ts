import type { SupabaseClient } from "@supabase/supabase-js";
import { createMoodieConfirmationToken, hashMoodieConfirmationToken } from "@/lib/moodie/runs/security";
import { requiresMoodieRunConfirmation } from "@/lib/moodie/runs/policy";
import type { Database, Json } from "@/types/database.types";

type Client = SupabaseClient<Database>;

export async function proposeMoodieRun(input: {
  supabase: Client;
  userId: string;
  conversationId?: string;
  voiceSessionId?: string;
  parentTurnId?: string;
  kind: "task" | "research" | "action";
  title: string;
  toolName?: string;
  readOnly: boolean;
  request: Record<string, unknown>;
  idempotencyKey?: string;
}) {
  const requiresConfirmation = requiresMoodieRunConfirmation(input);
  const confirmation = requiresConfirmation ? createMoodieConfirmationToken() : null;
  const status = requiresConfirmation ? "awaiting_confirmation" : "queued";
  const now = new Date().toISOString();
  const expiresAt = requiresConfirmation ? new Date(Date.now() + 10 * 60_000).toISOString() : null;
  const insert = {
    user_id: input.userId,
    conversation_id: input.conversationId || null,
    voice_session_id: input.voiceSessionId || null,
    parent_turn_id: input.parentTurnId || null,
    kind: input.kind,
    title: input.title,
    request: input.request as Json,
    status,
    requires_confirmation: requiresConfirmation,
    confirmation_token_hash: confirmation?.hash || null,
    confirmation_expires_at: expiresAt,
    idempotency_key: input.idempotencyKey || null,
    updated_at: now,
  };

  const query = input.supabase.from("moodie_agent_runs").insert(insert).select("*").single();
  let { data, error } = await query;
  if (error && input.idempotencyKey && error.code === "23505") {
    const existing = await input.supabase.from("moodie_agent_runs").select("*")
      .eq("user_id", input.userId).eq("idempotency_key", input.idempotencyKey).single();
    data = existing.data;
    error = existing.error;
  }
  if (error || !data) throw new Error(error?.message || "Không thể tạo tác vụ Moodie");

  await input.supabase.from("moodie_agent_run_events").upsert({
    run_id: data.id,
    user_id: input.userId,
    sequence: 1,
    event_type: status,
    message: requiresConfirmation ? "Đang chờ người dùng xác nhận" : "Tác vụ đã được đưa vào hàng đợi",
  }, { onConflict: "run_id,sequence", ignoreDuplicates: true });

  return { run: data, confirmationToken: confirmation?.token || null };
}

export async function confirmMoodieRun(input: { supabase: Client; userId: string; runId: string; token: string }) {
  const now = new Date().toISOString();
  const tokenHash = hashMoodieConfirmationToken(input.token);
  const { data, error } = await input.supabase.from("moodie_agent_runs").update({
    status: "queued",
    confirmed_at: now,
    confirmed_by: input.userId,
    confirmation_token_hash: null,
    updated_at: now,
  }).eq("id", input.runId).eq("user_id", input.userId)
    .eq("status", "awaiting_confirmation")
    .eq("confirmation_token_hash", tokenHash)
    .gt("confirmation_expires_at", now)
    .select("*").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Xác nhận không hợp lệ hoặc đã hết hạn");
  await input.supabase.from("moodie_agent_run_events").insert({
    run_id: data.id, user_id: input.userId, sequence: 2,
    event_type: "confirmed", message: "Người dùng đã xác nhận tác vụ",
  });
  return data;
}

export async function cancelMoodieRun(input: { supabase: Client; userId: string; runId: string }) {
  const now = new Date().toISOString();
  const { data, error } = await input.supabase.from("moodie_agent_runs").update({
    status: "cancelled", completed_at: now, updated_at: now,
  }).eq("id", input.runId).eq("user_id", input.userId)
    .in("status", ["proposed", "awaiting_confirmation", "queued", "running"])
    .select("*").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Tác vụ không tồn tại hoặc đã kết thúc");
  const { count } = await input.supabase.from("moodie_agent_run_events")
    .select("id", { count: "exact", head: true }).eq("run_id", data.id);
  await input.supabase.from("moodie_agent_run_events").insert({
    run_id: data.id, user_id: input.userId, sequence: (count || 0) + 1,
    event_type: "cancelled", message: "Tác vụ đã được huỷ",
  });
  return data;
}
