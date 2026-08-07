import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";

type AdminClient = SupabaseClient<Database>;
type AgentRun = Database["public"]["Tables"]["moodie_agent_runs"]["Row"];

export async function claimMoodieAgentRun(input: {
  supabase: AdminClient;
  workerId: string;
  leaseSeconds?: number;
}) {
  const { data, error } = await input.supabase.rpc("claim_moodie_agent_run", {
    p_worker_id: input.workerId,
    p_lease_seconds: input.leaseSeconds ?? 60,
  });
  if (error) throw new Error(error.message);
  return data?.[0] || null;
}

export async function claimSpecificMoodieAgentRun(input: {
  supabase: AdminClient;
  runId: string;
  workerId: string;
  leaseSeconds?: number;
}) {
  const leaseToken = crypto.randomUUID();
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + (input.leaseSeconds ?? 90) * 1000).toISOString();
  const { data, error } = await input.supabase.from("moodie_agent_runs")
    .update({
      status: "running",
      lease_owner: input.workerId,
      lease_token: leaseToken,
      lease_expires_at: leaseExpiresAt,
      started_at: now.toISOString(),
      heartbeat_at: now.toISOString(),
      attempt_count: 1,
      progress: 1,
      updated_at: now.toISOString(),
    })
    .eq("id", input.runId)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function heartbeatMoodieAgentRun(input: {
  supabase: AdminClient;
  runId: string;
  leaseToken: string;
  progress?: number;
  leaseSeconds?: number;
}) {
  const { data, error } = await input.supabase.rpc("heartbeat_moodie_agent_run", {
    p_run_id: input.runId,
    p_lease_token: input.leaseToken,
    p_progress: input.progress,
    p_lease_seconds: input.leaseSeconds ?? 60,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Worker lease is no longer valid");
}

async function nextEventSequence(supabase: AdminClient, runId: string) {
  const { data, error } = await supabase.from("moodie_agent_run_events")
    .select("sequence").eq("run_id", runId).order("sequence", { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  return (data?.[0]?.sequence || 0) + 1;
}

export async function appendMoodieRunProgress(input: {
  supabase: AdminClient;
  run: AgentRun;
  progress: number;
  message: string;
  payload?: Json;
}) {
  if (!input.run.lease_token) throw new Error("Run has no active worker lease");
  await heartbeatMoodieAgentRun({
    supabase: input.supabase,
    runId: input.run.id,
    leaseToken: input.run.lease_token,
    progress: input.progress,
  });
  const sequence = await nextEventSequence(input.supabase, input.run.id);
  const { error } = await input.supabase.from("moodie_agent_run_events").insert({
    run_id: input.run.id,
    user_id: input.run.user_id,
    sequence,
    event_type: "progress",
    message: input.message.slice(0, 1000),
    payload: input.payload || {},
  });
  if (error) throw new Error(error.message);
}

async function finish(input: {
  supabase: AdminClient;
  run: AgentRun;
  status: "completed" | "failed";
  result?: Json;
  error?: string;
  sourceRefs?: Json;
}) {
  if (!input.run.lease_token) throw new Error("Run has no active worker lease");
  const { data, error } = await input.supabase.rpc("finish_moodie_agent_run", {
    p_run_id: input.run.id,
    p_lease_token: input.run.lease_token,
    p_status: input.status,
    p_result: input.result ?? null,
    p_error: input.error,
    p_source_refs: input.sourceRefs || [],
  });
  if (error) throw new Error(error.message);
  const finished = data?.[0];
  if (!finished) throw new Error("Worker lease is no longer valid");
  const sequence = await nextEventSequence(input.supabase, input.run.id);
  const { error: eventError } = await input.supabase.from("moodie_agent_run_events").insert({
    run_id: input.run.id,
    user_id: input.run.user_id,
    sequence,
    event_type: input.status,
    message: input.status === "completed" ? "Tác vụ đã hoàn tất" : "Tác vụ không thể hoàn tất",
    payload: input.status === "failed" ? { error: input.error?.slice(0, 1000) || "Unknown failure" } : {},
  });
  if (eventError) throw new Error(eventError.message);
  return finished;
}

export async function retryMoodieAgentRun(input: {
  supabase: AdminClient;
  run: AgentRun;
  error: string;
  delaySeconds?: number;
}) {
  if (!input.run.lease_token) throw new Error("Run has no active worker lease");
  const { data, error } = await input.supabase.rpc("retry_moodie_agent_run", {
    p_run_id: input.run.id,
    p_lease_token: input.run.lease_token,
    p_error: input.error,
    p_delay_seconds: input.delaySeconds ?? Math.min(300, 15 * 2 ** Math.max(0, input.run.attempt_count - 1)),
  });
  if (error) throw new Error(error.message);
  const retried = data?.[0];
  if (!retried) throw new Error("Worker lease is no longer valid");
  const sequence = await nextEventSequence(input.supabase, input.run.id);
  const { error: eventError } = await input.supabase.from("moodie_agent_run_events").insert({
    run_id: input.run.id,
    user_id: input.run.user_id,
    sequence,
    event_type: retried.status === "queued" ? "retry_scheduled" : "failed",
    message: retried.status === "queued"
      ? `Sẽ thử lại tác vụ (lần ${retried.attempt_count + 1}/${retried.max_attempts})`
      : "Tác vụ đã hết số lần thử",
    payload: { error: input.error.slice(0, 1000), next_attempt_at: retried.next_attempt_at },
  });
  if (eventError) throw new Error(eventError.message);
  return retried;
}

export function completeMoodieAgentRun(input: {
  supabase: AdminClient;
  run: AgentRun;
  result: Json;
  sourceRefs?: Json;
}) {
  return finish({ ...input, status: "completed" });
}

export function failMoodieAgentRun(input: {
  supabase: AdminClient;
  run: AgentRun;
  error: string;
}) {
  return finish({ ...input, status: "failed" });
}
