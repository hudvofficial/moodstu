import { createClient } from "@/lib/supabase/server";
import { cancelMoodieRunSchema } from "@/lib/moodie/runs/contracts";
import { cancelMoodieRun } from "@/lib/moodie/runs/repository";

export async function POST(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = cancelMoodieRunSchema.safeParse({ runId: (await context.params).runId });
  if (!parsed.success) return Response.json({ error: "Invalid run id" }, { status: 400 });
  try {
    const run = await cancelMoodieRun({ supabase, userId: user.id, runId: parsed.data.runId });
    return Response.json({ run });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 409 });
  }
}
