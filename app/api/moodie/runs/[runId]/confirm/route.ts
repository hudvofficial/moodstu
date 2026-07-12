import { createClient } from "@/lib/supabase/server";
import { confirmMoodieRunSchema } from "@/lib/moodie/runs/contracts";
import { confirmMoodieRun } from "@/lib/moodie/runs/repository";

export async function POST(request: Request, context: { params: Promise<{ runId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { runId } = await context.params;
  const body = await request.json().catch(() => null) as { confirmation_token?: unknown } | null;
  const parsed = confirmMoodieRunSchema.safeParse({ runId, confirmationToken: body?.confirmation_token });
  if (!parsed.success) return Response.json({ error: "Invalid confirmation" }, { status: 400 });
  try {
    const run = await confirmMoodieRun({
      supabase, userId: user.id, runId: parsed.data.runId, token: parsed.data.confirmationToken,
    });
    return Response.json({ run });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 409 });
  }
}
