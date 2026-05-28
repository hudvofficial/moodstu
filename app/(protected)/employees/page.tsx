import EmployeeListPage from "@/components/employees/employee-list-page";
import { RealtimeSync } from "@/components/shared/realtime-sync";
import { getEmployeeList, getEmployeeStats } from "@/app/actions/employee-queries";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";

export const metadata = { title: "Nhân viên" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const EMPTY_EMPLOYEE_STATS = {
  total: 0,
  active: 0,
  inactive: 0,
  departments: {},
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageNumber(value: string | undefined) {
  const page = Number.parseInt(value || "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function warnInitialLoadFailure(label: string, error: unknown) {
  console.warn(`[employees] ${label} initial load failed`, error);
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const listParams = {
    search: firstParam(params.search),
    status: firstParam(params.status),
    department: firstParam(params.dept),
    role: firstParam(params.role),
    sort: firstParam(params.sort),
    page: firstParam(params.page),
  };

  const authContext = await getAuthenticatedUserContext();
  const role = authContext?.shellRole;
  const canEdit = role === "admin" || role === "manager";

  const [listSettled, statsSettled] = await Promise.allSettled([
    getEmployeeList(listParams),
    getEmployeeStats(),
  ]);

  if (listSettled.status === "rejected") {
    warnInitialLoadFailure("list", listSettled.reason);
  }
  if (statsSettled.status === "rejected") {
    warnInitialLoadFailure("stats", statsSettled.reason);
  }

  const listResult =
    listSettled.status === "fulfilled" && listSettled.value.success
      ? listSettled.value.data
      : {
          employees: [],
          total: 0,
          page: pageNumber(listParams.page),
          pageSize: 20,
        };
  const statsResult =
    statsSettled.status === "fulfilled" && statsSettled.value.success
      ? statsSettled.value.data
      : EMPTY_EMPLOYEE_STATS;

  if (listSettled.status === "fulfilled" && !listSettled.value.success) {
    warnInitialLoadFailure("list", listSettled.value.error);
  }
  if (statsSettled.status === "fulfilled" && !statsSettled.value.success) {
    warnInitialLoadFailure("stats", statsSettled.value.error);
  }

  return (
    <>
      <RealtimeSync table="employees" prefixes="employees" debounceMs={600} />
      <EmployeeListPage
        employees={listResult.employees}
        total={listResult.total}
        page={listResult.page}
        pageSize={listResult.pageSize}
        stats={statsResult}
        canEdit={canEdit}
      />
    </>
  );
}
