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
  inventoryStats: () => "inventory-stats",
  inventoryDetail: (id: string) => `inventory:${id}`,
  inventoryHistory: (id: string) => `inventory:${id}:history`,

  // Dashboard
  dashboard: () => "dashboard",
  dashboardStats: () => "dashboard:stats",

  // Finance
  expenses: (month?: number, year?: number) =>
    month && year ? `expenses:${month}:${year}` : "expenses",
  debts: () => "debts",
  goals: () => "goals",
  financeCategories: (type = "all") => `finance-categories:${type}`,
  financeReceipts: (page = 1, month?: number, year?: number) =>
    month && year ? `finance-receipts:${page}:${year}-${month}` : `finance-receipts:${page}:all`,
  financeExpenses: (page = 1, month?: number, year?: number, approval = "all") =>
    month && year
      ? `finance-expenses:${page}:${year}-${month}:${approval}`
      : `finance-expenses:${page}:all:${approval}`,
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
  financeBudgets: (month: number, year: number) => `finance-budgets:${year}-${month}`,
  financeCloses: (year: number) => `finance-closes:${year}`,
  financeCloseDetail: (id: string) => `finance-close:${id}`,
  financeIntegrity: () => "finance-integrity",
  financeIntelligence: () => "finance-intelligence",
  financeCashflowForecast: (days: number) => `finance-cashflow-forecast:${days}`,
  financeExpenseBreakdown: (month: number, year: number) => `finance-expense-breakdown:${year}-${month}`,
  financeReceivableAging: () => "finance-receivable-aging",
  financeBudgetVsActual: (month: number, year: number) => `finance-budget-actual:${year}-${month}`,

  // Team & Calendar
  team: () => "team",
  calendar: (month?: number, year?: number) =>
    month && year ? `calendar:${month}:${year}` : "calendar",
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

export { useSWR, mutate };
