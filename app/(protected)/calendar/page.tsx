import { Metadata } from "next";
import { CalendarWrapper } from "@/components/calendar/calendar-wrapper";
import { redirect } from "next/navigation";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import { ROLE_PERMISSIONS } from "@/types/roles";

export const metadata: Metadata = {
  title: "Lịch | Mood Studio",
  description: "Trang hiển thị và quản lý lịch trình Studio",
};

export default async function CalendarPage() {
  const context = await getAuthenticatedUserContext();
  
  // Guard access based on RBAC matrix
  if (!context || !ROLE_PERMISSIONS[context.shellRole]?.includes("calendar")) {
    redirect("/"); 
  }

  return (
    <div className="w-full h-full flex flex-col p-4">
      <h1 className="text-2xl font-bold mb-4">Lịch Studio</h1>
      <div className="flex-1 min-h-0 bg-white rounded-lg shadow-sm border overflow-hidden">
        <CalendarWrapper userRole={context.shellRole} currentUserId={context.employee?.id} />
      </div>
    </div>
  );
}
