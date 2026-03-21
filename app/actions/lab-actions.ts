"use server";

import { revalidatePath } from "next/cache";
import { withAuth } from "@/lib/auth_utils";
import { writeAuditLog, fireAuditLog } from "@/lib/audit";

// ═══════════════════════════════════════════
// Lab Actions — CRUD + Services + Payments
// Split from lab-actions.ts (444 lines) → lab-actions.ts + lab-sync-actions.ts
// ═══════════════════════════════════════════

// ─── Validation helpers ──────────────────
function requireId(id: string, label = "ID"): void {
  if (!id?.trim()) throw new Error(`${label} không được để trống`);
}
function requireName(name: string, label = "Tên"): void {
  if (!name?.trim()) throw new Error(`${label} không được để trống`);
}
function requirePositive(amount: number, label = "Số tiền"): void {
  if (typeof amount !== "number" || amount <= 0) throw new Error(`${label} phải lớn hơn 0`);
}

// ═══ LAB CRUD ═════════════════════════════

export async function addLab(data: { lab_name: string; contact_person: string; phone: string; address: string }) {
  return withAuth(async (supabase) => {
    requireName(data.lab_name, "Tên lab");
    const { error } = await supabase.from("labs").insert(data);
    if (error) throw error;
    fireAuditLog({ action: "CREATE", tableName: "labs", description: `Thêm lab: ${data.lab_name}`, newData: data as unknown as Record<string, unknown> });
    revalidatePath("/printing");
    return null;
  });
}

export async function updateLab(id: string, data: { lab_name: string; contact_person: string; phone: string; address: string }) {
  return withAuth(async (supabase) => {
    requireId(id); requireName(data.lab_name, "Tên lab");
    const { error } = await supabase.from("labs").update(data).eq("id", id);
    if (error) throw error;
    fireAuditLog({ action: "UPDATE", tableName: "labs", recordId: id, description: `Cập nhật lab: ${data.lab_name}` });
    revalidatePath("/printing");
    return null;
  });
}

export async function deleteLab(id: string) {
  return withAuth(async (supabase) => {
    requireId(id);
    const { error } = await supabase.from("labs").delete().eq("id", id);
    if (error) throw error;
    fireAuditLog({ action: "DELETE", tableName: "labs", recordId: id, description: `Xóa lab #${id.substring(0, 8)}` });
    revalidatePath("/printing");
    return null;
  });
}

export async function updateLabStatus(id: string, status: "active" | "inactive") {
  return withAuth(async (supabase) => {
    requireId(id);
    const { error } = await supabase.from("labs").update({ status }).eq("id", id);
    if (error) throw error;
    revalidatePath("/printing");
    return null;
  });
}

// ═══ LAB SERVICES CRUD ════════════════════

export async function addLabService(data: { lab_id: string; item_name: string; cost_price: number }) {
  return withAuth(async (supabase) => {
    requireName(data.item_name, "Tên dịch vụ"); requirePositive(data.cost_price, "Giá dịch vụ");
    const { error } = await supabase.from("lab_services").insert(data);
    if (error) throw error;
    revalidatePath("/printing");
    return null;
  });
}

export async function updateLabService(id: string, data: { item_name: string; cost_price: number }) {
  return withAuth(async (supabase) => {
    requireId(id);
    const { error } = await supabase.from("lab_services").update(data).eq("id", id);
    if (error) throw error;
    revalidatePath("/printing");
    return null;
  });
}

export async function deleteLabService(id: string) {
  return withAuth(async (supabase) => {
    requireId(id);
    const { error } = await supabase.from("lab_services").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/printing");
    return null;
  });
}

// ═══ LAB PAYMENTS ═════════════════════════

export async function recordLabPayment(data: { lab_id: string; amount: number; payment_method: string; note: string }) {
  return withAuth(async (supabase, userId) => {
    requirePositive(data.amount, "Số tiền thanh toán");
    const { error } = await supabase.from("lab_payments").insert({ ...data, created_by: userId });
    if (error) throw error;
    await writeAuditLog({ action: "CREATE", tableName: "lab_payments", description: `Thanh toán lab ${data.amount.toLocaleString("vi-VN")}₫`, newData: data as unknown as Record<string, unknown> });
    revalidatePath("/printing");
    revalidatePath("/finance");
    return null;
  });
}
