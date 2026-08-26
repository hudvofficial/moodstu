import { cacheKeys, mutate, revalidateByPrefixes, revalidateMultiple } from "@/lib/swr";
import { getGlobalQueryClient } from "@/lib/query-client-instance";
import { contractKeys } from "@/lib/hooks/use-contract-queries";

type MonthYear = {
  month?: number;
  year?: number;
};

function currentMonthYear(): Required<MonthYear> {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export async function revalidateFinanceCaches(scope: MonthYear = {}) {
  const { month, year } = { ...currentMonthYear(), ...scope };

  await revalidateByPrefixes([
    "finance-dashboard",
    "finance-revenue",
    "finance-service-dist",
    "finance-ledger",
    "finance-receipts",
    "finance-receipt-stats",
    "finance-expenses",
    "finance-expense-stats",
    "debts",
    "debt-stats",
    "finance-profit",
    "finance-cashflow",
    "finance-upcoming-contracts",
    "finance-pending-collections",
    "reports",
    "reports-ledger",
    "finance-intelligence",
    "finance-integrity",
    cacheKeys.financeCashflowForecast(30),
    cacheKeys.financeReceivableAging(),
    cacheKeys.financeBudgetVsActual(month, year),
    cacheKeys.financeAdvancedIntelligence(month, year),
    "finance-expense-breakdown",
    "finance-categories",
    cacheKeys.financeContracts(),
    cacheKeys.payables(),
    cacheKeys.financeFixedCosts(),
    cacheKeys.financeInvestments(),
    "finance-salaries",
    "finance-budgets",
    "finance-closes",
    "finance-close",
    cacheKeys.goals(),
    cacheKeys.goalsCashflow(),
    "goal-contributions",
  ]);
}

export async function revalidateCrmCaches(entityId?: string) {
  await revalidateByPrefixes([
    cacheKeys.customers(),
    cacheKeys.leads(),
    entityId ? cacheKeys.customerDetail(entityId) : "customer",
    entityId ? cacheKeys.leadDetail(entityId) : "lead",
  ]);
}

export async function revalidateEmployeeCaches(employeeId?: string) {
  await revalidateByPrefixes([
    cacheKeys.employees(),
    employeeId ? `employee:${employeeId}` : "employee",
  ]);
}

export async function revalidateServiceCaches(serviceId?: string) {
  await revalidateByPrefixes([
    cacheKeys.services(),
    cacheKeys.categories(),
    serviceId ? `service:${serviceId}` : "service",
  ]);
}

export async function revalidateContractCaches(contractId?: string) {
  const queryClient = getGlobalQueryClient();

  await Promise.all([
    contractId ? queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) }) : Promise.resolve(),
    contractId ? queryClient.invalidateQueries({ queryKey: contractKeys.drawerExtra(contractId) }) : Promise.resolve(),
    queryClient.invalidateQueries({ queryKey: contractKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: contractKeys.stats() }),
  ]);
}

export async function revalidateContractDetailCaches(contractId: string) {
  const queryClient = getGlobalQueryClient();

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) }),
    queryClient.invalidateQueries({ queryKey: contractKeys.drawerExtra(contractId) }),
  ]);
}

export async function revalidateInventoryCaches(itemId?: string) {
  await Promise.all([
    revalidateByPrefixes(cacheKeys.inventory()),
    revalidateByPrefixes(cacheKeys.inventoryTransactions()),
    revalidateMultiple([
      cacheKeys.inventoryStats(),
      cacheKeys.inventorySaleOptions(),
      ...(itemId ? [cacheKeys.inventoryDetail(itemId), cacheKeys.inventoryHistory(itemId)] : []),
    ]),
  ]);
}

export async function revalidateDressCaches(dressId?: string) {
  await revalidateByPrefixes([
    cacheKeys.dresses(),
    cacheKeys.dressStats(),
    cacheKeys.dressRentals(),
    dressId ? cacheKeys.dressDetail(dressId) : "dress",
  ]);
}

export async function revalidatePrintingCaches(orderId?: string) {
  await revalidateByPrefixes([
    cacheKeys.printingOrders(),
    cacheKeys.printingStats(),
    cacheKeys.labs(),
    cacheKeys.payables(),
    orderId ? cacheKeys.printingDetail(orderId) : "printing",
  ]);
}

export async function revalidateCalendarCaches(month?: number, year?: number) {
  const current = currentMonthYear();
  await revalidateByPrefixes([
    cacheKeys.calendar(month ?? current.month, year ?? current.year),
    cacheKeys.jobs(),
    "productivity",
    "productivity-detail",
  ]);
}

export const invalidateContractAfterWrite = revalidateContractCaches;
export const invalidateContractDetailAfterWrite = revalidateContractDetailCaches;
export const invalidateInventoryAfterWrite = revalidateInventoryCaches;
export const invalidateServiceAfterWrite = revalidateServiceCaches;
export const invalidateEmployeeAfterWrite = revalidateEmployeeCaches;
export const invalidateFinanceAfterWrite = revalidateFinanceCaches;
export const invalidateDressAfterWrite = revalidateDressCaches;
export const invalidatePrintingAfterWrite = revalidatePrintingCaches;
