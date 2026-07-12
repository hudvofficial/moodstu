import { createClient } from "@/lib/supabase/server";
import { proposeMoodieRunSchema } from "@/lib/moodie/runs/contracts";
import { proposeMoodieRun } from "@/lib/moodie/runs/repository";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = proposeMoodieRunSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid run proposal" }, { status: 400 });
  try {
    const result = await proposeMoodieRun({
      supabase,
      userId: user.id,
      conversationId: parsed.data.conversationId,
      voiceSessionId: parsed.data.voiceSessionId,
      parentTurnId: parsed.data.parentTurnId,
      kind: parsed.data.kind,
      title: parsed.data.title,
      toolName: parsed.data.toolName,
      readOnly: parsed.data.readOnly,
      request: parsed.data.request,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    return Response.json({
      run: result.run,
      confirmation_token: result.confirmationToken,
    }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const runId = url.searchParams.get("run_id");
  if (!runId) return Response.json({ error: "run_id is required" }, { status: 400 });
  const [runResult, eventResult] = await Promise.all([
    supabase.from("moodie_agent_runs").select("*").eq("id", runId).eq("user_id", user.id).maybeSingle(),
    supabase.from("moodie_agent_run_events").select("*").eq("run_id", runId).eq("user_id", user.id).order("sequence"),
  ]);
  if (runResult.error) return Response.json({ error: runResult.error.message }, { status: 500 });
  if (!runResult.data) return Response.json({ error: "Run not found" }, { status: 404 });
  if (eventResult.error) return Response.json({ error: eventResult.error.message }, { status: 500 });
  return Response.json({ run: runResult.data, events: eventResult.data || [] });
}
