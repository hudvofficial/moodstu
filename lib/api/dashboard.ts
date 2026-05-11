import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, subMonths } from "date-fns";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import {
  asNumber,
  asString,
  isMissingRpcError,
  monthWindow,
  relationText,
} from "@/lib/finance-utils";
import { createAdminClient } from "@/lib/supabase/server";
import { canAccess, type Role } from "@/types/roles";
import type {
  DashboardAccess,
  DashboardBootstrapData,
  DashboardCriticalData,
  DashboardKPIs,
  DashboardSectionResult,
  DashboardVisibility,
  PaymentReminderData,
  RevenueChartData,
  ServiceBreakdownData,
  ServiceTypeEnum,
  UpcomingEventData,
} from "@/types/dashboard";

type QueryError = { message?: string } | null;
type QueryRow = Record<string, unknown>;
type DashboardCriticalKpiRpcRow = {
  current_revenue?: unknown;
  previous_revenue?: unknown;
  total_debt?: unknown;
  current_contracts?: unknown;
  previous_contracts?: unknown;
  current_completed?: unknown;
  previous_completed?: unknown;
};
type DashboardRevenueChartRpcRow = {
  month_index?: unknown;
  month_label?: unknown;
  revenue?: unknown;
};
type DashboardServiceBreakdownRpcRow = {
  service_type?: unknown;
  contract_count?: unknown;
  revenue?: unknown;
};

const DASHBOARD_CHART_MONTHS = 6;
const UPCOMING_DAYS = 14;
const COLLECTION_DAYS = 30;
const LIST_LIMIT = 6;
const UPCOMING_SOURCE_LIMIT = LIST_LIMIT * 4;
export const DASHBOARD_CRITICAL_CACHE_TAG = "dashboard-critical";
const DASHBOARD_CRITICAL_CACHE_SECONDS = 5;
const DEFAULT_DASHBOARD_PROFILE_SLOW_MS = 500;

const SERVICE_LABELS: Record<string, string> = {
  studio: "Studio",
  ngay_cuoi: "Ngày cưới",
  combo: "Combo",
  baby: "Baby",
  gia_dinh: "Gia đình",
  sinh_nhat: "Sinh nhật",
  bau: "Bầu",
  concept: "Concept",
  couple: "Couple",
  ky_yeu: "Kỷ yếu",
  media: "Media",
  khac: "Khác",
};

const SERVICE_COLORS = [
  "#2563eb",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#be123c",
  "#4f46e5",
];

function assertQueryOk(label: string, error: QueryError) {
  if (error) {
    throw new Error(`${label}: ${error.message || "Unknown database error"}`);
  }
}

function getDashboardProfileSlowMs() {
  const configured = Number(process.env.DASHBOARD_PROFILE_SLOW_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_DASHBOARD_PROFILE_SLOW_MS;
}

function shouldLogDashboardTiming(durationMs: number) {
  if (process.env.DASHBOARD_PROFILE === "1") return true;
  if (process.env.DASHBOARD_PROFILE === "0") return false;
  return durationMs >= getDashboardProfileSlowMs();
}

async function profileDashboardSection<T>(
  label: string,
  loader: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();

  try {
    return await loader();
  } finally {
    const durationMs = Math.round(performance.now() - startedAt);
    if (shouldLogDashboardTiming(durationMs)) {
      console.warn(`[dashboard-profile] ${label}=${durationMs}ms`);
    }
  }
}

function currentPeriod() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return {
    month,
    year,
    label: `Tháng ${month}/${year}`,
  };
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function emptyKpis(): DashboardKPIs {
  return {
    totalRevenue: 0,
    revenueChange: null,
    newContracts: 0,
    contractsChange: null,
    totalDebt: 0,
    debtChange: null,
    completedContracts: 0,
    completedChange: null,
  };
}

function serviceLabel(value: unknown) {
  const key = asString(value, "khac") || "khac";
  return SERVICE_LABELS[key] || key;
}

function relationObject(value: unknown): QueryRow | null {
  const item = Array.isArray(value) ? value[0] : value;
  return item && typeof item === "object" ? (item as QueryRow) : null;
}

function isCancelledStatus(value: unknown) {
  const status = asString(value).toLowerCase();
  return status === "da_huy" || status === "cancelled" || status === "canceled";
}

function isPaidPlanStatus(value: unknown) {
  const status = asString(value).toLowerCase();
  return status === "paid" || status === "da_thanh_toan" || status === "completed";
}

function dateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return toDateOnly(date);
}

