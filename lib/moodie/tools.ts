import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchGoals, fetchGoalsCashflow } from "@/app/actions/finance-operations-queries";
import { getReportRange } from "@/lib/report-period";
import { getTodayInTimeZone } from "@/lib/studio-date";
import { getMoodieDefaultSuggestions } from "@/lib/moodie/catalog";
import {
  buildCalendarTimelinePart,
  loadMoodieCalendarAgenda,
} from "@/lib/moodie/domain/calendar-context";
import {
  buildDeliveryAssetParts,
  buildGalleryPart,
  loadMoodieDeliveryAssets,
  loadMoodieGalleryImages,
  resolveMoodieContract,
} from "@/lib/moodie/domain/gallery-context";
import { proposeMoodieRun } from "@/lib/moodie/runs/repository";
import { researchWithBrave, type BraveResearchMode } from "@/lib/moodie/mcp/adapters/brave";
import { canExposeMoodieTool } from "@/lib/moodie/tool-manifest";
import type { Database } from "@/types/database.types";
import type { ActionResult } from "@/types/finance-operations";
import type {
  MoodieHistoryMessage,
  MoodieKpiCardItem,
  MoodieMessageMeta,
  MoodieMessageSource,
  MoodieProgressBarItem,
  MoodieComparisonBarItem,
  MoodieSkillId,
  MoodieWidget,
} from "@/types/moodie";
import { canAccess, type Role } from "@/types/roles";
import type { ReportFiltersInput } from "@/types/reports";
import type { GeminiToolDefinition } from "@/lib/moodie/gemini";

type MoodieAdminClient = SupabaseClient<Database>;

type MoodieToolContext = {
  supabase: MoodieAdminClient;
  role: Role;
  userId?: string;
  conversationId?: string;
  history: MoodieHistoryMessage[];
};

type MoodieToolExecution = {
  result: Record<string, unknown>;
  metadata: Partial<MoodieMessageMeta>;
};

type MoodieTool = {
  definition: GeminiToolDefinition;
  execute: (
    context: MoodieToolContext,
    rawArgs: Record<string, unknown>,
  ) => Promise<MoodieToolExecution>;
};

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function customerNameForTool(contract: {
  customers: { full_name: string | null } | Array<{ full_name: string | null }> | null;
}) {
  const customer = Array.isArray(contract.customers) ? contract.customers[0] : contract.customers;
  return customer?.full_name || null;
}

async function resolveGalleryToolContract(context: MoodieToolContext, rawArgs: Record<string, unknown>) {
  if (!canAccess(context.role, "contracts")) {
    return null;
  }
  return resolveMoodieContract(context.supabase, {
    contract_id: optionalString(rawArgs.contract_id),
    contract_code: optionalString(rawArgs.contract_code),
    customer_query: optionalString(rawArgs.customer_query),
  });
}

async function executeCalendarAgenda(
  context: MoodieToolContext,
  rawArgs: Record<string, unknown>,
): Promise<MoodieToolExecution> {
  if (!canAccess(context.role, "calendar")) {
    return buildPermissionDeniedResult(context.role, "schedule_summary", "Lịch tổng hợp");
  }

  const range = getScheduleRange(rawArgs);
  const start = new Date(`${range.start}T00:00:00`);
  const end = new Date(`${range.end}T00:00:00`);
  end.setDate(end.getDate() + 1);
  const includeGoogle = rawArgs.include_google !== false;
  const includeTasks = rawArgs.include_tasks !== false;
  const limit = Math.max(1, Math.min(40, toInteger(rawArgs.limit) || 20));
  const agenda = await loadMoodieCalendarAgenda({ start, end, includeGoogle, includeTasks, limit });

  return {
    result: {
      range: range.label,
      total: agenda.totals.all,
      totals: agenda.totals,
      events: agenda.events.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        all_day: event.allDay,
        source: event.source,
        location: event.location,
        status: event.status,
        contract_id: event.contractId,
        customer_name: event.customerName,
      })),
      partial_errors: agenda.errors,
    },
    metadata: {
      skill_id: "schedule_summary",
      skill_label: "Lịch tổng hợp",
      sources: buildSources([
        { label: "Khung thời gian", value: range.label },
        { label: "Lịch studio", value: String(agenda.totals.studio) },
        { label: "Google Calendar", value: String(agenda.totals.google) },
        { label: "Công việc", value: String(agenda.totals.tasks) },
      ]),
      follow_ups: [
        "Lịch nào trong tuần này lấy từ Google Calendar?",
        "Ngày mai tôi có công việc nào?",
        "Mở lịch studio",
      ],
      parts: agenda.events.length > 0
        ? [buildCalendarTimelinePart(agenda.events, `Lịch ${range.label.toLowerCase()}`)]
        : undefined,
      actions: rawArgs.requested_action === "sync_google_calendar"
        ? agenda.events.filter((event) => event.source === "schedule").slice(0, 1).map((event) => ({
            id: `sync-google-${event.id}`,
            kind: "sync_google_calendar" as const,
            label: "Đồng bộ Google Calendar",
            target_id: event.id,
            conversation_id: context.conversationId,
            description: `Xếp lịch “${event.title}” vào hàng đợi đồng bộ Google Calendar.`,
            risk: "low" as const,
            requires_approval: true,
          }))
        : undefined,
      visual_schema_version: 1,
    },
  };
}

type ContractLookupRow = {
  id: string;
  contract_code: string | null;
  contract_date: string | null;
  work_date: string | null;
  status: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  remaining_amount: number | null;
  customers:
    | {
        full_name: string | null;
        phone: string | null;
      }
    | {
        full_name: string | null;
        phone: string | null;
      }[]
    | null;
};

type EventRow = {
  id: string;
  contract_id: string | null;
  title: string | null;
  event_type: string | null;
  event_date: string | null;
  start_time: string | null;
  location: string | null;
  status: string | null;
};

type ServiceRow = {
  id: string;
  service_code: string | null;
  name: string | null;
  service_type: string | null;
  selling_price: number | null;
  status: string | null;
};

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.success) throw new Error(result.error);
  return result.data;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/:-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatCurrency(value: number | null | undefined) {
  return `${Math.round(value || 0).toLocaleString("vi-VN")} VND`;
}

