"use server";

import { withAdmin } from "@/lib/auth_utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseMoodieMessageMeta } from "@/lib/moodie/records";
import type { Database, Json } from "@/types/database.types";

export async function getMoodieObservabilityReport(limit = 120) {
  return withAdmin(async (supabase: SupabaseClient<Database>) => {
    const { data, error } = await supabase
      .from("ai_messages")
      .select("id, created_at, metadata")
      .eq("role", "assistant")
      .order("created_at", { ascending: false })
      .limit(Math.max(20, Math.min(300, limit)));

    if (error) {
    throw new Error(`Không thể tải báo cáo giám sát Moodie: ${error.message}`);
    }

    const rows = (data || []).map((row) => ({
      id: row.id,
      created_at: row.created_at,
      metadata: parseMoodieMessageMeta((row.metadata || null) as Json),
    }));

    const traceRows = rows.filter((row) => row.metadata?.trace);
    const traces = traceRows.map((row) => row.metadata?.trace).filter(Boolean);
    const observedMessages = traceRows.length;
    const totalLatency = traces.reduce((sum, trace) => sum + (trace?.duration_ms || 0), 0);
    const toolCallCount = traces.reduce((sum, trace) => sum + (trace?.tool_call_count || 0), 0);
    const fallbackCount = traces.filter((trace) => trace?.fallback_used).length;
    const verifierCorrections = traces.reduce((sum, trace) => sum + (trace?.verifier_corrections || 0), 0);
    const retrievalCount = traces.filter((trace) => trace?.retrieval_used).length;
    const totalTokens = traces.reduce((sum, trace) => sum + (trace?.total_tokens || 0), 0);

    const byIntent = Object.entries(
      traces.reduce<Record<string, number>>((acc, trace) => {
        const key = trace?.route_intent || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    )
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 8)
      .map(([intent, count]) => ({ intent, count: Number(count) }));

    const byTool = Object.entries(
      traces.flatMap((trace) => trace?.tools || []).reduce<Record<string, number>>((acc, tool) => {
        acc[tool.name] = (acc[tool.name] || 0) + 1;
        return acc;
      }, {}),
    )
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 8)
      .map(([tool, count]) => ({ tool, count: Number(count) }));

    return {
      observedMessages,
      averageLatencyMs: observedMessages > 0 ? Math.round(totalLatency / observedMessages) : 0,
      toolCallCount,
      fallbackCount,
      verifierCorrections,
      retrievalCount,
      totalTokens,
      lastTraceAt: traceRows[0]?.created_at || undefined,
      byIntent,
      byTool,
    };
  });
}