function compareDateAsc(left: string | null, right: string | null) {
  const leftTime = left ? new Date(left).getTime() : Number.POSITIVE_INFINITY;
  const rightTime = right ? new Date(right).getTime() : Number.POSITIVE_INFINITY;
  return leftTime - rightTime;
}

function visibilityForRole(role: Role): DashboardVisibility {
  return {
    canViewFinancials: role === "admin" || role === "manager",
    canViewContracts: role === "admin" || role === "manager" || role === "sale",
    canViewCalendar:
      role === "admin" ||
      role === "manager" ||
      role === "sale" ||
      role === "media",
  };
}

type DashboardAccessWithUser = DashboardAccess & {
  userId: string;
};

async function requireDashboardAccess(): Promise<DashboardAccessWithUser> {
  const context = await getAuthenticatedUserContext();

  if (!context) {
    throw new Error("Chưa đăng nhập.");
  }

  if (!canAccess(context.shellRole, "dashboard")) {
    throw new Error("Bạn không có quyền truy cập Dashboard.");
  }

  return {
    userId: context.user.id,
    employeeId: context.employee?.id ?? null,
    role: context.shellRole,
    visibility: visibilityForRole(context.shellRole),
  };
}

async function safeSection<T>(
  label: string,
  errors: string[],
  fallback: T,
  loader: () => Promise<T>,
): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown dashboard error";
    errors.push(`${label}: ${message}`);
    return fallback;
  }
}

async function sumPaymentsAndReceipts(
  supabase: SupabaseClient,
  start: string,
  end: string,
) {
  const [paymentsResult, receiptsResult] = await Promise.all([
    supabase
      .from("payments")
      .select("amount")
      .is("deleted_at", null)
      .gte("payment_date", start)
      .lt("payment_date", end),
    supabase
      .from("receipts")
      .select("receipt_amount")
      .is("deleted_at", null)
      .is("contract_id", null)
      .gte("receipt_date", start)
      .lt("receipt_date", end),
  ]);

  assertQueryOk("Lỗi tải thanh toán hợp đồng", paymentsResult.error);
  assertQueryOk("Lỗi tải phiếu thu độc lập", receiptsResult.error);

  const payments = (paymentsResult.data || []).reduce(
    (sum, row) => sum + asNumber(row.amount),
    0,
  );
  const receipts = (receiptsResult.data || []).reduce(
    (sum, row) => sum + asNumber(row.receipt_amount),
    0,
  );

  return payments + receipts;
}

function mapDashboardKpisFromAggregate(
  row: DashboardCriticalKpiRpcRow | null,
  visibility: DashboardVisibility,
): DashboardKPIs {
  const kpis = emptyKpis();

  if (visibility.canViewFinancials) {
    const currentRevenue = asNumber(row?.current_revenue);
    const previousRevenue = asNumber(row?.previous_revenue);

    kpis.totalRevenue = currentRevenue;
    kpis.revenueChange = percentChange(currentRevenue, previousRevenue);
    kpis.totalDebt = asNumber(row?.total_debt);
  }

  if (visibility.canViewContracts) {
    const currentContracts = asNumber(row?.current_contracts);
    const previousContracts = asNumber(row?.previous_contracts);
    const currentCompleted = asNumber(row?.current_completed);
    const previousCompleted = asNumber(row?.previous_completed);

    kpis.newContracts = currentContracts;
    kpis.contractsChange = percentChange(currentContracts, previousContracts);
    kpis.completedContracts = currentCompleted;
    kpis.completedChange = percentChange(currentCompleted, previousCompleted);
  }

  return kpis;
}

