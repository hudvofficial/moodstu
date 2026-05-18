import { revalidatePath, revalidateTag } from "next/cache";

const DASHBOARD_CRITICAL_CACHE_TAG = "dashboard-critical";

type FinanceScope = {
  receipts?: boolean;
  cashflow?: boolean;
  reports?: boolean;
};

type ContractScope = {
  list?: boolean;
  detail?: boolean;
  finance?: boolean | FinanceScope;
  dresses?: boolean;
  printing?: boolean;
  calendar?: boolean;
  dashboard?: boolean;
  productivity?: boolean;
  reports?: boolean;
};

export function invalidateDashboardCritical() {
  revalidateTag(DASHBOARD_CRITICAL_CACHE_TAG, { expire: 0 });
  revalidatePath("/dashboard");
}

export function invalidateFinancePaths(scope: FinanceScope = {}) {
  revalidatePath("/finance");
  if (scope.receipts !== false) revalidatePath("/finance/receipts");
  if (scope.cashflow !== false) revalidatePath("/finance/cashflow");
  if (scope.reports) revalidatePath("/reports");
}

export function invalidateDressPaths(contractId?: string | null) {
  revalidatePath("/dresses");
  revalidatePath("/dresses/rentals");
  if (contractId) invalidateContractPaths(contractId, { detail: true });
}

export function invalidatePrintingPaths(contractId?: string | null) {
  revalidatePath("/printing");
  if (contractId) invalidateContractPaths(contractId, { detail: true });
}

export function invalidateCalendarPaths(options: { productivity?: boolean } = {}) {
  revalidatePath("/calendar");
  if (options.productivity) revalidatePath("/productivity");
}

export function invalidateContractPaths(
  contractId: string,
  scope: ContractScope = {},
) {
  const {
    list = false,
    detail = true,
    finance = false,
    dresses = false,
    printing = false,
    calendar = false,
    dashboard = false,
    productivity = false,
    reports = false,
  } = scope;

  if (list) revalidatePath("/contracts");
  if (detail) revalidatePath(`/contracts/${contractId}`);
  if (finance) {
    invalidateFinancePaths(
      typeof finance === "object" ? { ...finance, reports } : { reports },
    );
  } else if (reports) {
    revalidatePath("/reports");
  }
  if (dresses) {
    revalidatePath("/dresses");
    revalidatePath("/dresses/rentals");
  }
  if (printing) revalidatePath("/printing");
  if (calendar) invalidateCalendarPaths({ productivity });
  else if (productivity) revalidatePath("/productivity");
  if (dashboard) invalidateDashboardCritical();
}
