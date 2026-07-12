import { createAdminClient } from "@/lib/supabase/server";
import { executeMoodieAgentRun } from "@/lib/moodie/runs/executor";
import { claimMoodieAgentRun } from "@/lib/moodie/runs/worker";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET || process.env.INTERNAL_API_KEY;
  return Boolean(expected) && request.headers.get("authorization") === `Bearer ${expected}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await createAdminClient();
  const workerId = request.headers.get("x-worker-id")?.slice(0, 200) || `moodie-worker:${crypto.randomUUID()}`;
  try {
    const run = await claimMoodieAgentRun({ supabase, workerId, leaseSeconds: 90 });
    if (!run) return Response.json({ claimed: false }, { status: 200 });
    const result = await executeMoodieAgentRun({ supabase, run, signal: request.signal });
    return Response.json({ claimed: true, run_id: result.id, status: result.status });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
