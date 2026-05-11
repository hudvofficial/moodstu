import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const findings = [];

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

function read(relPath) {
  return readFileSync(path.join(root, relPath), "utf8");
}

function fail(message) {
  findings.push(message);
}

function assertNoMojibake(label, source) {
  const mojibakePatterns = [
    /Ã./,
    /Â./,
    /â(?:†|”|‚|€|œ|„|™|š|›|ž|Ÿ|¢|£|¥|¦|§|¨|©|ª|«|¬|®|¯|°|±|²|³|´|µ|¶|·|¸|¹|º|»|¼|½|¾|¿)/,
    /Ä[^\s]/,
    /Æ[^\s]/,
    /á[º»]/,
    /Ă[^\s]/,
  ];

  for (const pattern of mojibakePatterns) {
    if (pattern.test(source)) {
      fail(`${label} contains mojibake pattern ${pattern}`);
      return;
    }
  }
}

const page = read("app/(protected)/dashboard/page.tsx");
const api = read("lib/api/dashboard.ts");
const types = read("types/dashboard.ts");
const revenueChart = read("components/dashboard/revenue-chart.tsx");
const serviceChart = read("components/dashboard/service-pie-chart.tsx");
const events = read("components/dashboard/upcoming-events.tsx");
const reminders = read("components/dashboard/payment-reminders.tsx");
const dashboardRealtime = read("components/dashboard/dashboard-realtime-refresh.tsx");
const dashboardCacheAction = read("app/actions/dashboard-cache.ts");
const loginClient = read("components/auth/login-page-client.tsx");
const quickAccess = read("components/dashboard/quick-access-grid.tsx");
const navigation = read("lib/navigation.ts");
const kpiCard = read("components/ui/kpi-card.tsx");
const swr = read("lib/swr.ts");
const authUtils = read("lib/auth_utils.ts");
const protectedLayout = read("app/(protected)/layout.tsx");
const middleware = read("lib/supabase/middleware.ts");
const accountDisabledPage = read("app/account-disabled/page.tsx");
const dashboardCriticalKpisMigration = read("supabase/migrations/20260510195000_dashboard_critical_kpis.sql");
const dashboardDeferredSectionsMigration = read("supabase/migrations/20260510201000_dashboard_deferred_sections.sql");
const authProxyHeaders = read("lib/auth-proxy-headers.ts");
const packageJson = JSON.parse(read("package.json"));

const dashboardSources = {
  "dashboard page": page,
  "dashboard api": api,
  "dashboard types": types,
  "revenue chart": revenueChart,
  "service chart": serviceChart,
  "upcoming events": events,
  "payment reminders": reminders,
  "dashboard realtime": dashboardRealtime,
  "dashboard cache action": dashboardCacheAction,
  "quick access": quickAccess,
  navigation,
  "kpi card": kpiCard,
};

for (const [label, source] of Object.entries(dashboardSources)) {
  assertNoMojibake(label, source);
}

const combinedDashboard = [
  page,
  api,
  revenueChart,
  serviceChart,
  events,
  reminders,
].join("\n");

for (const forbidden of [
  "MOCK_DATA",
  "MOCK_EVENTS",
  "MOCK_REMINDERS",
  "45.500.000",
  "23.200.000",
]) {
  if (combinedDashboard.includes(forbidden)) {
    fail(`production dashboard still contains ${forbidden}`);
  }
}

