import { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarWrapper } from "@/components/calendar/calendar-wrapper";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import { ROLE_PERMISSIONS } from "@/types/roles";

export const metadata: Metadata = {
  title: "Lịch",
  description: "Hiển thị và quản lý lịch trình studio",
};

export default async function CalendarPage() {
  const context = await getAuthenticatedUserContext();

  if (!context || !ROLE_PERMISSIONS[context.shellRole]?.includes("calendar")) {
    redirect("/");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-0 sm:p-4">
      <CalendarWrapper userRole={context.shellRole} currentUserId={context.employee?.id} />
    </div>
  );
}
