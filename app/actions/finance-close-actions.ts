"use server";

import { withAdmin } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { isMissingRpcError } from "@/lib/finance-utils";
import { createCloseSchema } from "@/lib/validations/finance.schema";

// ═══════════════════════════════════════════
// Finance Close Management Actions
// ═══════════════════════════════════════════

export async function createMonthlyClose(period: string) {
  return withAdmin(async (supabase, userId) => {
    const parsed = createCloseSchema.safeParse({ period });
    if (!parsed.success) {
      throw new Error(`Dữ liệu không hợp lệ: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
    }

    // Insert close record
    const { data: close, error } = await supabase
      .from("finance_monthly_closes")
      .insert({
        period: parsed.data.period,
        status: "draft",
        created_by: userId
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") { // Unique violation
        throw new Error(`Kỳ chốt sổ ${parsed.data.period} đã tồn tại!`);
      }
      throw new Error(`Lỗi tạo kỳ chốt sổ: ${error.message}`);
    }

    // Insert 8 workflow steps
    const steps = [
      { step_number: 1, step_name: "Kiểm kê quỹ tiền mặt" },
      { step_number: 2, step_name: "Đối soát ngân hàng" },
      { step_number: 3, step_name: "Xác nhận công nợ thẻ/tín dụng" },
      { step_number: 4, step_name: "Thanh toán lương nhân viên" },
      { step_number: 5, step_name: "Thanh toán/nhắc nợ đối tác" },
      { step_number: 6, step_name: "Khấu hao tài sản & phân bổ chiphí" },
      { step_number: 7, step_name: "Chốt báo cáo lãi lỗ (P&L)" },
      { step_number: 8, step_name: "Khóa sổ kỳ kế toán" }
    ];

    const tasks = steps.map(s => ({
      close_id: close.id,
      step_number: s.step_number,
      step_name: s.step_name,
      status: "chua_bat_dau"
    }));

    const { error: taskError } = await supabase.from("finance_close_tasks").insert(tasks);
    if (taskError) {
      throw new Error(`Lỗi khởi tạo các bước chốt sổ: ${taskError.message}`);
    }

    await writeAuditLog({ 
      action: "CREATE", 
      tableName: "finance_monthly_closes", 
      recordId: close.id, 
      newData: { period },
      description: `Khởi tạo kỳ chốt sổ tháng ${period}` 
    });
    
    revalidatePath("/finance");
    return { closeId: close.id };
  });
}

export async function advanceCloseTask(closeId: string, stepNumber: number, newStatus: string) {
  return withAdmin(async (supabase, userId) => {
    // Pass p_actor_id from withAdmin-verified userId
    const { error } = await supabase.rpc("advance_close_task", {
      p_close_id: closeId,
      p_step_number: stepNumber,
      p_new_status: newStatus,
      p_actor_id: userId
    });

    if (error && isMissingRpcError(error)) {
      const { data: close, error: closeError } = await supabase
        .from("finance_monthly_closes")
        .select("status")
        .eq("id", closeId)
        .single();
      if (closeError || !close) throw new Error(`Khong tim thay ky chot so: ${closeError?.message || ""}`);
      if (close.status === "locked") throw new Error("Ky da khoa so, khong the thay doi.");

      if (stepNumber > 1) {
        const { data: previousTask, error: previousError } = await supabase
          .from("finance_close_tasks")
          .select("status")
          .eq("close_id", closeId)
          .eq("step_number", stepNumber - 1)
          .single();
        if (previousError || previousTask?.status !== "hoan_thanh") {
          throw new Error(`Buoc ${stepNumber - 1} chua hoan thanh.`);
        }
      }

      const { data: currentTask, error: currentError } = await supabase
        .from("finance_close_tasks")
        .select("status, started_at")
        .eq("close_id", closeId)
        .eq("step_number", stepNumber)
        .single();
      if (currentError || !currentTask) throw new Error(`Khong tim thay buoc ${stepNumber}: ${currentError?.message || ""}`);

      const allowed =
        (currentTask.status === "chua_bat_dau" && newStatus === "dang_thuc_hien") ||
        (currentTask.status === "dang_thuc_hien" && newStatus === "cho_duyet") ||
        (currentTask.status === "cho_duyet" && (newStatus === "hoan_thanh" || newStatus === "co_van_de")) ||
        (currentTask.status === "co_van_de" && newStatus === "dang_thuc_hien");
      if (!allowed) throw new Error(`Khong the chuyen tu ${currentTask.status} sang ${newStatus}.`);

      const now = new Date().toISOString();
      const taskUpdate: Record<string, string | null> = {
        status: newStatus,
        updated_at: now,
      };
      if (newStatus === "dang_thuc_hien" && !currentTask.started_at) taskUpdate.started_at = now;
      if (newStatus === "hoan_thanh") taskUpdate.completed_at = now;

      const { error: taskError } = await supabase
        .from("finance_close_tasks")
        .update(taskUpdate)
        .eq("close_id", closeId)
        .eq("step_number", stepNumber);
      if (taskError) throw new Error(`Khong the cap nhat buoc chot so: ${taskError.message}`);

      const closeUpdate = stepNumber === 8 && newStatus === "hoan_thanh"
        ? { status: "locked", locked_by: userId, locked_at: now, updated_at: now }
        : { status: close.status === "draft" ? "in_progress" : close.status, updated_at: now };
      const { error: closeUpdateError } = await supabase
        .from("finance_monthly_closes")
        .update(closeUpdate)
        .eq("id", closeId);
      if (closeUpdateError) throw new Error(`Khong the cap nhat ky chot so: ${closeUpdateError.message}`);

      await writeAuditLog({
        action: "UPDATE",
        tableName: "finance_close_tasks",
        description: `Cap nhat buoc ${stepNumber} chot so sang trang thai ${newStatus}`,
      });

      revalidatePath("/finance");
      return null;
    }

    if (error) throw new Error(`Lỗi cập nhật trạng thái: ${error.message}`);

    await writeAuditLog({ 
      action: "UPDATE", 
      tableName: "finance_close_tasks", 
      description: `Cập nhật bước ${stepNumber} chốt sổ sang trạng thái ${newStatus}` 
    });

    revalidatePath("/finance");
    return null;
  });
}

// ─── Helper: Resolve auth.users UUIDs to employee names ────────────
async function resolveEmployeeNames(
  supabase: Parameters<Parameters<typeof withAdmin>[0]>[0],
  userIds: (string | null)[]
): Promise<Record<string, string>> {
  const validIds = userIds.filter((id): id is string => id !== null);
  if (validIds.length === 0) return {};
  
  const { data: employees } = await supabase
    .from("employees")
    .select("auth_user_id, full_name")
    .in("auth_user_id", validIds);

  const map: Record<string, string> = {};
  employees?.forEach(e => {
    if (e.auth_user_id) map[e.auth_user_id] = e.full_name;
  });
  return map;
}

export async function getCloseDetail(closeId: string) {
  return withAdmin(async (supabase) => {
    // Blocker 2 fix: no embedded select on auth.users FK
    const { data: close, error } = await supabase
      .from("finance_monthly_closes")
      .select("*")
      .eq("id", closeId)
      .single();

    if (error) throw new Error(`Lỗi tải kỳ chốt sổ: ${error.message}`);

    const { data: tasks, error: tasksError } = await supabase
      .from("finance_close_tasks")
      .select("*")
      .eq("close_id", closeId)
      .order("step_number", { ascending: true });

    if (tasksError) throw new Error(`Lỗi tải chi tiết: ${tasksError.message}`);

    // Resolve user names via employees table
    const userIds = [
      close.locked_by,
      close.created_by,
      ...(tasks || []).map(t => t.assignee_id)
    ];
    const nameMap = await resolveEmployeeNames(supabase, userIds);

    return { 
      close: {
        ...close,
        locked_user_name: close.locked_by ? (nameMap[close.locked_by] ?? null) : null,
        created_user_name: close.created_by ? (nameMap[close.created_by] ?? null) : null
      }, 
      tasks: (tasks || []).map(t => ({
        ...t,
        assignee_name: t.assignee_id ? (nameMap[t.assignee_id] ?? null) : null
      }))
    };
  });
}

export async function listCloses(year?: number) {
  return withAdmin(async (supabase) => {
    let query = supabase
      .from("finance_monthly_closes")
      .select("*")
      .order("period", { ascending: false });

    if (year) {
      query = query.like("period", `${year}-%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Lỗi tải danh sách chốt sổ: ${error.message}`);

    // Resolve locked_by names
    const userIds = (data || []).map(c => c.locked_by);
    const nameMap = await resolveEmployeeNames(supabase, userIds);

    return (data || []).map(c => ({
      ...c,
      locked_user_name: c.locked_by ? (nameMap[c.locked_by] ?? null) : null
    }));
  });
}
