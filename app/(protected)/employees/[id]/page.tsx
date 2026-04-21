import { getEmployeeById } from "@/app/actions/employee-queries";
import { notFound } from "next/navigation";
import type { EmployeeDetail } from "@/types/employee";
import EmployeeDetailPage from "@/components/employees/employee-detail-page";
import { RealtimeSync } from "@/components/shared/realtime-sync";

// ═══════════════════════════════════════════
// Employee Detail Page — Server Component
// Gold Standard ref: contracts/[id]/page.tsx
// ═══════════════════════════════════════════

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const result = await getEmployeeById(id);
  if (!result.success || !result.data) return { title: "Nhân viên | Mood Studio" };
  const emp = result.data as EmployeeDetail;
  return { title: `${emp.full_name} | Nhân viên` };
}

export default async function EmployeeDetailRoute(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const result = await getEmployeeById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <>
      <RealtimeSync table="employees" />
      <EmployeeDetailPage employee={result.data as EmployeeDetail} />
    </>
  );
}
