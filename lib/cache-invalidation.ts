import { cacheKeys, revalidateByPrefixes, revalidateMultiple } from "@/lib/swr";

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
    cacheKeys.financeDashboard(month, year),
    "finance-revenue",
    "finance-service-dist",
    "finance-ledger",
    "finance-receipts",
    "finance-receipt-stats",
    "finance-expenses",
    "finance-expense-stats",
    "finance-profit",
    "reports",
    "reports-ledger",
    cacheKeys.financeCashflowForecast(30),
    cacheKeys.financeReceivableAging(),
    cacheKeys.financeBudgetVsActual(month, year),
    cacheKeys.financeAdvancedIntelligence(month, year),
    cacheKeys.goals(),
    cacheKeys.goalsCashflow(),
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

export async function revalidateInventoryCaches(itemId?: string) {
  await revalidateMultiple([
    cacheKeys.inventory(),
    cacheKeys.inventoryStats(),
    cacheKeys.inventorySaleOptions(),
    ...(itemId ? [cacheKeys.inventoryDetail(itemId), cacheKeys.inventoryHistory(itemId)] : []),
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

