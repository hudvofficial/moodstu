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
  labDebts: () => "lab-debts",
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
  calendar: (month?: number, year?: number) =>
    month && year ? `calendar:${month}:${year}` : "calendar",
  calendarGoogle: (month?: number, year?: number) =>
    month && year ? `calendar-google:${month}:${year}` : "calendar-google",
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
export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  errorRetryCount: 2,
  keepPreviousData: true,
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

/** Revalidate all SWR entries under a namespace, including array keys like [namespace, filters]. */
export async function revalidateByPrefixes(prefixes: string | string[]) {
  const list = Array.isArray(prefixes) ? prefixes : [prefixes];
  await mutate(
    (key: unknown) => list.some((prefix) => cacheKeyMatchesPrefix(key, prefix)),
    undefined,
    { revalidate: true },
  );
}

export { useSWR, mutate };