if (!page.includes("getDashboardCritical")) {
  fail("dashboard page does not render from critical dashboard data");
}
if (!page.includes("<Suspense")) {
  fail("dashboard page does not stream deferred sections with Suspense");
}
if (!page.includes('export const dynamic = "force-dynamic"')) {
  fail("dashboard page is not force-dynamic");
}
if (!page.includes("<DashboardRealtimeRefresh")) {
  fail("dashboard page is missing dashboard realtime refresh bridge");
}
if (!dashboardRealtime.includes('"payments"') || !dashboardRealtime.includes('"receipts"')) {
  fail("dashboard realtime bridge is missing finance source refresh");
}
if (!dashboardRealtime.includes('"payment_plans"')) {
  fail("dashboard realtime bridge is missing payment_plans refresh");
}
if (!dashboardRealtime.includes("invalidateDashboardCache")) {
  fail("dashboard realtime bridge does not invalidate dashboard cache before refresh");
}
if (!dashboardCacheAction.includes("revalidateTag") || !dashboardCacheAction.includes('revalidatePath("/dashboard")')) {
  fail("dashboard cache action does not invalidate tag and path");
}
if (loginClient.includes("prewarmDashboardForNavigation") || loginClient.includes("DASHBOARD_PREWARM_BUDGET_MS")) {
  fail("login success path still waits on dashboard prewarm");
}
if (loginClient.includes("Promise.race")) {
  fail("login success path still races navigation against a dashboard warmup budget");
}
if (!api.includes("requireDashboardAccess")) {
  fail("dashboard data loader is missing explicit dashboard access guard");
}
if (!api.includes("visibilityForRole")) {
  fail("dashboard data loader is missing role visibility contract");
}
if (!api.includes('role === "admin" || role === "manager"')) {
  fail("dashboard financial visibility is not restricted to admin/manager");
}
if (!api.includes('.is("contract_id", null)')) {
  fail("dashboard revenue does not include standalone receipt SSOT filter");
}
if (!api.includes("safeSection")) {
  fail("dashboard data loader does not expose controlled section errors");
}
if (!api.includes("prewarmDashboardCritical")) {
  fail("dashboard data loader is missing critical prewarm entrypoint");
}
if (!api.includes("profileDashboardSection")) {
  fail("dashboard data loader is missing section timing profiling");
}
if (!api.includes("DASHBOARD_CRITICAL_CACHE_TAG") || !api.includes("tags: [DASHBOARD_CRITICAL_CACHE_TAG]")) {
  fail("dashboard critical cache is missing tag-based invalidation");
}
if (page.includes("DashboardWarmup")) {
  fail("dashboard still mounts startup warmup prefetch work");
}
if (
  !dashboardRealtime.includes('supabase.channel("dashboard-realtime")') ||
  dashboardRealtime.includes("useRealtime(") ||
  !dashboardCacheAction.includes("changedTables") ||
  !dashboardCacheAction.includes("DASHBOARD_CRITICAL_TABLES")
) {
  fail("dashboard realtime/cache budget is missing single-channel refresh or scoped invalidation");
}
if (!api.includes('rpc("dashboard_critical_kpis"') || !api.includes("queryKpisFallback")) {
  fail("dashboard critical KPI loader does not use the aggregate RPC with fallback");
}
if (
  !dashboardCriticalKpisMigration.includes("CREATE OR REPLACE FUNCTION public.dashboard_critical_kpis") ||
  !dashboardCriticalKpisMigration.includes("GRANT EXECUTE ON FUNCTION public.dashboard_critical_kpis")
) {
  fail("dashboard critical KPI RPC migration is missing or not permissioned");
}
if (
  !api.includes('rpc("dashboard_revenue_chart"') ||
  !api.includes('rpc("dashboard_service_breakdown"') ||
  !api.includes("queryRevenueChartFallback") ||
  !api.includes("queryServiceBreakdownFallback")
) {
  fail("dashboard deferred sections do not use aggregate RPCs with fallbacks");
}
if (
  !dashboardDeferredSectionsMigration.includes("CREATE OR REPLACE FUNCTION public.dashboard_revenue_chart") ||
  !dashboardDeferredSectionsMigration.includes("CREATE OR REPLACE FUNCTION public.dashboard_service_breakdown") ||
  !dashboardDeferredSectionsMigration.includes("GRANT EXECUTE ON FUNCTION public.dashboard_revenue_chart") ||
  !dashboardDeferredSectionsMigration.includes("GRANT EXECUTE ON FUNCTION public.dashboard_service_breakdown")
) {
  fail("dashboard deferred section RPC migration is missing or not permissioned");
}
if (!api.includes("queryWorkTasks") || !api.includes('source: "work_tasks"')) {
  fail("dashboard upcoming work does not include work_tasks");
}
if (!api.includes('from("schedules")') || !api.includes('from("contract_events")')) {
  fail("dashboard upcoming work does not include both schedules and contract_events");
}
if (!api.includes('from("payment_plans")') || !api.includes("isPaidPlanStatus")) {
  fail("dashboard collections reminders do not prioritize payment_plans");
}
if (!types.includes("DashboardBootstrapData")) {
  fail("dashboard bootstrap data type is missing");
}
if (!types.includes("DashboardCriticalData") || !types.includes("DashboardSectionResult")) {
  fail("dashboard split data types are missing");
}
if (!types.includes('"work_tasks"') || !types.includes('"payment_plans" | "contracts"')) {
  fail("dashboard types do not expose release-final source contracts");
}
if (!quickAccess.includes("canAccess(role, mod.id)")) {
  fail("quick access grid is not role-filtered");
}
if (!navigation.includes("Hợp đồng") || !navigation.includes("Tài chính")) {
  fail("navigation labels are not corrected");
}
if (!kpiCard.includes("↑") || !kpiCard.includes("↓")) {
  fail("KPI trend arrows are still mojibake");
}
if (!swr.includes("dashboardBootstrap")) {
  fail("SWR cache keys are missing dashboardBootstrap namespace");
}
if (!authUtils.includes("isEmployeeDisabled") || !authUtils.includes("disabledEmployee")) {
  fail("auth context does not expose inactive/deleted employee gate");
}
if (!protectedLayout.includes("context.isEmployeeDisabled") || !protectedLayout.includes("/account-disabled")) {
  fail("protected layout does not redirect disabled employee accounts");
}
if (!middleware.includes("/account-disabled")) {
  fail("account-disabled route is not public in middleware");
}
if (
  !middleware.includes("writeAuthProxyHeaders") ||
  !authUtils.includes("readAuthProxyClaims") ||
  !authProxyHeaders.includes("x-mood-auth-source") ||
  !authUtils.includes("AUTH_CONTEXT_PROFILE")
) {
  fail("auth shell hot path is missing proxy-claim reuse or profiling");
}
if (!accountDisabledPage.includes("Tài khoản đã bị vô hiệu hóa") || !accountDisabledPage.includes("logout")) {
  fail("account disabled page is missing release UX");
}
if (!packageJson.scripts?.["verify:dashboard"]) {
  fail("package.json is missing verify:dashboard");
}
if (!packageJson.scripts?.["smoke:dashboard"]) {
  fail("package.json is missing smoke:dashboard");
}

loadEnvFile(path.join(root, ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (url && serviceKey) {
  const serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const table of [
    "contracts",
    "payments",
    "receipts",
    "payment_plans",
    "contract_events",
    "schedules",
    "work_tasks",
  ]) {
    const { error } = await serviceClient.from(table).select("id").limit(1);
    if (error) {
      fail(`remote ${table} probe failed: ${error.message}`);
    }
  }
} else {
  console.warn("Skipping remote Supabase probes; env vars are missing.");
}

if (findings.length > 0) {
  console.error("Dashboard verification failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Dashboard verification passed.");