function formatPercent(value: number | null | undefined) {
  return `${Number(value || 0).toLocaleString("vi-VN")}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function extractKeyword(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

function toInteger(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : undefined;
}

function buildPermissionDeniedResult(
  role: Role,
  skillId: MoodieSkillId,
  skillLabel: string,
): MoodieToolExecution {
  const followUps = getMoodieDefaultSuggestions(role).slice(0, 4);

  return {
    result: {
      error: `Vai trò ${role} không được truy cập dữ liệu cho yêu cầu này.`,
      allowed_prompts: followUps,
    },
    metadata: {
      skill_id: skillId,
      skill_label: skillLabel,
      note: "permission_denied",
      follow_ups: followUps,
    },
  };
}

function buildSources(items: MoodieMessageSource[]) {
  return items.filter((item) => item.label);
}

function buildReportFilters(rawArgs: Record<string, unknown>): ReportFiltersInput {
  const today = getTodayInTimeZone();
  const currentMonth = Number(today.slice(5, 7));
  const currentYear = Number(today.slice(0, 4));
  const periodType = rawArgs.period_type;
  const month = toInteger(rawArgs.month) || currentMonth;
  const year = toInteger(rawArgs.year) || currentYear;
  const quarter = toInteger(rawArgs.quarter);

  if (periodType === "quarter" && quarter && quarter >= 1 && quarter <= 4) {
    return { periodType: "quarter", quarter, year };
  }

  if (periodType === "year") {
    return { periodType: "year", year };
  }

  return {
    periodType: "month",
    month: Math.max(1, Math.min(12, month)),
    year,
  };
}

function getScheduleRange(rawArgs: Record<string, unknown>) {
  const base = new Date(`${getTodayInTimeZone()}T00:00:00`);
  const range = typeof rawArgs.range === "string" ? rawArgs.range : "3days";
  const days = Math.max(1, Math.min(14, toInteger(rawArgs.days) || 3));

  if (range === "tomorrow") {
    const tomorrow = new Date(base);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const iso = tomorrow.toISOString().slice(0, 10);
    return { start: iso, end: iso, label: "Ngày mai" };
  }

  if (range === "week") {
    const end = new Date(base);
    end.setDate(end.getDate() + 6);
    return {
      start: base.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      label: "7 ngày tới",
    };
  }

  if (range === "today") {
    const iso = base.toISOString().slice(0, 10);
    return { start: iso, end: iso, label: "Hôm nay" };
  }

  const end = new Date(base);
  end.setDate(end.getDate() + days - 1);
  return {
    start: base.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: `${days} ngày tới`,
  };
}

function scoreNormalizedMatch(needle: string, haystack: string) {
  if (!needle) return true;
  return normalizeText(haystack).includes(needle);
}

function toKpiWidget(title: string, items: MoodieKpiCardItem[]): MoodieWidget {
  return {
    type: "kpi_cards",
    title,
    items,
  };
}

function toProgressWidget(title: string, items: MoodieProgressBarItem[]): MoodieWidget {
  return {
    type: "progress_bars",
    title,
    items,
  };
}

function toComparisonWidget(title: string, items: MoodieComparisonBarItem[]): MoodieWidget {
  return {
    type: "comparison_bars",
    title,
    items,
  };
}

function buildBraveTool(mode: BraveResearchMode, name: "search_web" | "search_news" | "search_local", description: string): MoodieTool {
  return {
    definition: {
      type: "function",
      function: {
        name,
        description,
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Truy vấn công khai đã loại dữ liệu riêng tư của Studio." },
            count: { type: "number", description: "Số nguồn cần lấy, từ 1 đến 8." },
          },
          required: ["query"],
        },
      },
    },
    async execute(context, rawArgs) {
      const query = optionalString(rawArgs.query);
      if (!query) throw new Error("Brave Search thiếu query");
      const count = Math.max(1, Math.min(8, toInteger(rawArgs.count) || 6));
      const research = await researchWithBrave({ query, mode, count, userId: context.userId });
      if (research.sources.length === 0) throw new Error(research.warnings[0] || "Brave không trả về nguồn hợp lệ");
      return {
        result: {
          query: research.query,
          retrieved_at: research.sources[0]?.retrievedAt,
          source_count: research.sources.length,
          sources: research.sources.map((source, index) => ({
            index: index + 1,
            title: source.title,
            url: source.url,
            snippet: source.snippet,
            published_at: source.publishedAt,
            retrieved_at: source.retrievedAt,
          })),
        },
        metadata: {
          skill_label: mode === "news" ? "Brave News Search" : mode === "local" ? "Brave Local Search" : "Brave Web Search",
          note: "external_research_verified",
          sources: research.sources.map((source) => ({
            label: source.title,
            value: source.url,
            hint: source.snippet,
            kind: "web" as const,
            metadata: {
              provider: source.provider,
              retrieved_at: source.retrievedAt,
              ...(source.publishedAt ? { published_at: source.publishedAt } : {}),
            },
          })),
        },
      };
    },
  };
}

const moodieTools: Record<string, MoodieTool> = {
  start_deep_research: {
    definition: {
      type: "function",
      function: {
        name: "start_deep_research",
        description: "Khởi tạo một tác vụ nghiên cứu nền bền vững cho báo cáo sâu, so sánh nhiều nguồn hoặc yêu cầu nhiều truy vấn. Trả về run id ngay để cuộc trò chuyện không bị chặn.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Mục tiêu nghiên cứu công khai đã loại dữ liệu riêng tư." },
            mode: { type: "string", enum: ["web", "news", "local"] },
            title: { type: "string", description: "Tên ngắn của tác vụ nghiên cứu." },
          },
          required: ["query"],
        },
      },
    },
    async execute(context, rawArgs) {
      if (!context.userId) throw new Error("Deep research cần user session hợp lệ");
      const query = optionalString(rawArgs.query);
      if (!query) throw new Error("Deep research thiếu query");
      const mode = rawArgs.mode === "news" || rawArgs.mode === "local" ? rawArgs.mode : "web";
      const title = optionalString(rawArgs.title) || `Nghiên cứu: ${query.slice(0, 80)}`;
      const proposed = await proposeMoodieRun({
        supabase: context.supabase,
        userId: context.userId,
        conversationId: context.conversationId,
        kind: "research",
        title,
        toolName: "start_deep_research",
        readOnly: true,
        request: { query, mode },
        idempotencyKey: `text-research:${context.conversationId || "none"}:${Buffer.from(query).toString("base64url").slice(0, 80)}`,
      });

      after(async () => {
        const [{ createAdminClient }, { claimSpecificMoodieAgentRun }, { executeMoodieAgentRun }] = await Promise.all([
          import("@/lib/supabase/server"),
          import("@/lib/moodie/runs/worker"),
          import("@/lib/moodie/runs/executor"),
        ]);
        const admin = await createAdminClient();
        const run = await claimSpecificMoodieAgentRun({
          supabase: admin,
          runId: proposed.run.id,
          workerId: `text-after:${crypto.randomUUID()}`,
          leaseSeconds: 90,
        });
        if (run) await executeMoodieAgentRun({ supabase: admin, run });
      });

      return {
        result: {
          run_id: proposed.run.id,
          status: proposed.run.status,
          title: proposed.run.title,
          message: "Tác vụ nghiên cứu đã được đưa vào nền. Có thể tiếp tục trò chuyện và theo dõi tiến độ.",
        },
        metadata: {
          skill_label: "Deep Research",
          note: "background_research_started",
          background_runs: [{ id: proposed.run.id, kind: "research" as const, title: proposed.run.title, status: proposed.run.status }],
        },
      };
    },
  },
  search_web: buildBraveTool("web", "search_web", "Tìm nguồn web bên ngoài cho thông tin hiện tại, mới nhất hoặc khi người dùng yêu cầu kiểm chứng/citation."),
  search_news: buildBraveTool("news", "search_news", "Tìm tin tức và thông báo mới từ các nguồn bên ngoài qua Brave Search."),
  search_local: buildBraveTool("local", "search_local", "Tìm địa điểm hoặc kết quả địa phương bên ngoài qua Brave Search."),
  get_financial_summary: {
    definition: {
      type: "function",
      function: {
        name: "get_financial_summary",
        description: "Lấy tổng quan tài chính studio theo tháng, quý hoặc năm.",
        parameters: {
          type: "object",
          properties: {
            period_type: {
              type: "string",
              enum: ["month", "quarter", "year"],
              description: "Loại kỳ báo cáo cần xem.",
            },
            month: {
              type: "number",
              description: "Tháng cần xem nếu dùng period_type = month.",
            },
            quarter: {
              type: "number",
              description: "Quý cần xem nếu dùng period_type = quarter.",
            },
            year: {
              type: "number",
              description: "Năm của kỳ báo cáo.",
            },
          },
        },
      },
    },
    async execute(context, rawArgs) {
      if (!canAccess(context.role, "finance")) {
        return buildPermissionDeniedResult(context.role, "financial_summary", "Tài chính tổng quan");
      }

      const filters = buildReportFilters(rawArgs);
      const range = getReportRange(filters);
      const { data: snapshotData, error: snapshotError } = await context.supabase.rpc("finance_reports_snapshot", {
        p_start_date: range.startDate,
        p_end_date: range.endDate,
      });
      if (snapshotError) throw new Error(`Không thể tải báo cáo tài chính: ${snapshotError.message}`);
      const snapshotRecord = snapshotData && typeof snapshotData === "object" && !Array.isArray(snapshotData)
        ? snapshotData as Record<string, unknown> : {};
      const summaryRaw = snapshotRecord.summary && typeof snapshotRecord.summary === "object"
        ? snapshotRecord.summary as Record<string, unknown> : {};
      const serviceDistribution = Array.isArray(snapshotRecord.serviceDistribution) ? snapshotRecord.serviceDistribution : [];
      const topServices = serviceDistribution.slice(0, 5).map((item) => item && typeof item === "object" ? item as Record<string, unknown> : {});
      const snapshot = {
        range,
        summary: {
          totalRevenue: Number(summaryRaw.totalRevenue) || 0,
          totalCost: Number(summaryRaw.totalCost) || 0,
          netProfit: Number(summaryRaw.netProfit) || 0,
          profitMargin: Number(summaryRaw.profitMargin) || 0,
          totalContracts: Number(summaryRaw.totalContracts) || 0,
          completedContracts: Number(summaryRaw.completedContracts) || 0,
          addonRevenue: Number(summaryRaw.addonRevenue) || 0,
          addonPercentage: Number(summaryRaw.addonPercentage) || 0,
          avgContractValue: Number(summaryRaw.avgContractValue) || 0,
          salaryCost: Number(summaryRaw.salaryCost) || 0,
        },
      };
      const summary = snapshot.summary;

      return {
        result: {
          period: snapshot.range.label,
          total_revenue: summary.totalRevenue,
          total_cost: summary.totalCost,
          net_profit: summary.netProfit,
          profit_margin: summary.profitMargin,
          total_contracts: summary.totalContracts,
          completed_contracts: summary.completedContracts,
          addon_revenue: summary.addonRevenue,
          addon_percentage: summary.addonPercentage,
          top_services: topServices.map((item) => ({
            name: typeof item.name === "string" ? item.name : "Khác",
            revenue: Number(item.revenue) || 0,
            contracts: Number(item.value) || 0,
          })),
        },
        metadata: {
          skill_id: "financial_summary",
          skill_label: "Tài chính tổng quan",
          sources: buildSources([
            { label: "Kỳ báo cáo", value: snapshot.range.label },
            { label: "Giá trị TB / HĐ", value: formatCurrency(summary.avgContractValue) },
            { label: "Chi phí lương", value: formatCurrency(summary.salaryCost) },
          ]),
          follow_ups: [
            "Công nợ hiện tại thế nào?",
            "Những hợp đồng nào còn phải thu?",
            "Tiến độ các mục tiêu tài chính ra sao?",
          ],
          widgets: [
            toKpiWidget("Tổng quan tài chính", [
              { label: "Doanh thu", value: formatCurrency(summary.totalRevenue), tone: "positive" },
              { label: "Tổng chi", value: formatCurrency(summary.totalCost), tone: "warning" },
              {
                label: "Lợi nhuận ròng",
                value: formatCurrency(summary.netProfit),
                tone: summary.netProfit >= 0 ? "positive" : "danger",
              },
              { label: "Biên lợi nhuận", value: formatPercent(summary.profitMargin) },
            ]),
            ...(topServices.length > 0
              ? [
                  toComparisonWidget(
                    "Danh mục doanh thu nổi bật",
                    topServices.map((item) => ({
                      label: typeof item.name === "string" ? item.name : "Khác",
                      value: Number(item.revenue) || 0,
                      value_label: formatCurrency(Number(item.revenue) || 0),
                      secondary_value: Number(item.value) || 0,
                      secondary_label: "HD",
                    })),
                  ),
                ]
              : []),
          ],
        },
      };
    },
  },
  get_debt_summary: {
    definition: {
      type: "function",
      function: {
        name: "get_debt_summary",
        description: "Lấy tổng hợp công nợ, nợ quá hạn và nhóm tuổi nợ.",
        parameters: { type: "object", properties: {} },
      },
    },
    async execute(context) {
      if (!canAccess(context.role, "finance")) {
        return buildPermissionDeniedResult(context.role, "debt_summary", "Công nợ");
      }

      const { data: debtData, error: debtError } = await context.supabase.rpc("finance_debt_stats");
      if (debtError) throw new Error(`Không thể tải công nợ: ${debtError.message}`);
      const debtRow = Array.isArray(debtData) ? debtData[0] : debtData;
      const debtRecord = debtRow && typeof debtRow === "object" ? debtRow as Record<string, unknown> : {};
      const agingRaw = debtRecord.aging && typeof debtRecord.aging === "object" ? debtRecord.aging as Record<string, unknown> : {};
      const stats = {
        receivable: Number(debtRecord.receivable) || 0,
        payable: Number(debtRecord.payable) || 0,
        overdue: Number(debtRecord.overdue) || 0,
        net_debt: Number(debtRecord.net_debt) || 0,
        aging: {
          not_due: Number(agingRaw.not_due) || 0,
          days_1_30: Number(agingRaw.days_1_30) || 0,
          days_31_60: Number(agingRaw.days_31_60) || 0,
          days_61_90: Number(agingRaw.days_61_90) || 0,
          over_90: Number(agingRaw.over_90) || 0,
        },
      };
      const agingEntries = [
        { label: "Chưa đến hạn", value: stats.aging.not_due },
        { label: "1-30 ngày", value: stats.aging.days_1_30 },
        { label: "31-60 ngày", value: stats.aging.days_31_60 },
        { label: "61-90 ngày", value: stats.aging.days_61_90 },
        { label: "> 90 ngày", value: stats.aging.over_90 },
      ].filter((item) => item.value > 0);

      return {
        result: {
          receivable: stats.receivable,
          payable: stats.payable,
          overdue: stats.overdue,
          net_debt: stats.net_debt,
          aging: stats.aging,
        },
        metadata: {
          skill_id: "debt_summary",
          skill_label: "Công nợ",
          sources: buildSources([
            { label: "Phải thu", value: formatCurrency(stats.receivable), kind: "database", entity_type: "debt_metric", entity_id: "receivable", metadata: { amount: stats.receivable } },
            { label: "Phải trả", value: formatCurrency(stats.payable), kind: "database", entity_type: "debt_metric", entity_id: "payable", metadata: { amount: stats.payable } },
            { label: "Quá hạn", value: formatCurrency(stats.overdue), kind: "database", entity_type: "debt_metric", entity_id: "overdue", metadata: { amount: stats.overdue } },
          ]),
          follow_ups: [
            "Những hợp đồng nào còn phải thu?",
            "Tài chính tổng quan tháng này ra sao?",
          ],
          widgets: [
            toKpiWidget("Công nợ hiện tại", [
              { label: "Phải thu", value: formatCurrency(stats.receivable), tone: "positive" },
              { label: "Phải trả", value: formatCurrency(stats.payable), tone: "warning" },
              { label: "Quá hạn", value: formatCurrency(stats.overdue), tone: "danger" },
              {
                label: "Nợ ròng",
                value: formatCurrency(stats.net_debt),
                tone: stats.net_debt >= 0 ? "warning" : "positive",
              },
            ]),
            ...(agingEntries.length > 0
              ? [
                  toComparisonWidget(
                    "Nhóm tuổi nợ",
                    agingEntries.map((item) => ({
                      label: item.label,
                      value: item.value,
                      value_label: formatCurrency(item.value),
                      tone: item.label === "> 90 ngày" ? "danger" : item.label === "1-30 ngày" ? "warning" : "default",
                    })),
                  ),
                ]
              : []),
          ],
        },
      };
    },
  },
  get_pending_collections: {
    definition: {
      type: "function",
      function: {
        name: "get_pending_collections",
        description: "Lấy danh sách hợp đồng còn tiền cần thu.",
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Số hợp đồng tối đa cần trả về.",
            },
          },
        },
      },
    },
    async execute(context, rawArgs) {
      if (!canAccess(context.role, "finance")) {
        return buildPermissionDeniedResult(context.role, "pending_collections", "Danh sách cần thu");
      }

      const limit = Math.max(1, Math.min(8, toInteger(rawArgs.limit) || 5));
      const { data: collectionRows, error: collectionError } = await context.supabase
        .from("contracts")
        .select("id, contract_code, remaining_amount, contract_date, status, customers(id, full_name, phone)")
        .gt("remaining_amount", 0).is("deleted_at", null)
        .order("contract_date", { ascending: false }).limit(limit);
      if (collectionError) throw new Error(`Không thể tải danh sách cần thu: ${collectionError.message}`);
      const items = (collectionRows || []).map((item) => {
        const customerValue = Array.isArray(item.customers) ? item.customers[0] : item.customers;
        const customer = customerValue && typeof customerValue === "object" ? customerValue as { full_name?: string | null } : null;
        return {
          id: item.id,
          contract_code: item.contract_code,
          remaining_amount: Number(item.remaining_amount) || 0,
          status: item.status,
          customers: customer ? { full_name: customer.full_name || null } : null,
        };
      });

      return {
        result: {
          total: items.length,
          items: items.map((item) => ({
            contract_code: item.contract_code || item.id,
            customer_name: item.customers?.full_name || "Khách chưa rõ",
            remaining_amount: item.remaining_amount || 0,
            status: item.status,
          })),
        },
        metadata: {
          skill_id: "pending_collections",
          skill_label: "Danh sách cần thu",
          sources: buildSources([{ label: "Số hợp đồng", value: String(items.length) }]),
          follow_ups: [
            "Công nợ hiện tại thế nào?",
            "Tra cứu hợp đồng của khách Lan",
          ],
          widgets:
            items.length > 0
              ? [
                  toComparisonWidget(
                    "Khoản cần thu nổi bật",
                    items.map((item) => ({
                      label: item.contract_code || item.id,
                      value: item.remaining_amount || 0,
                      value_label: formatCurrency(item.remaining_amount || 0),
                      hint: item.customers?.full_name || "Khách chưa rõ",
                      tone: "warning",
                    })),
                  ),
                ]
              : undefined,
        },
      };
    },
  },
  search_contracts: {
    definition: {
      type: "function",
      function: {
        name: "search_contracts",
        description: "Tìm hợp đồng theo mã, tên khách hoặc trạng thái thanh toán.",
        parameters: {
          type: "object",
          properties: {
            keyword: {
              type: "string",
              description: "Mã hợp đồng, tên khách hoặc số điện thoại gần đúng.",
            },
            status: {
              type: "string",
              description: "Trạng thái hợp đồng nếu cần lọc thêm.",
            },
          },
        },
      },
    },
    async execute(context, rawArgs) {
      if (!canAccess(context.role, "contracts")) {
        return buildPermissionDeniedResult(context.role, "contract_lookup", "Tra cứu hợp đồng");
      }

      const keyword = normalizeText(extractKeyword(rawArgs.keyword));
      const status = extractKeyword(rawArgs.status).toLowerCase();
      const { data, error } = await context.supabase
        .from("contracts")
        .select("id, contract_code, contract_date, work_date, status, total_amount, paid_amount, remaining_amount, customers(full_name, phone)")
        .is("deleted_at", null)
        .order("contract_date", { ascending: false })
        .limit(24);

      if (error) throw new Error(`Không thể tra cứu hợp đồng: ${error.message}`);

      const rows = ((data || []) as ContractLookupRow[])
        .filter((row) => {
          const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
          const haystack = [
            row.contract_code || "",
            customer?.full_name || "",
            customer?.phone || "",
            row.status || "",
          ].join(" ");

          if (status && (row.status || "").toLowerCase() !== status) return false;
          return scoreNormalizedMatch(keyword, haystack);
        })
        .slice(0, 6);

      return {
        result: {
          total: rows.length,
          contracts: rows.map((row) => {
            const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
            return {
              id: row.id,
              contract_code: row.contract_code,
              customer_name: customer?.full_name || "Khách chưa rõ",
              phone: customer?.phone,
              contract_date: row.contract_date,
              work_date: row.work_date,
              status: row.status,
              total_amount: row.total_amount,
              paid_amount: row.paid_amount,
              remaining_amount: row.remaining_amount,
            };
          }),
        },
        metadata: {
          skill_id: "contract_lookup",
          skill_label: "Tra cứu hợp đồng",
          sources: buildSources(rows.map((row) => ({
            label: row.contract_code || "Hợp đồng",
            value: formatCurrency(row.remaining_amount || 0),
            hint: "Số tiền còn phải thu",
            kind: "database" as const,
            entity_type: "contract",
            entity_id: row.id,
            href: `/contracts/${row.id}`,
          }))),
          follow_ups: [
            "Những hợp đồng nào còn phải thu?",
            "Lịch hôm nay có gì?",
          ],
        },
      };
    },
  },
  get_calendar_agenda: {
    definition: {
      type: "function",
      function: {
        name: "get_calendar_agenda",
        description: "Read the unified studio, Google Calendar, and task agenda for a requested date range.",
        parameters: {
          type: "object",
          properties: {
            range: { type: "string", enum: ["today", "tomorrow", "week", "3days"] },
            days: { type: "number" },
            include_google: { type: "boolean" },
            include_tasks: { type: "boolean" },
            limit: { type: "number" },
            requested_action: { type: "string", enum: ["sync_google_calendar"] },
          },
        },
      },
    },
    execute: executeCalendarAgenda,
  },
  get_upcoming_schedules: {
    definition: {
      type: "function",
      function: {
        name: "get_upcoming_schedules",
        description: "Lấy lịch sự kiện sắp tới theo ngày, ngày mai hoặc 7 ngày tới.",
        parameters: {
          type: "object",
          properties: {
            range: {
              type: "string",
              enum: ["today", "tomorrow", "week", "3days"],
              description: "Khung lịch cần xem.",
            },
            days: {
              type: "number",
              description: "Số ngày tới cần xem nếu range = 3days.",
            },
          },
        },
      },
    },
    async execute(context, rawArgs) {
      return executeCalendarAgenda(context, rawArgs);
      /* Legacy implementation retained below temporarily for reference.
      if (!canAccess(context.role, "calendar")) {
        return buildPermissionDeniedResult(context.role, "schedule_summary", "Lịch sắp tới");
      }

      const range = getScheduleRange(rawArgs);
      const { data, error } = await context.supabase
        .from("contract_events")
        .select("id, contract_id, title, event_type, event_date, start_time, location, status")
        .gte("event_date", range.start)
        .lte("event_date", range.end)
        .order("event_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(12);

      if (error) throw new Error(`Không thể tải lịch: ${error.message}`);

      const events = (data || []) as EventRow[];
      const contractIds = Array.from(new Set(events.map((event) => event.contract_id).filter(Boolean))) as string[];
      const contractMap = new Map<string, { contract_code: string | null; customer_name: string | null }>();

      if (contractIds.length > 0) {
        const { data: contracts, error: contractError } = await context.supabase
          .from("contracts")
          .select("id, contract_code, customers(full_name)")
          .in("id", contractIds);

        if (contractError) throw new Error(`Không thể tải hợp đồng liên quan đến lịch: ${contractError.message}`);

        for (const contract of contracts || []) {
          const customerRaw = contract.customers;
          const customer = Array.isArray(customerRaw) ? customerRaw[0] : customerRaw;
          contractMap.set(contract.id, {
            contract_code: contract.contract_code || null,
            customer_name: customer?.full_name || null,
          });
        }
      }

      return {
        result: {
          range: range.label,
          total: events.length,
          events: events.map((event) => {
            const contract = event.contract_id ? contractMap.get(event.contract_id) : null;
            return {
              id: event.id,
              title: event.title || event.event_type || "Sự kiện",
              event_date: event.event_date,
              start_time: event.start_time,
              location: event.location,
              status: event.status,
              contract_code: contract?.contract_code || null,
              customer_name: contract?.customer_name || null,
            };
          }),
        },
        metadata: {
          skill_id: "schedule_summary",
          skill_label: "Lịch sắp tới",
          sources: buildSources([
            { label: "Khung thời gian", value: range.label },
            { label: "Sự kiện", value: String(events.length) },
          ]),
          follow_ups: [
            "Ngày mai ê-kíp có lịch nào?",
            "Tìm hợp đồng của khách Lan",
          ],
        },
      };
      */
    },
  },
  get_contract_delivery_assets: {
    definition: {
      type: "function",
      function: {
        name: "get_contract_delivery_assets",
        description: "Summarize synchronized gallery albums, selected images, retouch progress, and delivery date for a contract.",
        parameters: {
          type: "object",
          properties: {
            contract_id: { type: "string" },
            contract_code: { type: "string" },
            customer_query: { type: "string" },
            requested_action: { type: "string", enum: ["sync_drive_gallery", "refresh_gallery_share"] },
          },
        },
      },
    },
    async execute(context, rawArgs) {
      if (!canAccess(context.role, "contracts")) {
        return buildPermissionDeniedResult(context.role, "gallery_delivery", "Tiến độ gallery");
      }
      const contract = await resolveGalleryToolContract(context, rawArgs);
      if (!contract) {
        return {
          result: { found: false, error: "Không tìm thấy hợp đồng phù hợp." },
          metadata: { skill_id: "gallery_delivery", skill_label: "Tiến độ gallery" },
        };
      }
      const assets = await loadMoodieDeliveryAssets(context.supabase, contract.id);
      const contractCode = contract.contract_code || contract.id;
      return {
        result: {
          found: true,
          contract: { id: contract.id, contract_code: contract.contract_code, customer_name: customerNameForTool(contract) },
          album_count: assets.galleries.length,
          selected_count: assets.selectedCount,
          edited_count: assets.editedCount,
          progress_percent: assets.progress,
          delivery_date: assets.deliveryDate,
          galleries: assets.galleries.map((gallery) => ({
            id: gallery.id,
            title: gallery.title,
            status: gallery.status,
            folder_type: gallery.folder_type,
            image_count: gallery.total,
            selected_count: gallery.selected,
          })),
        },
        metadata: {
          skill_id: "gallery_delivery",
          skill_label: "Tiến độ gallery",
          sources: buildSources([
            { label: "Hợp đồng", value: contractCode },
            { label: "Album đã đồng bộ", value: String(assets.galleries.length) },
            { label: "Tiến độ hậu kỳ", value: `${assets.progress}%` },
          ]),
          follow_ups: ["Cho tôi xem ảnh đã chọn của hợp đồng này.", "Mở gallery của hợp đồng này."],
          parts: buildDeliveryAssetParts({ contractCode, assets }),
          actions: assets.galleries.length > 0 && (rawArgs.requested_action === "sync_drive_gallery" || rawArgs.requested_action === "refresh_gallery_share")
            ? [{
                id: `${rawArgs.requested_action}-${assets.galleries[0].id}`,
                kind: rawArgs.requested_action,
                label: rawArgs.requested_action === "sync_drive_gallery" ? "Đồng bộ lại Drive" : "Tạo hoặc làm mới link trả ảnh",
                target_id: assets.galleries[0].id,
                conversation_id: context.conversationId,
                description: rawArgs.requested_action === "sync_drive_gallery"
                  ? "Đọc lại thư mục Drive và cập nhật danh sách ảnh đã đồng bộ."
                  : "Tạo hoặc làm mới liên kết gallery dùng để trả ảnh cho khách.",
                risk: rawArgs.requested_action === "sync_drive_gallery" ? "low" : "medium",
                requires_approval: true,
              }]
            : undefined,
          visual_schema_version: 1,
        },
      };
    },
  },
  list_contract_gallery_images: {
    definition: {
      type: "function",
      function: {
        name: "list_contract_gallery_images",
        description: "List safe synchronized gallery thumbnails for a contract without exposing Drive URLs, tokens, passwords, or original files.",
        parameters: {
          type: "object",
          properties: {
            contract_id: { type: "string" },
            contract_code: { type: "string" },
            customer_query: { type: "string" },
            gallery_id: { type: "string" },
            selected_only: { type: "boolean" },
            limit: { type: "number" },
          },
        },
      },
    },
    async execute(context, rawArgs) {
      if (!canAccess(context.role, "contracts")) {
        return buildPermissionDeniedResult(context.role, "gallery_images", "Ảnh gallery");
      }
      const contract = await resolveGalleryToolContract(context, rawArgs);
      if (!contract) {
        return {
          result: { found: false, error: "Không tìm thấy hợp đồng phù hợp." },
          metadata: { skill_id: "gallery_images", skill_label: "Ảnh gallery" },
        };
      }
      const selectedOnly = rawArgs.selected_only === true;
      const limit = Math.max(1, Math.min(12, toInteger(rawArgs.limit) || 12));
      const gallery = await loadMoodieGalleryImages(context.supabase, {
        contractId: contract.id,
        galleryId: optionalString(rawArgs.gallery_id),
        selectedOnly,
        limit,
      });
      const contractCode = contract.contract_code || contract.id;
      return {
        result: {
          found: true,
          contract: { id: contract.id, contract_code: contract.contract_code, customer_name: customerNameForTool(contract) },
          total: gallery.total,
          displayed: gallery.images.length,
          selected_only: selectedOnly,
          images: gallery.images.map((image) => ({
            id: image.id,
            gallery_id: image.gallery_id,
            file_name: image.file_name,
            selected: image.is_selected,
            starred: image.is_starred,
          })),
        },
        metadata: {
          skill_id: "gallery_images",
          skill_label: "Ảnh gallery",
          sources: buildSources([
            { label: "Hợp đồng", value: contractCode },
            { label: "Ảnh phù hợp", value: String(gallery.total) },
          ]),
          follow_ups: ["Ảnh đã sửa được bao nhiêu phần trăm?", "Mở gallery của hợp đồng này."],
          parts: [buildGalleryPart({ contractId: contract.id, contractCode, selectedOnly, result: gallery })],
          visual_schema_version: 1,
        },
      };
    },
  },
  get_team_summary: {
    definition: {
      type: "function",
      function: {
        name: "get_team_summary",
        description: "Lấy tình hình nhân sự đang hoạt động và số công việc quá hạn.",
        parameters: { type: "object", properties: {} },
      },
    },
    async execute(context) {
      if (!canAccess(context.role, "employees")) {
        return buildPermissionDeniedResult(context.role, "team_summary", "Nhân sự và tiến độ");
      }

      const today = getTodayInTimeZone();
      const [employeesResult, tasksResult] = await Promise.all([
        context.supabase
          .from("employees")
          .select("id, department, role, status")
          .eq("status", "active")
          .is("deleted_at", null),
        context.supabase
          .from("work_tasks")
          .select("id, deadline, status")
          .lt("deadline", today),
      ]);

      if (employeesResult.error) throw new Error(`Không thể tải nhân sự: ${employeesResult.error.message}`);
      if (tasksResult.error) throw new Error(`Không thể tải công việc nhân sự: ${tasksResult.error.message}`);

      const activeEmployees = employeesResult.data || [];
      const overdueTasks = (tasksResult.data || []).filter(
        (task) => task.status !== "hoan_thanh" && task.status !== "da_huy",
      );
      const departments = new Set(activeEmployees.map((employee) => employee.department).filter(Boolean));

      return {
        result: {
          active_employees: activeEmployees.length,
          active_departments: departments.size,
          overdue_tasks: overdueTasks.length,
        },
        metadata: {
          skill_id: "team_summary",
          skill_label: "Nhân sự và tiến độ",
          sources: buildSources([
            { label: "Nhân sự hoạt động", value: String(activeEmployees.length) },
            { label: "Công việc trễ", value: String(overdueTasks.length) },
          ]),
          follow_ups: [
            "Lịch hôm nay có gì?",
            "Tài chính tổng quan tháng này",
          ],
          widgets: [
            toKpiWidget("Vận hành nhân sự", [
              { label: "Nhân sự hoạt động", value: String(activeEmployees.length) },
              { label: "Phòng ban", value: String(departments.size) },
              {
                label: "Công việc quá hạn",
                value: String(overdueTasks.length),
                tone: overdueTasks.length > 0 ? "warning" : "positive",
              },
            ]),
          ],
        },
      };
    },
  },
  get_overdue_tasks: {
    definition: {
      type: "function",
      function: {
        name: "get_overdue_tasks",
        description: "Lấy chi tiết các công việc đang quá hạn, người phụ trách và hợp đồng liên quan để xác định hành động cụ thể.",
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Số công việc tối đa, mặc định 10 và tối đa 25.",
            },
          },
        },
      },
    },
    async execute(context, rawArgs) {
      if (!canAccess(context.role, "employees")) {
        return buildPermissionDeniedResult(context.role, "overdue_tasks", "Công việc quá hạn");
      }

      const today = getTodayInTimeZone();
      const limit = Math.max(1, Math.min(25, toInteger(rawArgs.limit) || 10));
      const { data, error } = await context.supabase
        .from("work_tasks")
        .select("id, work_type, status, deadline, assigned_to, contract_id, notes, employees(full_name, department), contracts(contract_code)")
        .lt("deadline", today)
        .not("status", "in", '("hoan_thanh","da_huy")')
        .order("deadline", { ascending: true })
        .limit(limit);
      if (error) throw new Error(`Không thể tải chi tiết công việc quá hạn: ${error.message}`);

      const tasks = (data || []).map((task) => {
        const employee = Array.isArray(task.employees) ? task.employees[0] : task.employees;
        const contract = Array.isArray(task.contracts) ? task.contracts[0] : task.contracts;
        const dueAt = task.deadline ? new Date(`${task.deadline}T00:00:00Z`).getTime() : Date.now();
        const todayAt = new Date(`${today}T00:00:00Z`).getTime();
        return {
          id: task.id,
          work_type: task.work_type,
          status: task.status,
          deadline: task.deadline,
          days_overdue: Math.max(1, Math.floor((todayAt - dueAt) / 86_400_000)),
          assignee_id: task.assigned_to,
          assignee_name: employee?.full_name || null,
          department: employee?.department || null,
          contract_id: task.contract_id,
          contract_code: contract?.contract_code || null,
          notes: task.notes,
        };
      });

      return {
        result: { total: tasks.length, tasks },
        metadata: {
          skill_id: "overdue_tasks",
          skill_label: "Công việc quá hạn",
          sources: buildSources([
            { label: "Công việc quá hạn", value: String(tasks.length) },
            { label: "Chưa có người phụ trách", value: String(tasks.filter((task) => !task.assignee_id).length) },
          ]),
          parts: tasks.length > 0 ? [{
            type: "table",
            title: "Công việc quá hạn cần xử lý",
            columns: [
              { key: "work_type", label: "Công việc" },
              { key: "contract_code", label: "Hợp đồng" },
              { key: "assignee_name", label: "Phụ trách" },
              { key: "deadline", label: "Deadline", format: "date" },
              { key: "days_overdue", label: "Quá hạn", align: "right" },
            ],
            rows: tasks.map((task) => ({
              work_type: task.work_type,
              contract_code: task.contract_code || "Chưa có mã",
              assignee_name: task.assignee_name || "Chưa phân công",
              deadline: task.deadline,
              days_overdue: `${task.days_overdue} ngày`,
            })),
          }] : undefined,
          visual_schema_version: 1,
        },
      };
    },
  },
  get_services_catalog: {
    definition: {
      type: "function",
      function: {
        name: "get_services_catalog",
        description: "Tra cứu bảng giá và danh sách dịch vụ đang hoạt động.",
        parameters: {
          type: "object",
          properties: {
            keyword: {
              type: "string",
              description: "Tên gói, mã dịch vụ hoặc nhóm dịch vụ.",
            },
          },
        },
      },
    },
    async execute(context, rawArgs) {
      if (!canAccess(context.role, "services")) {
        return buildPermissionDeniedResult(context.role, "service_catalog", "Dịch vụ và bảng giá");
      }

      const keyword = normalizeText(extractKeyword(rawArgs.keyword));
      const { data, error } = await context.supabase
        .from("services")
        .select("id, service_code, name, service_type, selling_price, status")
        .eq("status", "active")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(32);

      if (error) throw new Error(`Không thể tải dịch vụ: ${error.message}`);

      const rows = ((data || []) as ServiceRow[])
        .filter((row) => {
          if (!keyword) return true;
          const haystack = `${row.name || ""} ${row.service_code || ""} ${row.service_type || ""}`;
          return scoreNormalizedMatch(keyword, haystack);
        })
        .slice(0, 8);

      return {
        result: {
          total: rows.length,
          services: rows.map((row) => ({
            id: row.id,
            service_code: row.service_code,
            name: row.name,
            service_type: row.service_type,
            selling_price: row.selling_price,
            status: row.status,
          })),
        },
        metadata: {
          skill_id: "service_catalog",
          skill_label: "Dịch vụ và bảng giá",
          sources: buildSources([{ label: "Dịch vụ", value: String(rows.length) }]),
          follow_ups: [
            "Giá gói baby là bao nhiêu?",
            "Tài chính tổng quan tháng này",
          ],
        },
      };
    },
  },
  get_financial_goals: {
    definition: {
      type: "function",
      function: {
        name: "get_financial_goals",
        description: "Lấy tiến độ mục tiêu tài chính và khả năng đóng góp trong tháng.",
        parameters: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["active", "completed", "cancelled"],
              description: "Lọc theo trạng thái mục tiêu nếu cần.",
            },
            limit: {
              type: "number",
              description: "Số mục tiêu tối đa cần trả về.",
            },
          },
        },
      },
    },
    async execute(context, rawArgs) {
      if (!canAccess(context.role, "finance")) {
        return buildPermissionDeniedResult(context.role, "goal_summary", "Mục tiêu tài chính");
      }

      const limit = Math.max(1, Math.min(6, toInteger(rawArgs.limit) || 4));
      const status = extractKeyword(rawArgs.status);

      const goalsPage = unwrap(
        await fetchGoals({
          page: 1,
          pageSize: limit,
          includeContributions: false,
        }),
      );
      const cashflow = unwrap(await fetchGoalsCashflow());
      const goals = goalsPage.items
        .filter((goal) => (status ? (goal.status || "").toLowerCase() === status.toLowerCase() : true))
        .slice(0, limit);

      const activeGoals = goals.filter((goal) => (goal.status || "").toLowerCase() === "active");
      const totalTarget = activeGoals.reduce((sum, goal) => sum + goal.target_amount, 0);
      const totalSaved = activeGoals.reduce((sum, goal) => sum + goal.current_amount, 0);
      const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

      return {
        result: {
          total: goals.length,
          overall_progress: overallProgress,
          available_for_goals: cashflow.availableForGoals,
          current_period: cashflow.currentPeriod,
          goals: goals.map((goal) => ({
            id: goal.id,
            name: goal.name,
            status: goal.status,
            deadline: goal.deadline,
            target_amount: goal.target_amount,
            current_amount: goal.current_amount,
            remaining: goal.remaining,
            progress_percent: goal.progress_percent,
            monthly_needed: goal.monthly_needed,
            months_left: goal.months_left,
          })),
        },
        metadata: {
          skill_id: "goal_summary",
          skill_label: "Mục tiêu tài chính",
          sources: buildSources([
            { label: "Kỳ hiện tại", value: cashflow.currentPeriod },
            { label: "Có thể dành cho mục tiêu", value: formatCurrency(cashflow.availableForGoals) },
            { label: "Tiến độ tổng", value: formatPercent(overallProgress) },
          ]),
          follow_ups: [
            "Tài chính tổng quan tháng này ra sao?",
            "Công nợ hiện tại thế nào?",
          ],
          widgets: [
            toKpiWidget("Dòng tiền cho mục tiêu", [
              { label: "Kỳ hiện tại", value: cashflow.currentPeriod },
              { label: "Dòng tiền ròng", value: formatCurrency(cashflow.netCashflow), tone: cashflow.netCashflow >= 0 ? "positive" : "danger" },
              { label: "Có thể dành cho mục tiêu", value: formatCurrency(cashflow.availableForGoals), tone: "positive" },
              { label: "Tiến độ tổng", value: formatPercent(overallProgress) },
            ]),
            ...(goals.length > 0
              ? [
                  toProgressWidget(
              "Tiến độ mục tiêu",
                    goals.map((goal) => ({
                      label: goal.name,
                      current: goal.current_amount,
                      target: goal.target_amount,
                      unit: "VND",
                      hint: goal.monthly_needed
                        ? `Cần thêm ${formatCurrency(goal.monthly_needed)}/tháng`
                        : goal.deadline
                          ? `Hạn chót ${formatDate(goal.deadline)}`
                          : undefined,
                      tone:
                        goal.progress_percent >= 100
                          ? "positive"
                          : goal.monthly_needed && cashflow.availableForGoals < goal.monthly_needed
                            ? "warning"
                            : "default",
                    })),
                  ),
                ]
              : []),
          ],
        },
      };
    },
  },
};

export function getMoodieToolDefinitions(options?: { allowedToolNames?: string[]; role?: Role }) {
  const allowedToolNames = options?.allowedToolNames ? new Set(options.allowedToolNames) : null;
  const canExpose = (name: string) => {
    if (allowedToolNames && !allowedToolNames.has(name)) return false;
    return options?.role ? canExposeMoodieTool(name, options.role) : true;
  };

  const businessTools = Object.values(moodieTools)
    .map((tool) => tool.definition)
    .filter((definition) => canExpose(definition.function.name));

  return businessTools;
}

export async function executeMoodieTool(
  name: string,
  context: MoodieToolContext,
  rawArgs: Record<string, unknown>,
) {
  const tool = moodieTools[name];
  if (!tool) {
    throw new Error(`Không nhận diện được công cụ Moodie: ${name}`);
  }

  return tool.execute(context, rawArgs);
}
