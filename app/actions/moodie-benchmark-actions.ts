"use server";

import { randomUUID } from "crypto";
import { withAdmin } from "@/lib/auth_utils";
import { evaluateMoodieResponse, summarizeMoodieEvaluations, type MoodieEvaluationResult } from "@/lib/moodie/evaluator";
import { runMoodieEngine } from "@/lib/moodie/engine";
import { routeMoodieIntent } from "@/lib/moodie/intent-router";
import { getMoodieProviderSnapshot } from "@/lib/moodie/providers/registry";
import { MOODIE_REGRESSION_SUITE } from "@/lib/moodie/regression-prompts";
import { planMoodieExecution } from "@/lib/moodie/tool-planner";
import { planMoodieWorkflow } from "@/lib/moodie/execution-plan-v2";
import type { Database, Json } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MoodieBenchmarkReport = {
  runId: string;
  createdAt: string;
  providerId: string;
  providerLabel: string;
  model: string;
  summary: ReturnType<typeof summarizeMoodieEvaluations>;
  results: MoodieEvaluationResult[];
};

export type MoodieBenchmarkMatrixRow = {
  key: string;
  providerLabel: string;
  model: string;
  runs: number;
  averageScore: number;
  averageLatencyMs: number;
  averagePassRate: number;
  lastRunAt: string;
};

function selectCases(caseIds?: string[]) {
  if (!caseIds || caseIds.length === 0) return MOODIE_REGRESSION_SUITE;
  const selectedIds = new Set(caseIds);
  return MOODIE_REGRESSION_SUITE.filter((testCase) => selectedIds.has(testCase.id));
}

export async function getMoodieBenchmarkPreflight() {
  return withAdmin(async () => {
    const provider = await getMoodieProviderSnapshot();
    const cases = MOODIE_REGRESSION_SUITE.map((testCase) => {
      const route = routeMoodieIntent({
        prompt: testCase.prompt,
        role: "admin",
      });
      const workflowPlan = planMoodieWorkflow({ prompt: testCase.prompt, role: "admin" });
      const plan = planMoodieExecution({ route, prompt: testCase.prompt, role: "admin" });

      return {
        id: testCase.id,
        prompt: testCase.prompt,
        expectedIntent: testCase.expectedIntent,
        actualIntent: workflowPlan ? "crm_calendar_ops" : route.intent,
        routePassed: (workflowPlan ? "crm_calendar_ops" : route.intent) === testCase.expectedIntent,
        expectsToolUse: testCase.expectsToolUse,
        plannedTools: workflowPlan ? workflowPlan.steps.map((step) => step.tool) : plan.prioritizedToolNames,
      };
    });

    return {
      provider,
      cases,
      routePassRate: Math.round((cases.filter((item) => item.routePassed).length / cases.length) * 100),
    };
  });
}

async function persistBenchmarkReport(
  supabase: SupabaseClient<Database>,
  userId: string,
  report: MoodieBenchmarkReport,
) {
  const { error } = await supabase.from("audit_logs").insert({
    performed_by: userId,
    action: "DETECT",
    table_name: "moodie_benchmarks",
    record_id: report.runId,
    description: `Moodie benchmark ${report.providerLabel} / ${report.model}: ${report.summary.averageScore} diem`,
    new_data: report as unknown as Json,
    log_type: "GENERAL",
    severity: report.summary.passRate >= 80 ? "INFO" : "WARNING",
    source: "server_action",
  });

  if (error) {
    throw new Error(`Không thể lưu báo cáo đánh giá: ${error.message}`);
  }
}

export async function runMoodieBenchmark(caseIds?: string[]) {
  return withAdmin(async (supabase, userId) => {
    const selectedCases = selectCases(caseIds);
    if (selectedCases.length === 0) {
    throw new Error("Không có tình huống kiểm thử hợp lệ");
    }

    const provider = await getMoodieProviderSnapshot();
    const results: MoodieEvaluationResult[] = [];

    for (const testCase of selectedCases) {
      try {
        const response = await runMoodieEngine({
          supabase: supabase as SupabaseClient<Database>,
          role: "admin",
          prompt: testCase.prompt,
          history: [{ role: "user", content: testCase.prompt }],
          userContext: {
            id: "moodie-benchmark",
            fullName: "Moodie Benchmark",
            email: null,
            department: null,
            position: null,
            role: "admin",
          },
        });

        results.push(evaluateMoodieResponse({
          testCase,
          content: response.content,
          metadata: response.metadata,
        }));
      } catch (error) {
        results.push({
          caseId: testCase.id,
          prompt: testCase.prompt,
          score: 0,
          passed: false,
          checks: [{
            key: "runtime",
            label: "Benchmark runtime",
            passed: false,
            points: 100,
            earned: 0,
          }],
          toolNames: [],
          latencyMs: 0,
          fallbackUsed: false,
          responsePreview: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const report: MoodieBenchmarkReport = {
      runId: randomUUID(),
      createdAt: new Date().toISOString(),
      providerId: provider.providerId,
      providerLabel: provider.label,
      model: provider.model,
      summary: summarizeMoodieEvaluations(results),
      results,
    };

    await persistBenchmarkReport(supabase as SupabaseClient<Database>, userId, report);
    return report;
  });
}

function isBenchmarkReport(value: Json | null): value is Json & Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getMoodieBenchmarkDashboard(limit = 20) {
  return withAdmin(async (supabase) => {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("record_id, created_at, new_data")
      .eq("table_name", "moodie_benchmarks")
      .order("created_at", { ascending: false })
      .limit(Math.max(1, Math.min(50, limit)));

    if (error) {
    throw new Error(`Không thể tải bảng đánh giá: ${error.message}`);
    }

    const reports = (data || [])
      .filter((row) => isBenchmarkReport(row.new_data))
      .map((row) => row.new_data as unknown as MoodieBenchmarkReport)
      .filter((report) => report.providerLabel && report.model && report.summary)
      .slice(0, limit);

    const groups = new Map<string, MoodieBenchmarkReport[]>();
    for (const report of reports) {
      const key = `${report.providerLabel}::${report.model}`;
      groups.set(key, [...(groups.get(key) || []), report]);
    }

    const matrix: MoodieBenchmarkMatrixRow[] = [...groups.entries()].map(([key, group]) => ({
      key,
      providerLabel: group[0].providerLabel,
      model: group[0].model,
      runs: group.length,
      averageScore: Math.round(group.reduce((sum, report) => sum + report.summary.averageScore, 0) / group.length),
      averageLatencyMs: Math.round(group.reduce((sum, report) => sum + report.summary.averageLatencyMs, 0) / group.length),
      averagePassRate: Math.round(group.reduce((sum, report) => sum + report.summary.passRate, 0) / group.length),
      lastRunAt: group[0].createdAt,
    }));

    return {
      latest: reports[0] || null,
      reports,
      matrix: matrix.toSorted((left, right) => right.averageScore - left.averageScore),
    };
  });
}
