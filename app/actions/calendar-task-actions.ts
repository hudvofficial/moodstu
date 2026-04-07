"use server";

import { withAuth } from "@/lib/auth_utils";
import { ROLE_PERMISSIONS, normalizeRole } from "@/types/roles";

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * §1.3a — Giao việc nhanh: Assign task cho nhân viên
 * RBAC: Admin/Manager assign bất kỳ ai. Sale/Media chỉ self.
 */
export async function assignCalendarTask(
  taskId: string,
  assignToEmployeeId: string,
): Promise<ActionResult<boolean>> {
  return withAuth(async (supabase, userId) => {
    const { data: employee } = await supabase
      .from("employees")
      .select("id, role")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (!employee) throw new Error("Chưa thiết lập hồ sơ nhân sự");
    
    const role = normalizeRole(employee.role);
    if (!ROLE_PERMISSIONS[role]?.includes("calendar")) {
      throw new Error("Bạn không có quyền chỉnh sửa dữ liệu lịch.");
    }

    const isGlobalAdmin = role === "admin" || role === "manager";

    // Non-admin can only assign to self
    if (!isGlobalAdmin && assignToEmployeeId !== employee.id) {
      throw new Error("Không có quyền giao việc cho người khác.");
    }

    const { error } = await supabase
      .from("work_tasks")
      .update({ assigned_to: assignToEmployeeId })
      .eq("id", taskId);

    if (error) throw new Error("Lỗi giao việc: " + error.message);

    return true;
  });
}

/**
 * §1.3b — Kiểm tra trùng lịch nhân viên trong khoảng thời gian
 * Trả về danh sách events bị conflict
 */
export async function checkEmployeeAvailability(
  employeeId: string,
  dateIso: string,
): Promise<ActionResult<{ hasConflict: boolean; conflicts: { id: string; title: string; start: string }[] }>> {
  return withAuth(async (supabase, userId) => {
    const { data: employee } = await supabase
      .from("employees")
      .select("id, role")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (!employee) throw new Error("Chưa thiết lập hồ sơ nhân sự");

    const role = normalizeRole(employee.role);
    if (!ROLE_PERMISSIONS[role]?.includes("calendar")) {
      throw new Error("Không có quyền truy cập lịch.");
    }

    // Check schedules on the same date
    const { data: schedules } = await supabase
      .from("schedules")
      .select("id, event_type, event_date")
      .eq("employee_id", employeeId)
      .eq("event_date", dateIso);

    // Check tasks on the same deadline
    const { data: tasks } = await supabase
      .from("work_tasks")
      .select("id, work_type, deadline")
      .eq("assigned_to", employeeId)
      .eq("deadline", dateIso);

    const conflicts = [
      ...(schedules || []).map(s => ({
        id: s.id,
        title: s.event_type || "Sự kiện",
        start: s.event_date,
      })),
      ...(tasks || []).map(t => ({
        id: t.id,
        title: t.work_type || "Nhiệm vụ",
        start: t.deadline || dateIso,
      })),
    ];

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  });
}

/**
 * §1.3c — Cập nhật chi tiết task + Auto-print trigger
 * Khi post-production tasks hoàn thành → trigger tạo in order (nếu applicable)
 */
export async function updateCalendarTaskDetails(
  taskId: string,
  updates: {
    status?: string;
    deadline?: string;
    assigned_to?: string;
  },
): Promise<ActionResult<{ updated: boolean; autoPrintTriggered: boolean }>> {
  return withAuth(async (supabase, userId) => {
    const { data: employee } = await supabase
      .from("employees")
      .select("id, role")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (!employee) throw new Error("Chưa thiết lập hồ sơ nhân sự");
    
    const role = normalizeRole(employee.role);
    if (!ROLE_PERMISSIONS[role]?.includes("calendar")) {
      throw new Error("Bạn không có quyền thao tác dữ liệu lịch.");
    }

    const isGlobalAdmin = role === "admin" || role === "manager";

    // Check ownership
    const { data: oldTask } = await supabase
      .from("work_tasks")
      .select("assigned_to, contract_id, work_type, status")
      .eq("id", taskId)
      .single();

    if (!oldTask) throw new Error("Không tìm thấy nhiệm vụ.");

    if (!isGlobalAdmin && oldTask.assigned_to !== employee.id) {
      throw new Error("Không có quyền sửa nhiệm vụ của người khác.");
    }

    // Build update payload (only changed fields)
    const updatePayload: Record<string, string> = {};
    if (updates.status) updatePayload.status = updates.status;
    if (updates.deadline) updatePayload.deadline = updates.deadline;
    if (updates.assigned_to) {
      if (!isGlobalAdmin) throw new Error("Không có quyền chuyển giao nhiệm vụ.");
      updatePayload.assigned_to = updates.assigned_to;
    }

    if (Object.keys(updatePayload).length === 0) {
      return { updated: false, autoPrintTriggered: false };
    }

    const { error } = await supabase
      .from("work_tasks")
      .update(updatePayload)
      .eq("id", taskId);

    if (error) throw new Error("Cập nhật nhiệm vụ thất bại: " + error.message);

    // Auto-print logic: When hậu kỳ tasks complete → check if all tasks done
    let autoPrintTriggered = false;
    const isPostProduction = ["retouch", "dung_phim", "hau_ky_anh"].includes(oldTask.work_type || "");
    const isCompleting = updates.status === "hoan_thanh" && oldTask.status !== "hoan_thanh";

    if (isPostProduction && isCompleting && oldTask.contract_id) {
      // Check if all tasks for this contract are now complete
      const { data: pendingTasks } = await supabase
        .from("work_tasks")
        .select("id")
        .eq("contract_id", oldTask.contract_id)
        .neq("status", "hoan_thanh")
        .neq("status", "da_huy")
        .neq("id", taskId)
        .limit(1);

      if (!pendingTasks || pendingTasks.length === 0) {
        // All tasks done → auto-print could be triggered here
        // For now, just flag it — actual print order creation is Phase 03+
        autoPrintTriggered = true;
        console.log(`[AutoPrint] Contract ${oldTask.contract_id} all tasks done — ready for print order`);
      }
    }

    return { updated: true, autoPrintTriggered };
  });
}
