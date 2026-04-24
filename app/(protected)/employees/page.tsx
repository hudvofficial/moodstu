import EmployeeListPage from "@/components/employees/employee-list-page";
import { RealtimeSync } from "@/components/shared/realtime-sync";

export const metadata = { title: "Nhan vien | Mood Studio" };

export default function EmployeesPage() {
  return (
    <>
      <RealtimeSync table="employees" prefixes="employees" />
      <EmployeeListPage />
    </>
  );
}
