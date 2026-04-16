"use server";

import { revalidatePath } from "next/cache";
import { withAuth } from "@/lib/auth_utils";
import { fireAuditLog, logError } from "@/lib/audit";
import {
  createPrintingOrderSchema,
  printingStatusSchema,
  updatePrintingOrderSchema,
} from "@/lib/validations/printing.schema";

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

const VALID_TRANSITIONS: Record<string, string[]> = {
  cho_xu_ly: ["dang_in", "da_huy"],
  dang_in: ["da_in", "da_huy"],
  da_in: ["da_nhan", "da_huy"],
  da_nhan: [],
  da_huy: [],
};

function buildOrderCode() {
  return `IN-${Date.now().toString(36).toUpperCase()}`;
}

function calculateTotalAmount(
  items: { quantity: number; unitPrice: number }[],
): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

async function autoCreatePrintingExpense(params: {
  supabase: Parameters<Parameters<typeof withAuth>[0]>[0];
  userId: string;
  contractId: string;
  labId: string | null;
  orderCode: string;
  itemNames: string;
  totalAmount: number;
}) {
  if (params.totalAmount <= 0) return;

  try {
    const { data: category } = await params.supabase
      .from("transaction_categories")
      .select("id")
      .eq("type", "chi")
      .ilike("name", "%in an%")
      .limit(1)
      .maybeSingle();

    let labName = "Lab";
    if (params.labId) {
      const { data: lab } = await params.supabase
        .from("labs")
        .select("lab_name")
        .eq("id", params.labId)
        .maybeSingle();

      if (lab?.lab_name) labName = lab.lab_name;
    }

    await params.supabase.from("expenses").insert({
      expense_date: new Date().toISOString().split("T")[0],
      payment_method: "chuyen_khoan",
      category_id: category?.id ?? null,
      amount: params.totalAmount,
      description: `[Auto-Print] ${params.orderCode}: ${params.itemNames} (${labName})`,
      recipient: labName,
      contract_id: params.contractId,
      created_by: params.userId,
    });
  } catch (error) {
    await logError({
      error,
      context: "printing.autoExpense",
      tableName: "expenses",
      recordId: params.contractId,
    });
  }
}

