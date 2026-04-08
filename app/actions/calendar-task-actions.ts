"use server";

import { withAuth } from "@/lib/auth_utils";
import { ROLE_PERMISSIONS, normalizeRole } from "@/types/roles";
import { z } from "zod";

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

const isoDateSchema = z.string().trim().min(1, "Ngày không hợp lệ").refine(val => !Number.isNaN(new Date(val).getTime()), "Định dạng ngày không hợp lệ");

/**
 * §1.3a — Giao việc nhanh: Assign task cho nhân viên
 * RBAC: Admin/Manager assign bất kỳ ai. Sale/Media chỉ self.
 */
export async function assignCalendarTask(
  taskId: string,
  assignToEmployeeId: string,
): Promise<ActionResult<boolean>> {
  return withAuth(async (supabase, userId) => {
    const parsed = z.object({
      taskId: z.string().trim().min(1, "Thiếu ID công việc"),
      assignToEmployeeId: z.string().trim().min(1, "Thiếu ID nhân sự nhận việc")
    }).parse({ taskId, assignToEmployeeId });

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

    const { data: oldTask } = await supabase
      .from("work_tasks")
      .select("assigned_to")
      .eq("id", parsed.taskId)
      .single();

    if (!oldTask) throw new Error("Không tìm thấy nhiệm vụ.");

    // Non-admin can only assign to self if task is unassigned or already assigned to them
    if (!isGlobalAdmin) {
      if (oldTask.assigned_to !== null && oldTask.assigned_to !== employee.id) {
        throw new Error("Không có quyền nhận nhiệm vụ của người khác.");
      }
      if (parsed.assignToEmployeeId !== employee.id) {
        throw new Error("Không có quyền giao việc cho người khác.");
      }
    }

    const { error } = await supabase
      .from("work_tasks")
      .update({ assigned_to: parsed.assignToEmployeeId })
      .eq("id", parsed.taskId);

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
    const parsed = z.object({
      employeeId: z.string().trim().min(1, "Thiếu ID nhân sự"),
      dateIso: isoDateSchema
    }).parse({ employeeId, dateIso });

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
      .eq("employee_id", parsed.employeeId)
      .eq("event_date", parsed.dateIso);

    // Check tasks on the same deadline
    const { data: tasks } = await supabase
      .from("work_tasks")
      .select("id, work_type, deadline")
      .eq("assigned_to", parsed.employeeId)
      .eq("deadline", parsed.dateIso);

    const conflicts = [
      ...(schedules || []).map(s => ({
        id: s.id,
        title: s.event_type || "Sự kiện",
        start: s.event_date,
      })),
      ...(tasks || []).map(t => ({
        id: t.id,
        title: t.work_type || "Nhiệm vụ",
        start: t.deadline || parsed.dateIso,
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
    const validTaskId = z.string().trim().min(1, "Thiếu ID công việc").parse(taskId);
    const validatedUpdates = z.object({
      status: z.string().trim().min(1, "Trạng thái không hợp lệ").optional(),
      deadline: isoDateSchema.optional(),
      assigned_to: z.string().trim().min(1, "Người nhận việc không hợp lệ").optional()
    }).parse(updates);

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
      .eq("id", validTaskId)
      .single();

    if (!oldTask) throw new Error("Không tìm thấy nhiệm vụ.");

    if (!isGlobalAdmin && oldTask.assigned_to !== employee.id) {
      throw new Error("Không có quyền sửa nhiệm vụ của người khác.");
    }

    // Build update payload (only changed fields)
    const updatePayload: Record<string, string> = {};
    if (validatedUpdates.status) updatePayload.status = validatedUpdates.status;
    if (validatedUpdates.deadline) updatePayload.deadline = validatedUpdates.deadline;
    if (validatedUpdates.assigned_to) {
      if (!isGlobalAdmin) throw new Error("Không có quyền chuyển giao nhiệm vụ.");
      updatePayload.assigned_to = validatedUpdates.assigned_to;
    }

    if (Object.keys(updatePayload).length === 0) {
      return { updated: false, autoPrintTriggered: false };
    }

    const { error } = await supabase
      .from("work_tasks")
      .update(updatePayload)
      .eq("id", validTaskId);

    if (error) throw new Error("Cập nhật nhiệm vụ thất bại: " + error.message);

    // Auto-print logic: When hậu kỳ tasks complete → check if all tasks done
    let autoPrintTriggered = false;
    const isPostProduction = ["retouch", "dung_phim", "hau_ky_anh"].includes(oldTask.work_type || "");
    const isCompleting = validatedUpdates.status === "hoan_thanh" && oldTask.status !== "hoan_thanh";

    if (isPostProduction && isCompleting && oldTask.contract_id) {
      const { data: pendingTasks } = await supabase
        .from("work_tasks")
        .select("id")
        .eq("contract_id", oldTask.contract_id)
        .neq("status", "hoan_thanh")
        .neq("status", "da_huy")
        .neq("id", validTaskId)
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
