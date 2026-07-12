import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";

type BraveUsageMode = "web" | "news" | "local";

const USER_DAILY_LIMIT = 20;
const STUDIO_DAILY_LIMIT = 200;
const ESTIMATED_COST_MICROUSD = 5_000;

type UntypedRpc = (name: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;

export function fingerprintMoodieResearchQuery(query: string) {
  return createHash("sha256").update(query).digest("hex").slice(0, 24);
}

export async function reserveMoodieBraveUsage(input: { userId?: string; query: string; mode: BraveUsageMode }) {
  if (!input.userId) return { auditId: null as string | null };
  const supabase = await createAdminClient();
  const { error } = await (supabase.rpc as unknown as UntypedRpc)("reserve_moodie_brave_call", {
    p_user_id: input.userId,
    p_daily_limit: USER_DAILY_LIMIT,
    p_studio_daily_limit: STUDIO_DAILY_LIMIT,
    p_estimated_cost_microusd: ESTIMATED_COST_MICROUSD,
  });
  if (error) {
    if (error.message.includes("MOODIE_BRAVE_USER_QUOTA_EXCEEDED")) throw new Error("Bạn đã dùng hết hạn mức Brave Search hôm nay");
    if (error.message.includes("MOODIE_BRAVE_STUDIO_QUOTA_EXCEEDED")) throw new Error("Studio đã dùng hết hạn mức Brave Search hôm nay");
    throw new Error(`Không thể kiểm tra hạn mức Brave Search: ${error.message}`);
  }
  const { data, error: auditError } = await supabase.from("moodie_brave_audit_events" as never).insert({
    user_id: input.userId,
    mode: input.mode,
    query_fingerprint: fingerprintMoodieResearchQuery(input.query),
    status: "reserved",
    estimated_cost_microusd: ESTIMATED_COST_MICROUSD,
  } as never).select("id").single();
  if (auditError) throw new Error(`Không thể ghi audit Brave Search: ${auditError.message}`);
  return { auditId: (data as { id: string }).id };
}

export async function finishMoodieBraveUsage(input: {
  userId?: string;
  auditId: string | null;
  status: "completed" | "failed";
  resultCount: number;
  durationMs: number;
  errorCode?: string;
}) {
  if (!input.userId || !input.auditId) return;
  const supabase = await createAdminClient();
  await Promise.all([
    supabase.from("moodie_brave_audit_events" as never).update({
      status: input.status,
      result_count: input.resultCount,
      duration_ms: input.durationMs,
      error_code: input.errorCode?.slice(0, 120) || null,
    } as never).eq("id" as never, input.auditId as never).eq("user_id" as never, input.userId as never),
    input.status === "completed"
      ? supabase.from("moodie_brave_usage_daily" as never).update({
          result_count: input.resultCount,
          updated_at: new Date().toISOString(),
        } as never).eq("usage_date" as never, new Date().toISOString().slice(0, 10) as never).eq("user_id" as never, input.userId as never)
      : Promise.resolve(),
  ]);
}