export async function createPrintingOrder(
  rawData: unknown,
): Promise<ActionResult<{ orderCode: string }>> {
  const parsed = createPrintingOrderSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Du lieu khong hop le",
    };
  }

  return withAuth(async (supabase, userId) => {
    const input = parsed.data;
    const now = new Date().toISOString();
    const totalAmount = calculateTotalAmount(input.items);
    const orderCode = buildOrderCode();

    const { error } = await supabase.from("printing_orders").insert({
      contract_id: input.contractId,
      lab_id: input.labId,
      order_code: orderCode,
      status: "cho_xu_ly",
      payment_status: "chua_thanh_toan",
      total_amount: totalAmount,
      order_date: now,
      expected_date: input.expectedDate,
      items: input.items,
      notes: input.notes,
      created_by: userId,
      created_at: now,
      updated_at: now,
      updated_by: userId,
    });

    if (error) {
      throw new Error(`Khong the tao don in: ${error.message}`);
    }

    await autoCreatePrintingExpense({
      supabase,
      userId,
      contractId: input.contractId,
      labId: input.labId,
      orderCode,
      itemNames: input.items.map((item) => item.name).join(", "),
      totalAmount,
    });

    fireAuditLog({
      action: "CREATE",
      tableName: "printing_orders",
      description: `Tao don in ${orderCode}`,
      newData: {
        contract_id: input.contractId,
        lab_id: input.labId,
        total_amount: totalAmount,
      },
      source: "server_action",
    });

    revalidatePath("/printing");
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${input.contractId}`);
    revalidatePath("/finance");

    return { orderCode };
  });
}

export async function updatePrintingOrder(
  id: string,
  rawData: unknown,
  expectedUpdatedAt?: string,
): Promise<ActionResult<null>> {
  const parsed = updatePrintingOrderSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Du lieu khong hop le",
    };
  }

  return withAuth(async (supabase, userId) => {
    const { data: current, error: currentError } = await supabase
      .from("printing_orders")
      .select("id, order_code, updated_at, contract_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (currentError || !current) {
      throw new Error(
        `Khong the tai don in hien tai: ${currentError?.message || "Not found"}`,
      );
    }

    if (expectedUpdatedAt && current.updated_at !== expectedUpdatedAt) {
      throw new Error("Don in da duoc cap nhat boi nguoi khac. Vui long tai lai trang.");
    }

    const totalAmount = calculateTotalAmount(parsed.data.items);
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("printing_orders")
      .update({
        lab_id: parsed.data.labId,
        items: parsed.data.items,
        notes: parsed.data.notes,
        expected_date: parsed.data.expectedDate,
        total_amount: totalAmount,
        updated_at: now,
        updated_by: userId,
      })
      .eq("id", id);

    if (error) {
      throw new Error(`Khong the cap nhat don in: ${error.message}`);
    }

    fireAuditLog({
      action: "UPDATE",
      tableName: "printing_orders",
      recordId: id,
      description: `Cap nhat don in ${current.order_code || id}`,
      newData: {
        total_amount: totalAmount,
        lab_id: parsed.data.labId,
      },
      source: "server_action",
    });

    revalidatePath("/printing");
    if (current.contract_id) {
      revalidatePath(`/contracts/${current.contract_id}`);
    }
    return null;
  });
}

export async function updatePrintingOrderStatus(
  id: string,
  newStatus: string,
  contractId: string,
): Promise<ActionResult<null>> {
  const parsedStatus = printingStatusSchema.safeParse(newStatus);
  if (!parsedStatus.success) {
    return { success: false, error: "Trang thai don in khong hop le" };
  }

  return withAuth(async (supabase, userId) => {
    const { data: current, error: currentError } = await supabase
      .from("printing_orders")
      .select("id, order_code, status, received_date")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (currentError || !current) {
      throw new Error(
        `Khong the tai don in hien tai: ${currentError?.message || "Not found"}`,
      );
    }

    const currentStatus = current.status || "cho_xu_ly";
    if (currentStatus === parsedStatus.data) {
      return null;
    }

    const allowedTransitions = VALID_TRANSITIONS[currentStatus] ?? [];
    if (!allowedTransitions.includes(parsedStatus.data)) {
      throw new Error("Khong the chuyen don in sang trang thai nay");
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      status: parsedStatus.data,
      updated_at: now,
      updated_by: userId,
    };

    if (parsedStatus.data === "da_nhan" && !current.received_date) {
      updateData.received_date = now;
    }

    const { error } = await supabase
      .from("printing_orders")
      .update(updateData)
      .eq("id", id);

    if (error) {
      throw new Error(`Khong the cap nhat trang thai: ${error.message}`);
    }

    fireAuditLog({
      action: "UPDATE",
      tableName: "printing_orders",
      recordId: id,
      description: `Cap nhat trang thai don in ${current.order_code || id}`,
      oldData: { status: currentStatus },
      newData: { status: parsedStatus.data },
      source: "server_action",
    });

    revalidatePath("/printing");
    revalidatePath(`/contracts/${contractId}`);
    return null;
  });
}

export async function deletePrintingOrder(
  id: string,
): Promise<ActionResult<null>> {
  return withAuth(async (supabase, userId) => {
    const { data: current, error: currentError } = await supabase
      .from("printing_orders")
      .select("id, contract_id, order_code")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (currentError || !current) {
      throw new Error(
        `Khong the tai don in can xoa: ${currentError?.message || "Not found"}`,
      );
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("printing_orders")
      .update({
        deleted_at: now,
        updated_at: now,
        updated_by: userId,
      })
      .eq("id", id);

    if (error) {
      throw new Error(`Khong the xoa don in: ${error.message}`);
    }

    fireAuditLog({
      action: "DELETE",
      tableName: "printing_orders",
      recordId: id,
      description: `Xoa mem don in ${current.order_code || id}`,
      source: "server_action",
    });

    revalidatePath("/printing");
    if (current.contract_id) {
      revalidatePath(`/contracts/${current.contract_id}`);
    }

    return null;
  });
}

