import { getEmployeeById } from "@/app/actions/employee-queries";
import { notFound } from "next/navigation";
import type { EmployeeDetail } from "@/types/employee";
import EmployeeDetailPage from "@/components/employees/employee-detail-page";

export const metadata = { title: "Nhan vien | Mood Studio" };

export default async function EmployeeDetailRoute(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const result = await getEmployeeById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return <EmployeeDetailPage employee={result.data as EmployeeDetail} />;
}
