import { getEmployeeById } from "@/app/actions/employee-queries";
import { notFound } from "next/navigation";
import type { EmployeeDetail } from "@/types/employee";
import EmployeeDetailPage from "@/components/employees/employee-detail-page";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";

export const metadata = { title: "Chi tiết nhân viên" };

export default async function EmployeeDetailRoute(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const result = await getEmployeeById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const authContext = await getAuthenticatedUserContext();
  const role = authContext?.shellRole;
  const canEdit = role === "admin" || role === "manager";

  return <EmployeeDetailPage employee={result.data as EmployeeDetail} canEdit={canEdit} />;
}

