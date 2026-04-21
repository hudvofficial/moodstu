import type { SupabaseClient } from "@supabase/supabase-js";
import { getPendingCollections } from "@/app/actions/finance-dashboard-queries";
import { fetchDebtStats, fetchGoals, fetchGoalsCashflow } from "@/app/actions/finance-operations-queries";
import { getReportsSnapshot } from "@/app/actions/finance-reports-queries";
import { getTodayInTimeZone } from "@/lib/studio-date";
import { getMoodieDefaultSuggestions } from "@/lib/moodie/catalog";
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
  return `${Math.round(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatPercent(value: number | null | undefined) {
  return `${Number(value || 0).toLocaleString("vi-VN")}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Chua co";
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
      error: `Vai tro ${role} khong duoc truy cap du lieu cho yeu cau nay.`,
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
    return { start: iso, end: iso, label: "Ngay mai" };
  }

  if (range === "week") {
    const end = new Date(base);
    end.setDate(end.getDate() + 6);
    return {
      start: base.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      label: "7 ngay toi",
    };
  }

  if (range === "today") {
    const iso = base.toISOString().slice(0, 10);
    return { start: iso, end: iso, label: "Hom nay" };
  }

  const end = new Date(base);
  end.setDate(end.getDate() + days - 1);
  return {
    start: base.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: `${days} ngay toi`,
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

const moodieTools: Record<string, MoodieTool> = {
  get_financial_summary: {
    definition: {
      type: "function",
      function: {
        name: "get_financial_summary",
        description: "Lay tong quan tai chinh studio theo thang, quy hoac nam.",
        parameters: {
          type: "object",
          properties: {
            period_type: {
              type: "string",
              enum: ["month", "quarter", "year"],
              description: "Loai ky bao cao can xem.",
            },
            month: {
              type: "number",
              description: "Thang can xem neu dung period_type = month.",
            },
            quarter: {
              type: "number",
              description: "Quy can xem neu dung period_type = quarter.",
            },
            year: {
              type: "number",
              description: "Nam cua ky bao cao.",
            },
          },
        },
      },
    },
    async execute(context, rawArgs) {
      if (!canAccess(context.role, "finance")) {
        return buildPermissionDeniedResult(context.role, "financial_summary", "Tai chinh tong quan");
      }

      const snapshot = unwrap(await getReportsSnapshot(buildReportFilters(rawArgs)));
      const summary = snapshot.summary;
      const topServices = snapshot.serviceDistribution.slice(0, 5);

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
            name: item.name,
            revenue: item.revenue,
            contracts: item.value,
          })),
        },
        metadata: {
          skill_id: "financial_summary",
          skill_label: "Tai chinh tong quan",
          sources: buildSources([
            { label: "Ky bao cao", value: snapshot.range.label },
            { label: "Gia tri TB / HD", value: formatCurrency(summary.avgContractValue) },
            { label: "Chi phi luong", value: formatCurrency(summary.salaryCost) },
          ]),
          follow_ups: [
            "Cong no hien tai the nao?",
            "Nhung hop dong nao con phai thu?",
            "Tien do cac muc tieu tai chinh ra sao?",
          ],
          widgets: [
            toKpiWidget("Tong quan tai chinh", [
              { label: "Doanh thu", value: formatCurrency(summary.totalRevenue), tone: "positive" },
              { label: "Tong chi", value: formatCurrency(summary.totalCost), tone: "warning" },
              {
                label: "Loi nhuan rong",
                value: formatCurrency(summary.netProfit),
                tone: summary.netProfit >= 0 ? "positive" : "danger",
              },
              { label: "Bien loi nhuan", value: formatPercent(summary.profitMargin) },
            ]),
            ...(topServices.length > 0
              ? [
                  toComparisonWidget(
                    "Danh muc doanh thu noi bat",
                    topServices.map((item) => ({
                      label: item.name,
                      value: item.revenue,
                      value_label: formatCurrency(item.revenue),
                      secondary_value: item.value,
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
        description: "Lay tong hop cong no, no qua han va bucket tuoi no.",
        parameters: { type: "object", properties: {} },
      },
    },
    async execute(context) {
      if (!canAccess(context.role, "finance")) {
        return buildPermissionDeniedResult(context.role, "debt_summary", "Cong no");
      }

      const stats = unwrap(await fetchDebtStats());
      const agingEntries = [
        { label: "Chua den han", value: stats.aging.not_due },
        { label: "1-30 ngay", value: stats.aging.days_1_30 },
        { label: "31-60 ngay", value: stats.aging.days_31_60 },
        { label: "61-90 ngay", value: stats.aging.days_61_90 },
        { label: "> 90 ngay", value: stats.aging.over_90 },
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
          skill_label: "Cong no",
          sources: buildSources([
            { label: "Phai thu", value: formatCurrency(stats.receivable) },
            { label: "Phai tra", value: formatCurrency(stats.payable) },
            { label: "Qua han", value: formatCurrency(stats.overdue) },
          ]),
          follow_ups: [
            "Nhung hop dong nao con phai thu?",
            "Tai chinh tong quan thang nay ra sao?",
          ],
          widgets: [
            toKpiWidget("Cong no hien tai", [
              { label: "Phai thu", value: formatCurrency(stats.receivable), tone: "positive" },
              { label: "Phai tra", value: formatCurrency(stats.payable), tone: "warning" },
              { label: "Qua han", value: formatCurrency(stats.overdue), tone: "danger" },
              {
                label: "No rong",
                value: formatCurrency(stats.net_debt),
                tone: stats.net_debt >= 0 ? "warning" : "positive",
              },
            ]),
            ...(agingEntries.length > 0
              ? [
                  toComparisonWidget(
                    "Bucket tuoi no",
                    agingEntries.map((item) => ({
                      label: item.label,
                      value: item.value,
                      value_label: formatCurrency(item.value),
                      tone: item.label === "> 90 ngay" ? "danger" : item.label === "1-30 ngay" ? "warning" : "default",
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
        description: "Lay danh sach hop dong con tien can thu.",
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "So hop dong toi da can tra ve.",
            },
          },
        },
      },
    },
    async execute(context, rawArgs) {
      if (!canAccess(context.role, "finance")) {
        return buildPermissionDeniedResult(context.role, "pending_collections", "Danh sach can thu");
      }

      const limit = Math.max(1, Math.min(8, toInteger(rawArgs.limit) || 5));
      const items = unwrap(await getPendingCollections(limit));

      return {
        result: {
          total: items.length,
          items: items.map((item) => ({
            contract_code: item.contract_code || item.id,
            customer_name: item.customers?.full_name || "Khach chua ro",
            remaining_amount: item.remaining_amount || 0,
            status: item.status,
          })),
        },
        metadata: {
          skill_id: "pending_collections",
          skill_label: "Danh sach can thu",
          sources: buildSources([{ label: "So hop dong", value: String(items.length) }]),
          follow_ups: [
            "Cong no hien tai the nao?",
            "Tra cuu hop dong cua khach Lan",
          ],
          widgets:
            items.length > 0
              ? [
                  toComparisonWidget(
                    "Khoan can thu noi bat",
                    items.map((item) => ({
                      label: item.contract_code || item.id,
                      value: item.remaining_amount || 0,
                      value_label: formatCurrency(item.remaining_amount || 0),
                      hint: item.customers?.full_name || "Khach chua ro",
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
        description: "Tim hop dong theo ma, ten khach hoac trang thai thanh toan.",
        parameters: {
          type: "object",
          properties: {
            keyword: {
              type: "string",
              description: "Ma hop dong, ten khach hoac SDT gan dung.",
            },
            status: {
              type: "string",
              description: "Trang thai hop dong neu can loc them.",
            },
          },
        },
      },
    },
    async execute(context, rawArgs) {
      if (!canAccess(context.role, "contracts")) {
        return buildPermissionDeniedResult(context.role, "contract_lookup", "Tra cuu hop dong");
      }

      const keyword = normalizeText(extractKeyword(rawArgs.keyword));
      const status = extractKeyword(rawArgs.status).toLowerCase();
      const { data, error } = await context.supabase
        .from("contracts")
        .select("id, contract_code, contract_date, work_date, status, total_amount, paid_amount, remaining_amount, customers(full_name, phone)")
        .is("deleted_at", null)
        .order("contract_date", { ascending: false })
        .limit(24);

      if (error) throw new Error(`Khong the tra cuu hop dong: ${error.message}`);

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
              customer_name: customer?.full_name || "Khach chua ro",
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
          skill_label: "Tra cuu hop dong",
          sources: buildSources([{ label: "Ket qua", value: String(rows.length) }]),
          follow_ups: [
            "Nhung hop dong nao con phai thu?",
            "Lich hom nay co gi?",
          ],
        },
      };
    },
  },
  get_upcoming_schedules: {
    definition: {
      type: "function",
      function: {
        name: "get_upcoming_schedules",
        description: "Lay lich su kien sap toi theo ngay, ngay mai hoac 7 ngay toi.",
        parameters: {
          type: "object",
          properties: {
            range: {
              type: "string",
              enum: ["today", "tomorrow", "week", "3days"],
              description: "Khung lich can xem.",
            },
            days: {
              type: "number",
              description: "So ngay toi can xem neu range = 3days.",
            },
          },
        },
      },
    },
    async execute(context, rawArgs) {
      if (!canAccess(context.role, "calendar")) {
        return buildPermissionDeniedResult(context.role, "schedule_summary", "Lich sap toi");
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

      if (error) throw new Error(`Khong the tai lich: ${error.message}`);

      const events = (data || []) as EventRow[];
      const contractIds = Array.from(new Set(events.map((event) => event.contract_id).filter(Boolean))) as string[];
      const contractMap = new Map<string, { contract_code: string | null; customer_name: string | null }>();

      if (contractIds.length > 0) {
        const { data: contracts, error: contractError } = await context.supabase
          .from("contracts")
          .select("id, contract_code, customers(full_name)")
          .in("id", contractIds);

        if (contractError) throw new Error(`Khong the tai hop dong lich: ${contractError.message}`);

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
              title: event.title || event.event_type || "Su kien",
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
          skill_label: "Lich sap toi",
          sources: buildSources([
            { label: "Khung thoi gian", value: range.label },
            { label: "Su kien", value: String(events.length) },
          ]),
          follow_ups: [
            "Ngay mai ekip co lich nao?",
            "Tim hop dong cua khach Lan",
          ],
        },
      };
    },
  },
  get_team_summary: {
    definition: {
      type: "function",
      function: {
        name: "get_team_summary",
        description: "Lay tinh hinh nhan su active va so task qua han.",
        parameters: { type: "object", properties: {} },
      },
    },
    async execute(context) {
      if (!canAccess(context.role, "employees")) {
        return buildPermissionDeniedResult(context.role, "team_summary", "Nhan su va tien do");
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

      if (employeesResult.error) throw new Error(`Khong the tai nhan su: ${employeesResult.error.message}`);
      if (tasksResult.error) throw new Error(`Khong the tai task nhan su: ${tasksResult.error.message}`);

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
          skill_label: "Nhan su va tien do",
          sources: buildSources([
            { label: "Nhan su active", value: String(activeEmployees.length) },
            { label: "Task tre", value: String(overdueTasks.length) },
          ]),
          follow_ups: [
            "Lich hom nay co gi?",
            "Tai chinh tong quan thang nay",
          ],
          widgets: [
            toKpiWidget("Van hanh nhan su", [
              { label: "Nhan su active", value: String(activeEmployees.length) },
              { label: "Phong ban", value: String(departments.size) },
              {
                label: "Task qua han",
                value: String(overdueTasks.length),
                tone: overdueTasks.length > 0 ? "warning" : "positive",
              },
            ]),
          ],
        },
      };
    },
  },
  get_services_catalog: {
    definition: {
      type: "function",
      function: {
        name: "get_services_catalog",
        description: "Tra cuu bang gia va danh sach dich vu dang active.",
        parameters: {
          type: "object",
          properties: {
            keyword: {
              type: "string",
              description: "Ten goi, ma dich vu hoac nhom dich vu.",
            },
          },
        },
      },
    },
    async execute(context, rawArgs) {
      if (!canAccess(context.role, "services")) {
        return buildPermissionDeniedResult(context.role, "service_catalog", "Dich vu va bang gia");
      }

      const keyword = normalizeText(extractKeyword(rawArgs.keyword));
      const { data, error } = await context.supabase
        .from("services")
        .select("id, service_code, name, service_type, selling_price, status")
        .eq("status", "active")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(32);

      if (error) throw new Error(`Khong the tai dich vu: ${error.message}`);

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
          skill_label: "Dich vu va bang gia",
          sources: buildSources([{ label: "Dich vu", value: String(rows.length) }]),
          follow_ups: [
            "Gia goi baby la bao nhieu?",
            "Tai chinh tong quan thang nay",
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
        description: "Lay tien do muc tieu tai chinh va kha nang dong gop trong thang.",
        parameters: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["active", "completed", "cancelled"],
              description: "Loc theo trang thai muc tieu neu can.",
            },
            limit: {
              type: "number",
              description: "So muc tieu toi da can tra ve.",
            },
          },
        },
      },
    },
    async execute(context, rawArgs) {
      if (!canAccess(context.role, "finance")) {
        return buildPermissionDeniedResult(context.role, "goal_summary", "Muc tieu tai chinh");
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
          skill_label: "Muc tieu tai chinh",
          sources: buildSources([
            { label: "Ky hien tai", value: cashflow.currentPeriod },
            { label: "Co the danh cho muc tieu", value: formatCurrency(cashflow.availableForGoals) },
            { label: "Tien do tong", value: formatPercent(overallProgress) },
          ]),
          follow_ups: [
            "Tai chinh tong quan thang nay ra sao?",
            "Cong no hien tai the nao?",
          ],
          widgets: [
            toKpiWidget("Dong tien cho muc tieu", [
              { label: "Ky hien tai", value: cashflow.currentPeriod },
              { label: "Net cashflow", value: formatCurrency(cashflow.netCashflow), tone: cashflow.netCashflow >= 0 ? "positive" : "danger" },
              { label: "Co the danh cho muc tieu", value: formatCurrency(cashflow.availableForGoals), tone: "positive" },
              { label: "Tien do tong", value: formatPercent(overallProgress) },
            ]),
            ...(goals.length > 0
              ? [
                  toProgressWidget(
                    "Tien do muc tieu",
                    goals.map((goal) => ({
                      label: goal.name,
                      current: goal.current_amount,
                      target: goal.target_amount,
                      unit: "VND",
                      hint: goal.monthly_needed
                        ? `Can them ${formatCurrency(goal.monthly_needed)}/thang`
                        : goal.deadline
                          ? `Deadline ${formatDate(goal.deadline)}`
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

export function getMoodieToolDefinitions() {
  return Object.values(moodieTools).map((tool) => tool.definition);
}

export async function executeMoodieTool(
  name: string,
  context: MoodieToolContext,
  rawArgs: Record<string, unknown>,
) {
  const tool = moodieTools[name];
  if (!tool) {
    throw new Error(`Unknown Moodie tool: ${name}`);
  }

  return tool.execute(context, rawArgs);
}
