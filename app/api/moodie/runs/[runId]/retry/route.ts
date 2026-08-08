import { after } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { proposeMoodieRun } from "@/lib/moodie/runs/repository";
import { claimSpecificMoodieAgentRun } from "@/lib/moodie/runs/worker";
import { executeMoodieAgentRun } from "@/lib/moodie/runs/executor";

export async function POST(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { runId } = await context.params;
  const { data: previous, error } = await supabase.from("moodie_agent_runs")
    .select("*").eq("id", runId).eq("user_id", user.id).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!previous) return Response.json({ error: "Run not found" }, { status: 404 });
  if (!(["failed", "cancelled", "expired"] as string[]).includes(previous.status)) {
    return Response.json({ error: "Chỉ có thể thử lại tác vụ đã thất bại, bị huỷ hoặc hết hạn" }, { status: 409 });
  }

  try {
    const proposed = await proposeMoodieRun({
      supabase,
      userId: user.id,
      conversationId: previous.conversation_id || undefined,
      voiceSessionId: previous.voice_session_id || undefined,
      parentTurnId: previous.parent_turn_id || undefined,
      kind: previous.kind as "action" | "task" | "research",
      title: previous.title,
      readOnly: previous.kind !== "action",
      request: (previous.request && typeof previous.request === "object" ? previous.request : {}) as Record<string, unknown>,
      idempotencyKey: `retry:${previous.id}:${crypto.randomUUID()}`,
    });

    after(async () => {
      const admin = await createAdminClient();
      const run = await claimSpecificMoodieAgentRun({
        supabase: admin,
        runId: proposed.run.id,
        workerId: `retry-after:${crypto.randomUUID()}`,
        leaseSeconds: 90,
      });
      if (run) await executeMoodieAgentRun({ supabase: admin, run });
    });

    return Response.json({ run: proposed.run }, { status: 201 });
  } catch (retryError) {
    return Response.json({ error: retryError instanceof Error ? retryError.message : String(retryError) }, { status: 500 });
  }
}