async function queryKpisFallback(
  supabase: SupabaseClient,
  visibility: DashboardVisibility,
): Promise<DashboardKPIs> {
  const now = currentPeriod();
  const current = monthWindow(now.month, now.year);
  const previousDate = subMonths(new Date(now.year, now.month - 1, 1), 1);
  const previous = monthWindow(previousDate.getMonth() + 1, previousDate.getFullYear());

  const kpis = emptyKpis();

  if (visibility.canViewFinancials) {
    const [currentRevenue, previousRevenue, debtRows] = await Promise.all([
      sumPaymentsAndReceipts(supabase, current.start, current.end),
      sumPaymentsAndReceipts(supabase, previous.start, previous.end),
      supabase
        .from("contracts")
        .select("remaining_amount")
        .is("deleted_at", null)
        .neq("status", "da_huy")
        .gt("remaining_amount", 0),
    ]);

    assertQueryOk("Lỗi tải công nợ", debtRows.error);

    kpis.totalRevenue = currentRevenue;
    kpis.revenueChange = percentChange(currentRevenue, previousRevenue);
    kpis.totalDebt = (debtRows.data || []).reduce(
      (sum, row) => sum + asNumber(row.remaining_amount),
      0,
    );
  }

  if (visibility.canViewContracts) {
    const [currentContracts, previousContracts, currentCompleted, previousCompleted] =
      await Promise.all([
        supabase
          .from("contracts")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .neq("status", "da_huy")
          .gte("contract_date", current.start)
          .lt("contract_date", current.end),
        supabase
          .from("contracts")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .neq("status", "da_huy")
          .gte("contract_date", previous.start)
          .lt("contract_date", previous.end),
        supabase
          .from("contracts")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .eq("status", "hoan_thanh")
          .gte("updated_at", current.start)
          .lt("updated_at", current.end),
        supabase
          .from("contracts")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .eq("status", "hoan_thanh")
          .gte("updated_at", previous.start)
          .lt("updated_at", previous.end),
      ]);

    assertQueryOk("Lỗi tải hợp đồng mới", currentContracts.error);
    assertQueryOk("Lỗi tải hợp đồng mới kỳ trước", previousContracts.error);
    assertQueryOk("Lỗi tải hợp đồng hoàn thành", currentCompleted.error);
    assertQueryOk("Lỗi tải hợp đồng hoàn thành kỳ trước", previousCompleted.error);

    kpis.newContracts = currentContracts.count || 0;
    kpis.contractsChange = percentChange(
      currentContracts.count || 0,
      previousContracts.count || 0,
    );
    kpis.completedContracts = currentCompleted.count || 0;
    kpis.completedChange = percentChange(
      currentCompleted.count || 0,
      previousCompleted.count || 0,
    );
  }

  return kpis;
}

async function queryKpis(
  supabase: SupabaseClient,
  visibility: DashboardVisibility,
): Promise<DashboardKPIs> {
  if (!visibility.canViewFinancials && !visibility.canViewContracts) {
    return emptyKpis();
  }

  const now = currentPeriod();
  const { data, error } = await supabase
    .rpc("dashboard_critical_kpis", {
      p_month: now.month,
      p_year: now.year,
    })
    .single();

  if (error && isMissingRpcError(error)) {
    return queryKpisFallback(supabase, visibility);
  }

  assertQueryOk("Lỗi tải KPI dashboard", error);

  return mapDashboardKpisFromAggregate(
    (data || null) as DashboardCriticalKpiRpcRow | null,
    visibility,
  );
}

async function queryRevenueChartFallback(
  supabase: SupabaseClient,
  visibility: DashboardVisibility,
): Promise<RevenueChartData[]> {
  if (!visibility.canViewFinancials) return [];

  const now = currentPeriod();
  const startDate = new Date(now.year, now.month - DASHBOARD_CHART_MONTHS, 1);
  const start = monthWindow(startDate.getMonth() + 1, startDate.getFullYear()).start;
  const end = monthWindow(now.month, now.year).end;

  const [paymentsResult, receiptsResult] = await Promise.all([
    supabase
      .from("payments")
      .select("payment_date, amount")
      .is("deleted_at", null)
      .gte("payment_date", start)
      .lt("payment_date", end),
    supabase
      .from("receipts")
      .select("receipt_date, receipt_amount")
      .is("deleted_at", null)
      .is("contract_id", null)
      .gte("receipt_date", start)
      .lt("receipt_date", end),
  ]);

  assertQueryOk("Lỗi tải biểu đồ doanh thu", paymentsResult.error);
  assertQueryOk("Lỗi tải biểu đồ phiếu thu", receiptsResult.error);

  const buckets = new Map<string, RevenueChartData>();
  for (let i = DASHBOARD_CHART_MONTHS - 1; i >= 0; i--) {
    const date = subMonths(new Date(now.year, now.month - 1, 1), i);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    buckets.set(key, {
      month: `T${date.getMonth() + 1}`,
      revenue: 0,
    });
  }

  for (const row of paymentsResult.data || []) {
    const date = new Date(row.payment_date);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.revenue += asNumber(row.amount);
  }

  for (const row of receiptsResult.data || []) {
    const date = new Date(row.receipt_date);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.revenue += asNumber(row.receipt_amount);
  }

  return Array.from(buckets.values());
}

