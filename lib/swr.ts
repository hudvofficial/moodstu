import useSWR, { mutate, type SWRConfiguration } from "swr";

// ============================================
// Cache Key Factory — V2 Mood Studio SSOT
// Source: Coffee lib/swr.ts, adapted for V2 modules
// ============================================
export const cacheKeys = {
  // CRM
  customers: () => "customers",
  customerDetail: (id: string) => `customer:${id}`,
  leads: () => "leads",
  leadDetail: (id: string) => `lead:${id}`,

  // Contracts
  contracts: () => "contracts",
  contractDetail: (id: string) => `contract:${id}`,
  contractEvents: (contractId: string) => `contract:${contractId}:events`,
  contractDetails: (contractId: string) => `contract:${contractId}:details`,
  contractReceipts: (contractId: string) => `contract:${contractId}:receipts`,
  contractPaymentPlans: (contractId: string) => `contract:${contractId}:plans`,

  // Payments
  payments: () => "payments",
  receipts: (contractId?: string) => contractId ? `receipts:${contractId}` : "receipts",

  // Dresses
  dresses: () => "dresses",
  dressStats: () => "dress-stats",
  dressDetail: (id: string) => `dress:${id}`,
  dressRentals: () => "dress-rentals",

  // Inventory (consumables)
  inventory: () => "inventory",
  inventorySaleOptions: () => "inventory:sale-options",
  inventoryStats: () => "inventory-stats",
  inventoryDetail: (id: string) => `inventory:${id}`,
  inventoryHistory: (id: string) => `inventory:${id}:history`,
  inventoryTransactions: () => "inventory-transactions",

  // Dashboard
  dashboard: () => "dashboard",
  dashboardBootstrap: () => "dashboard:bootstrap",
  dashboardStats: () => "dashboard:stats",
  reportsSnapshot: (periodKey: string) => `reports:${periodKey}`,
  reportsLedger: (start: string, end: string, type = "all") => `reports-ledger:${start}:${end}:${type}`,

  // Finance
  expenses: (month?: number, year?: number) =>
    month && year ? `expenses:${month}:${year}` : "expenses",
  debts: (page = 1) => `debts:${page}`,
  debtStats: () => "debt-stats",
  goals: () => "goals",
  goalsCashflow: () => "goals-cashflow",
  goalContributions: (goalId: string, page = 1) => `goal-contributions:${goalId}:${page}`,
  financeCategories: (type = "all") => `finance-categories:${type}`,
  financeReceipts: (page = 1, month?: number, year?: number) =>
    month && year ? `finance-receipts:${page}:${year}-${month}` : `finance-receipts:${page}:all`,
  financeReceiptStats: (month?: number, year?: number) =>
    month && year ? `finance-receipt-stats:${year}-${month}` : "finance-receipt-stats:all",
  financeExpenses: (page = 1, month?: number, year?: number, approval = "all") =>
    month && year
      ? `finance-expenses:${page}:${year}-${month}:${approval}`
      : `finance-expenses:${page}:all:${approval}`,
  financeExpenseStats: (month?: number, year?: number) =>
    month && year ? `finance-expense-stats:${year}-${month}` : "finance-expense-stats:all",
  financeDashboard: (month: number, year: number) => `finance-dashboard:${year}-${month}`,
  financeRevenue: (year: number) => `finance-revenue:${year}`,
  financeServiceDist: (month: number, year: number) => `finance-service-dist:${year}-${month}`,
  financeUpcoming: () => "finance-upcoming-contracts",
  financePending: () => "finance-pending-collections",
  financeProfitReport: (status: string, from: string, to: string, page = 1) =>
    `finance-profit:${status}:${from}:${to}:${page}`,
  financeCashflow: (start: string, end: string) => `finance-cashflow:${start}:${end}`,
  financeLedger: (page: number, month: number, year: number, type?: string) =>
    `finance-ledger:${page}:${year}-${month}:${type || "all"}`,
  financeContracts: () => "finance-contract-options",
  payables: () => "finance-payables",
  financeFixedCosts: () => "finance-fixed-costs",
  financeInvestments: () => "finance-investments",
  financeSalaries: (month: number, year: number) => `finance-salaries:${year}-${month}`,
  financeVendorCosts: (month: number, year: number) => `finance-vendor-costs:${year}-${month}`,
  financeBudgets: (month: number, year: number) => `finance-budgets:${year}-${month}`,
  financeCloses: (year: number) => `finance-closes:${year}`,
  financeCloseDetail: (id: string) => `finance-close:${id}`,
  financeIntegrity: () => "finance-integrity",
  financeIntelligence: () => "finance-intelligence",
  financeCashflowForecast: (days: number) => `finance-cashflow-forecast:${days}`,
  financeExpenseBreakdown: (month: number, year: number) => `finance-expense-breakdown:${year}-${month}`,
  financeReceivableAging: () => "finance-receivable-aging",
  financeBudgetVsActual: (month: number, year: number) => `finance-budget-actual:${year}-${month}`,
  financeAdvancedIntelligence: (month: number, year: number) => `finance-advanced-intelligence:${year}-${month}`,

  // Team & Calendar
  team: () => "team",
  calendar: (month?: number, year?: number, view?: string) =>
    month && year ? `calendar:${month}:${year}${view ? `:${view}` : ""}` : "calendar",
  calendarGoogle: (month?: number, year?: number, view?: string) =>
    month && year ? `calendar-google:${month}:${year}${view ? `:${view}` : ""}` : "calendar-google",
  jobs: () => "jobs",
  productivity: (period: string, viewMode: string) =>
    `productivity:${viewMode}:${period}`,
  productivityJobDetails: (employeeId: string, start: string, end: string) =>
    `productivity-detail:${employeeId}:${start}:${end}`,

  // Services
  services: () => "services",
  categories: () => "categories",

  // System
  employees: () => "employees",
  notifications: () => "notifications",
  settings: () => "settings",
  studioInfo: () => "studio-info",
  printingOrders: () => "printing-orders",
  printingStats: () => "printing-stats",
  printingDetail: (id: string) => `printing:${id}`,
  labs: () => "labs",
  labDetail: (id: string) => `lab:${id}`,
};

