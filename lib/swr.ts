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

  // Team & Calendar
  team: () => "team",
  calendar: (month?: number, year?: number) =>
    month && year ? `calendar:${month}:${year}` : "calendar",
  jobs: () => "jobs",

  // Services
  services: () => "services",
  categories: () => "categories",

  // System
  employees: () => "employees",
  notifications: () => "notifications",
  settings: () => "settings",
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