function mapDashboardRevenueChartFromAggregate(
  rows: DashboardRevenueChartRpcRow[] | null,
): RevenueChartData[] {
  return (rows || []).map((row) => ({
    month:
      asString(row.month_label, "") ||
      `T${asNumber(row.month_index) || ""}`.trim(),
    revenue: asNumber(row.revenue),
  }));
}

async function queryRevenueChart(
  supabase: SupabaseClient,
  visibility: DashboardVisibility,
): Promise<RevenueChartData[]> {
  if (!visibility.canViewFinancials) return [];

  const now = currentPeriod();
  const { data, error } = await supabase.rpc("dashboard_revenue_chart", {
    p_month: now.month,
    p_year: now.year,
    p_months: DASHBOARD_CHART_MONTHS,
  });

  if (error && isMissingRpcError(error)) {
    return queryRevenueChartFallback(supabase, visibility);
  }

  assertQueryOk("Loi tai bieu do doanh thu", error);
  return mapDashboardRevenueChartFromAggregate(
    (data || []) as DashboardRevenueChartRpcRow[],
  );
}

async function queryServiceBreakdownFallback(
  supabase: SupabaseClient,
  visibility: DashboardVisibility,
): Promise<ServiceBreakdownData[]> {
  if (!visibility.canViewContracts) return [];

  const now = currentPeriod();
  const window = monthWindow(now.month, now.year);
  const { data, error } = await supabase
    .from("contracts")
    .select("service_type, total_amount")
    .is("deleted_at", null)
    .neq("status", "da_huy")
    .gte("contract_date", window.start)
    .lt("contract_date", window.end);

  assertQueryOk("Lỗi tải phân bổ dịch vụ", error);

  const grouped = new Map<string, { count: number; revenue: number }>();
  for (const row of data || []) {
    const serviceType = asString(row.service_type, "khac") || "khac";
    const current = grouped.get(serviceType) || { count: 0, revenue: 0 };
    current.count += 1;
    current.revenue += visibility.canViewFinancials ? asNumber(row.total_amount) : 0;
    grouped.set(serviceType, current);
  }

  const total = Array.from(grouped.values()).reduce((sum, item) => sum + item.count, 0);
  if (total === 0) return [];

  return Array.from(grouped.entries())
    .map(([serviceType, item], index) => ({
      name: serviceLabel(serviceType),
      serviceType: serviceType as ServiceTypeEnum | "khac",
      value: Math.round((item.count / total) * 1000) / 10,
      count: item.count,
      revenue: item.revenue,
      fill: SERVICE_COLORS[index % SERVICE_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count || b.revenue - a.revenue);
}

function mapDashboardServiceBreakdownFromAggregate(
  rows: DashboardServiceBreakdownRpcRow[] | null,
  visibility: DashboardVisibility,
): ServiceBreakdownData[] {
  const total = (rows || []).reduce(
    (sum, row) => sum + asNumber(row.contract_count),
    0,
  );
  if (total === 0) return [];

  return (rows || [])
    .map((row, index) => {
      const serviceType = asString(row.service_type, "khac") || "khac";
      const count = asNumber(row.contract_count);

      return {
        name: serviceLabel(serviceType),
        serviceType: serviceType as ServiceTypeEnum | "khac",
        value: Math.round((count / total) * 1000) / 10,
        count,
        revenue: visibility.canViewFinancials ? asNumber(row.revenue) : 0,
        fill: SERVICE_COLORS[index % SERVICE_COLORS.length],
      };
    })
    .sort((a, b) => b.count - a.count || b.revenue - a.revenue);
}

async function queryServiceBreakdown(
  supabase: SupabaseClient,
  visibility: DashboardVisibility,
): Promise<ServiceBreakdownData[]> {
  if (!visibility.canViewContracts) return [];

  const now = currentPeriod();
  const { data, error } = await supabase.rpc("dashboard_service_breakdown", {
    p_month: now.month,
    p_year: now.year,
  });

  if (error && isMissingRpcError(error)) {
    return queryServiceBreakdownFallback(supabase, visibility);
  }

  assertQueryOk("Loi tai phan bo dich vu", error);
  return mapDashboardServiceBreakdownFromAggregate(
    (data || []) as DashboardServiceBreakdownRpcRow[],
    visibility,
  );
}

async function queryContractEvents(
  supabase: SupabaseClient,
): Promise<UpcomingEventData[]> {
  const start = toDateOnly(new Date());
  const end = toDateOnly(addDays(new Date(), UPCOMING_DAYS));

  const { data, error } = await supabase
    .from("contract_events")
    .select(
      "id, event_date, event_type, title, contracts!inner(id, contract_code, service_type, status, deleted_at, customers(full_name))",
    )
    .is("deleted_at", null)
    .is("contracts.deleted_at", null)
    .neq("contracts.status", "da_huy")
    .not("event_date", "is", null)
    .gte("event_date", start)
    .lt("event_date", end)
    .order("event_date", { ascending: true })
    .limit(UPCOMING_SOURCE_LIMIT);

  assertQueryOk("Lỗi tải lịch hợp đồng sắp tới", error);

  return ((data || []) as QueryRow[]).map((row) => {
    const contract = relationObject(row.contracts);
    return {
      id: asString(row.id),
      contractId: asString(contract?.id, "") || null,
      contractCode: asString(contract?.contract_code, "") || null,
      customerName:
        relationText(contract?.customers, "full_name") ||
        asString(row.title, "") ||
        "Khách hàng",
      eventDate: asString(row.event_date),
      serviceType: (asString(contract?.service_type, "khac") || "khac") as
        | ServiceTypeEnum
        | "khac",
      source: "contract_events" as const,
      sourceLabel: "Mốc hợp đồng",
      href: contract?.id ? `/contracts/${asString(contract.id)}` : "/calendar",
    };
  });
}

async function queryPersonalSchedules(
  supabase: SupabaseClient,
  access: DashboardAccess,
): Promise<UpcomingEventData[]> {
  const canSeeAll = access.role === "admin" || access.role === "manager";
  if (!canSeeAll && !access.employeeId) return [];

  const start = toDateOnly(new Date());
  const end = toDateOnly(addDays(new Date(), UPCOMING_DAYS));

  let query = supabase
    .from("schedules")
    .select("id, event_date, event_type, status, contract_id, contracts(id, contract_code, service_type, status, deleted_at, customers(full_name))")
    .gte("event_date", start)
    .lt("event_date", end)
    .order("event_date", { ascending: true })
    .limit(UPCOMING_SOURCE_LIMIT);

  if (!canSeeAll) {
    query = query.eq("employee_id", access.employeeId);
  }

  const { data, error } = await query;

  assertQueryOk("Lỗi tải lịch cá nhân", error);

  return ((data || []) as QueryRow[])
    .filter((row) => {
      if (isCancelledStatus(row.status)) return false;
      const contract = relationObject(row.contracts);
      if (!contract) return true;
      return !contract.deleted_at && !isCancelledStatus(contract.status);
    })
    .map((row) => {
      const contract = relationObject(row.contracts);
      const contractId = asString(contract?.id, "") || asString(row.contract_id, "") || null;

      return {
        id: asString(row.id),
        contractId,
        contractCode: asString(contract?.contract_code, "") || null,
        customerName:
          relationText(contract?.customers, "full_name") ||
          asString(row.event_type, "Lịch làm việc"),
        eventDate: asString(row.event_date),
        serviceType: (asString(contract?.service_type, "khac") || "khac") as
          | ServiceTypeEnum
          | "khac",
        source: "schedules" as const,
        sourceLabel: "Lịch làm việc",
        href: contractId ? `/contracts/${contractId}` : "/calendar",
      };
    });
}

async function queryWorkTasks(
  supabase: SupabaseClient,
  access: DashboardAccess,
): Promise<UpcomingEventData[]> {
  const canSeeAll = access.role === "admin" || access.role === "manager";
  if (!canSeeAll && !access.employeeId) return [];

  const start = toDateOnly(new Date());
  const end = toDateOnly(addDays(new Date(), UPCOMING_DAYS));
  let query = supabase
    .from("work_tasks")
    .select("id, deadline, start_date, work_type, status, contract_id, contracts(id, contract_code, service_type, status, deleted_at, customers(full_name))")
    .or(`and(deadline.gte.${start},deadline.lt.${end}),and(deadline.is.null,start_date.gte.${start},start_date.lt.${end})`)
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(UPCOMING_SOURCE_LIMIT);

  if (!canSeeAll) {
    query = query.eq("assigned_to", access.employeeId);
  }

  const { data, error } = await query;

  assertQueryOk("Lỗi tải nhiệm vụ sắp tới", error);

  return ((data || []) as QueryRow[])
    .filter((row) => {
      if (isCancelledStatus(row.status)) return false;
      const contract = relationObject(row.contracts);
      if (!contract) return true;
      return !contract.deleted_at && !isCancelledStatus(contract.status);
    })
    .map((row) => {
      const contract = relationObject(row.contracts);
      const contractId = asString(contract?.id, "") || asString(row.contract_id, "") || null;

      return {
        id: asString(row.id),
        contractId,
        contractCode: asString(contract?.contract_code, "") || null,
        customerName:
          relationText(contract?.customers, "full_name") ||
          serviceLabel(row.work_type) ||
          "Nhiệm vụ",
        eventDate: asString(row.deadline, "") || asString(row.start_date, ""),
        serviceType: (asString(contract?.service_type, "khac") || "khac") as
          | ServiceTypeEnum
          | "khac",
        source: "work_tasks" as const,
        sourceLabel: "Nhiệm vụ",
        href: contractId ? `/contracts/${contractId}` : "/calendar",
      };
    })
    .filter((row) => !!row.eventDate);
}

async function queryUpcomingEvents(
  supabase: SupabaseClient,
  access: DashboardAccess,
): Promise<UpcomingEventData[]> {
  if (!access.visibility.canViewCalendar && !access.visibility.canViewContracts) {
    return [];
  }

  const [contractEvents, schedules, tasks] = await Promise.all([
    access.visibility.canViewContracts ? queryContractEvents(supabase) : Promise.resolve([]),
    access.visibility.canViewCalendar ? queryPersonalSchedules(supabase, access) : Promise.resolve([]),
    access.visibility.canViewCalendar ? queryWorkTasks(supabase, access) : Promise.resolve([]),
  ]);

  const deduped = new Map<string, UpcomingEventData>();
  for (const item of [...contractEvents, ...schedules, ...tasks]) {
    const key =
      item.contractId
        ? `calendar:${item.contractId}:${dateKey(item.eventDate)}`
        : `${item.source}:${item.id}`;
    if (!deduped.has(key)) deduped.set(key, item);
  }

  const grouped = new Map<string, UpcomingEventData>();
  for (const item of Array.from(deduped.values()).sort((left, right) =>
    compareDateAsc(left.eventDate, right.eventDate),
  )) {
    const groupKey = item.contractId ? `contract:${item.contractId}` : `${item.source}:${item.id}`;
    const milestone = {
      id: item.id,
      eventDate: item.eventDate,
      source: item.source,
      sourceLabel: item.sourceLabel,
    };
    const existing = grouped.get(groupKey);

    if (!existing) {
      grouped.set(groupKey, {
        ...item,
        milestones: [milestone],
        eventCount: 1,
      });
      continue;
    }

    existing.milestones = [...(existing.milestones || []), milestone];
    existing.eventCount = existing.milestones.length;
  }

  return Array.from(grouped.values())
    .sort((left, right) => compareDateAsc(left.eventDate, right.eventDate))
    .slice(0, LIST_LIMIT);
}

async function queryPaymentReminders(
  supabase: SupabaseClient,
  visibility: DashboardVisibility,
): Promise<PaymentReminderData[]> {
  if (!visibility.canViewFinancials) return [];

  const today = toDateOnly(new Date());
  const end = toDateOnly(addDays(new Date(), COLLECTION_DAYS));

  const { data: planRows, error: planError } = await supabase
    .from("payment_plans")
    .select("id, amount, due_date, stage_name, status, contract_id, contracts!inner(id, contract_code, remaining_amount, status, deleted_at, customers(full_name))")
    .not("due_date", "is", null)
    .lte("due_date", end)
    .is("contracts.deleted_at", null)
    .neq("contracts.status", "da_huy")
    .order("due_date", { ascending: true })
    .limit(LIST_LIMIT * 3);

  assertQueryOk("Lỗi tải đợt cần thu", planError);

  const planReminders = ((planRows || []) as QueryRow[])
    .filter((row) => !isPaidPlanStatus(row.status))
    .map((row) => {
      const contract = relationObject(row.contracts);
      const contractId = asString(contract?.id) || asString(row.contract_id);
      const dueDate = asString(row.due_date, "") || null;

      return {
        id: `payment-plan:${asString(row.id)}`,
        contractId,
        contractCode: asString(contract?.contract_code),
        customerName: relationText(contract?.customers, "full_name") || "Khách hàng",
        stageName: asString(row.stage_name, "Đợt thanh toán"),
        remainingAmount: asNumber(row.amount) > 0
          ? asNumber(row.amount)
          : asNumber(contract?.remaining_amount),
        dueDate,
        source: "payment_plans" as const,
        isOverdue: !!dueDate && dueDate < today,
        href: `/contracts/${contractId}`,
      };
    })
    .sort((left, right) => compareDateAsc(left.dueDate, right.dueDate));

  const planContractIds = new Set(planReminders.map((row) => row.contractId));

  const { data: contractRows, error: contractError } = await supabase
    .from("contracts")
    .select("id, contract_code, remaining_amount, work_date, contract_date, customers(full_name)")
    .is("deleted_at", null)
    .neq("status", "da_huy")
    .gt("remaining_amount", 0)
    .order("work_date", { ascending: true, nullsFirst: false })
    .order("contract_date", { ascending: false })
    .limit(LIST_LIMIT * 2);

  assertQueryOk("Lỗi tải danh sách cần thu", contractError);

  const fallbackReminders = ((contractRows || []) as QueryRow[])
    .filter((row) => !planContractIds.has(asString(row.id)))
    .map((row) => {
      const dueDate = asString(row.work_date, "") || asString(row.contract_date, "") || null;
      return {
        id: `contract:${asString(row.id)}`,
        contractId: asString(row.id),
        contractCode: asString(row.contract_code),
        customerName: relationText(row.customers, "full_name") || "Khách hàng",
        stageName: "Công nợ còn lại",
        remainingAmount: asNumber(row.remaining_amount),
        dueDate,
        source: "contracts" as const,
        isOverdue: !!dueDate && dueDate < today,
        href: `/contracts/${asString(row.id)}`,
      };
    });

  const grouped = new Map<string, PaymentReminderData>();

  for (const item of [...planReminders, ...fallbackReminders].sort((left, right) =>
    compareDateAsc(left.dueDate, right.dueDate),
  )) {
    const milestone = {
      id: item.id,
      stageName: item.stageName,
      amount: item.remainingAmount,
      dueDate: item.dueDate,
      source: item.source,
      isOverdue: item.isOverdue,
    };
    const existing = grouped.get(item.contractId);

    if (!existing) {
      grouped.set(item.contractId, {
        ...item,
        milestones: [milestone],
        installmentCount: 1,
        overdueCount: item.isOverdue ? 1 : 0,
      });
      continue;
    }

    existing.remainingAmount += item.remainingAmount;
    existing.isOverdue = existing.isOverdue || item.isOverdue;
    existing.milestones = [...(existing.milestones || []), milestone];
    existing.installmentCount = existing.milestones.length;
    existing.overdueCount = (existing.overdueCount || 0) + (item.isOverdue ? 1 : 0);
  }

  return Array.from(grouped.values())
    .sort((left, right) => compareDateAsc(left.dueDate, right.dueDate))
    .slice(0, LIST_LIMIT);
}

const getDashboardAccess = cache(async () =>
  profileDashboardSection("dashboard.access", requireDashboardAccess),
);

function dashboardAccessFromArgs(employeeId: string, role: Role): DashboardAccess {
  return {
    employeeId: employeeId || null,
    role,
    visibility: visibilityForRole(role),
  };
}

async function loadDashboardSection<T>(
  label: string,
  profileLabel: string,
  fallback: T,
  loader: () => Promise<T>,
): Promise<DashboardSectionResult<T>> {
  const errors: string[] = [];
  const data = await safeSection(label, errors, fallback, () =>
    profileDashboardSection(profileLabel, loader),
  );

  return { data, errors };
}

const getCachedDashboardCritical = unstable_cache(
  async (
    userId: string,
    employeeId: string,
    role: Role,
  ): Promise<DashboardCriticalData> => {
    // userId is part of the unstable_cache key; keep it in the signature.
    void userId;

    return profileDashboardSection("dashboard.critical", async () => {
      const supabase = await createAdminClient();
      const access = dashboardAccessFromArgs(employeeId, role);
      const period = currentPeriod();
      const { data: kpis, errors } = await loadDashboardSection(
        "KPI",
        "dashboard.kpis",
        emptyKpis(),
        () => queryKpis(supabase, access.visibility),
      );

      return {
        access,
        period,
        kpis,
        errors,
      };
    });
  },
  ["dashboard-critical-v1"],
  {
    revalidate: DASHBOARD_CRITICAL_CACHE_SECONDS,
    tags: [DASHBOARD_CRITICAL_CACHE_TAG],
  },
);

export const getDashboardCritical = cache(async (): Promise<DashboardCriticalData> => {
  const access = await getDashboardAccess();
  return getCachedDashboardCritical(
    access.userId,
    access.employeeId ?? "",
    access.role,
  );
});

export async function prewarmDashboardCritical() {
  await getDashboardCritical();
}

export const getDashboardRevenueChartSection = cache(
  async (): Promise<DashboardSectionResult<RevenueChartData[]>> => {
    const access = await getDashboardAccess();
    const supabase = await createAdminClient();

    return loadDashboardSection(
      "Bieu do doanh thu",
      "dashboard.revenueChart",
      [],
      () => queryRevenueChart(supabase, access.visibility),
    );
  },
);

export const getDashboardServiceBreakdownSection = cache(
  async (): Promise<DashboardSectionResult<ServiceBreakdownData[]>> => {
    const access = await getDashboardAccess();
    const supabase = await createAdminClient();

    return loadDashboardSection(
      "Phan bo dich vu",
      "dashboard.serviceBreakdown",
      [],
      () => queryServiceBreakdown(supabase, access.visibility),
    );
  },
);

export const getDashboardUpcomingEventsSection = cache(
  async (): Promise<DashboardSectionResult<UpcomingEventData[]>> => {
    const access = await getDashboardAccess();
    const supabase = await createAdminClient();

    return loadDashboardSection(
      "Lich sap toi",
      "dashboard.upcomingEvents",
      [],
      () => queryUpcomingEvents(supabase, access),
    );
  },
);

export const getDashboardPaymentRemindersSection = cache(
  async (): Promise<DashboardSectionResult<PaymentReminderData[]>> => {
    const access = await getDashboardAccess();
    const supabase = await createAdminClient();

    return loadDashboardSection(
      "Nhac thu tien",
      "dashboard.paymentReminders",
      [],
      () => queryPaymentReminders(supabase, access.visibility),
    );
  },
);

const getCachedDashboardBootstrap = unstable_cache(
  async (
    userId: string,
    employeeId: string,
    role: Role,
  ): Promise<DashboardBootstrapData> => {
    // userId is part of the unstable_cache key; keep it in the signature.
    void userId;

    const supabase = await createAdminClient();
    const access: DashboardAccess = {
      employeeId: employeeId || null,
      role,
      visibility: visibilityForRole(role),
    };
  const period = currentPeriod();
  const errors: string[] = [];

  const [kpis, revenueChart, serviceBreakdown, upcomingEvents, paymentReminders] =
    await Promise.all([
      safeSection("KPI", errors, emptyKpis(), () =>
        queryKpis(supabase, access.visibility),
      ),
      safeSection("Biểu đồ doanh thu", errors, [], () =>
        queryRevenueChart(supabase, access.visibility),
      ),
      safeSection("Phân bổ dịch vụ", errors, [], () =>
        queryServiceBreakdown(supabase, access.visibility),
      ),
      safeSection("Lịch sắp tới", errors, [], () =>
        queryUpcomingEvents(supabase, access),
      ),
      safeSection("Nhắc thu tiền", errors, [], () =>
        queryPaymentReminders(supabase, access.visibility),
      ),
    ]);

  return {
    access,
    period,
    kpis,
    revenueChart,
    serviceBreakdown,
    upcomingEvents,
    paymentReminders,
    errors,
  };
  },
  ["dashboard-bootstrap-v2"],
  {
    revalidate: DASHBOARD_CRITICAL_CACHE_SECONDS,
    tags: [DASHBOARD_CRITICAL_CACHE_TAG],
  },
);

export const getDashboardBootstrap = cache(async (): Promise<DashboardBootstrapData> => {
  const access = await requireDashboardAccess();
  return getCachedDashboardBootstrap(
    access.userId,
    access.employeeId ?? "",
    access.role,
  );
});

export async function prewarmDashboardBootstrap() {
  await getDashboardBootstrap();
}

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  return (await getDashboardCritical()).kpis;
}

export async function getRevenueChart(): Promise<RevenueChartData[]> {
  return (await getDashboardRevenueChartSection()).data;
}

export async function getServiceBreakdown(): Promise<ServiceBreakdownData[]> {
  return (await getDashboardServiceBreakdownSection()).data;
}

export async function getUpcomingEvents(): Promise<UpcomingEventData[]> {
  return (await getDashboardUpcomingEventsSection()).data;
}

export async function getPaymentReminders(): Promise<PaymentReminderData[]> {
  return (await getDashboardPaymentRemindersSection()).data;
}