// ============================================
// Default SWR config
// ============================================

// T-20260825: "unexpected response..." = Next.js trả nhầm response giữa 2 request
// Server Action đồng thời (đã trace + verify kỹ bằng render thật — không phải lỗi
// dữ liệu, xem agent/HANDOFFS/T-20260825-finance-nav-redirect-bug.spec.md). Retry
// ngay như mặc định SWR sẽ CHỒNG THÊM request đồng thời, làm tăng khả năng trộn
// tiếp — cần lùi retry ra xa hơn nhiều + giới hạn số lần cho đúng loại lỗi này.
const SWAPPED_RESPONSE_PATTERN = /unexpected response was received from the server/i;

export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  errorRetryCount: 2,
  keepPreviousData: true,
  onErrorRetry: (error, key, config, revalidate, revalidateOpts) => {
    const retryCount = revalidateOpts.retryCount ?? 0;

    if (SWAPPED_RESPONSE_PATTERN.test(String((error as Error)?.message ?? error))) {
      if (retryCount >= 1) return;
      setTimeout(() => revalidate(revalidateOpts), 4000);
      return;
    }

    // Hành vi cho các lỗi khác — giữ đúng số lần thử lại đã cấu hình (errorRetryCount),
    // giãn cách tăng dần theo cấp số nhân.
    const maxRetryCount = config.errorRetryCount ?? 2;
    if (retryCount >= maxRetryCount) return;
    const timeout = (config.errorRetryInterval ?? 5000) * Math.pow(2, retryCount);
    setTimeout(() => revalidate(revalidateOpts), timeout);
  },
};

// ============================================
// Mutate helpers — dùng sau create/update/delete
// ============================================
export async function revalidate(key: string) {
  await mutate(key);
}

export async function revalidateMultiple(keys: string[]) {
  await Promise.all(keys.map((key) => mutate(key)));
}

/** Pre-warm SWR cache — data ready before user navigates */
export function prefetch<T>(key: string, fetcher: () => Promise<T>) {
  mutate(key, fetcher(), { revalidate: false });
}

function cacheKeyMatchesPrefix(key: unknown, prefix: string) {
  const textKey = Array.isArray(key) ? key[0] : key;
  if (typeof textKey !== "string") return false;
  return (
    textKey === prefix ||
    textKey.startsWith(`${prefix}:`) ||
    textKey.startsWith(`${prefix}-`) ||
    textKey.startsWith(`${prefix}?`)
  );
}

/** Revalidate all SWR entries under a namespace, including array keys like [namespace, filters].
 *  KHÔNG truyền data=undefined kèm revalidate — nếu truyền, SWR sẽ xoá cache ngay
 *  trước khi refetch xong, làm component thấy data=undefined trong khoảng giữa và
 *  flash skeleton (gây "auto-refresh" trên trang list). */
export async function revalidateByPrefixes(prefixes: string | string[]) {
  const list = Array.isArray(prefixes) ? prefixes : [prefixes];
  await mutate((key: unknown) =>
    list.some((prefix) => cacheKeyMatchesPrefix(key, prefix)),
  );
}

// ============================================
// Optimistic list-cache helpers — dùng trong apply/rollback của runOptimisticMutation
// (bổ trợ cho lib/optimistic-mutation.ts, KHÔNG thay thế nó)
// ============================================
type ListCache<T> = { data: T[]; count: number };

/** Patch tại chỗ 1 item trong MỌI cache list của 1 namespace (vd key ["dresses", filters]). */
export function patchListCache<T extends { id: string }>(
  namespace: string,
  id: string,
  patch: Partial<T>,
) {
  return mutate(
    (key: unknown) => cacheKeyMatchesPrefix(key, namespace),
    (cur: ListCache<T> | undefined) =>
      cur
        ? { ...cur, data: cur.data.map((it) => (it.id === id ? { ...it, ...patch } : it)) }
        : cur,
    { revalidate: false },
  );
}

/** Gỡ 1 item khỏi MỌI cache list của namespace (cho delete). */
export function removeFromListCache<T extends { id: string }>(
  namespace: string,
  id: string,
) {
  return mutate(
    (key: unknown) => cacheKeyMatchesPrefix(key, namespace),
    (cur: ListCache<T> | undefined) =>
      cur
        ? {
            ...cur,
            data: cur.data.filter((it) => it.id !== id),
            count: Math.max(0, cur.count - 1),
          }
        : cur,
    { revalidate: false },
  );
}

/** Generic optimistic primitive: chạy `updater` trên MỌI cache list của namespace, KHÔNG revalidate.
 *  Mỗi module tự viết updater theo shape riêng (vd dress {data,count}, customer {customers,total}). */
export function mutateListCache(
  namespace: string,
  updater: (cur: unknown) => unknown,
) {
  return mutate(
    (key: unknown) => cacheKeyMatchesPrefix(key, namespace),
    updater,
    { revalidate: false },
  );
}

export { useSWR, mutate };
