import { createAdminClient } from "@/lib/supabase/server";
import { consolidateNextMoodieEpisodicBatch } from "@/lib/moodie/memory-consolidator";
import { reflectNextMoodieObservationBatch } from "@/lib/moodie/observation-store";
import { isAuthorizedInternalRequest } from "@/lib/internal-api-auth";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET || process.env.INTERNAL_API_KEY;
  return isAuthorizedInternalRequest(request.headers.get("authorization"), expected);
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await createAdminClient();
  const { data, error } = await supabase.rpc("maintain_moodie_memory_lifecycle", { p_limit: 500 });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const reflection = await reflectNextMoodieObservationBatch({ supabase }).catch((error) => ({
    error: error instanceof Error ? error.message : String(error),
  }));
  const consolidation = await consolidateNextMoodieEpisodicBatch({ supabase }).catch((error) => ({
    error: error instanceof Error ? error.message : String(error),
  }));
  return Response.json({
    success: true,
    lifecycle: data?.[0] || { expired_count: 0, reconfirm_count: 0 },
    reflection,
    consolidation,
  });
}
