"use server";

import { withPrintingAccess } from "@/lib/auth_utils";
import type {
  Lab,
  LabDetail,
  LabOption,
  LabPayment,
  LabService,
  LabUnpaidOrder,
  LabPaymentHistoryItem,
  LabPaymentHistoryPage,
  LabPaymentAllocation,
} from "@/types/printing";
import { normalizeLabStatus, normalizePrintingOrderStatus } from "@/types/printing-constants";
import { getLabDebts } from "./printing-reference-queries";

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

type BaseLabRow = {
  id: string;
  lab_name: string;
  contact_person: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  created_at: string | null;
};

type LabOverviewRow = {
  id: string;
  lab_name: string;
  contact_person: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  created_at: string | null;
  service_count: number | null;
  service_preview: string[] | null;
  outstanding_debt: number | null;
  unpaid_orders: number | null;
  last_payment_at: string | null;
};

function mapLabRows(params: {
  labs: BaseLabRow[];
  services: LabService[];
  payments: LabPayment[];
  unpaidOrders: { lab_id: string | null; total_amount: number | null; count?: number }[];
}): Lab[] {
  const servicesByLab = new Map<string, LabService[]>();
  params.services.forEach((service) => {
    if (!service.lab_id) return;
    const current = servicesByLab.get(service.lab_id) ?? [];
    current.push(service);
    servicesByLab.set(service.lab_id, current);
  });

  const paymentsByLab = new Map<string, LabPayment[]>();
  params.payments.forEach((payment) => {
    const current = paymentsByLab.get(payment.lab_id) ?? [];
    current.push(payment);
    paymentsByLab.set(payment.lab_id, current);
  });

  return params.labs.map((lab) => {
    const services = servicesByLab.get(lab.id) ?? [];
    const payments = paymentsByLab.get(lab.id) ?? [];
    
    // Unpaid orders mapping has been changed to directly supply debt info
    const labDebtAmount = params.unpaidOrders.reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);
    const labUnpaidOrders = params.unpaidOrders.reduce((sum, o) => sum + Number(o.count ?? 0), 0);

    return {
      id: lab.id,
      lab_name: lab.lab_name,
      contact_person: lab.contact_person,
      phone: lab.phone,
      address: lab.address,
      status: normalizeLabStatus(lab.status),
      created_at: lab.created_at,
      serviceCount: services.length,
      services,
      outstandingDebt: labDebtAmount,
      unpaidOrders: labUnpaidOrders,
      lastPaymentAt: payments[0]?.created_at ?? null,
    };
  });
}

export async function fetchLabsList(): Promise<ActionResult<Lab[]>> {
  return withPrintingAccess(async (supabase) => {
    const { data, error } = await supabase.rpc("printing_lab_overview");

    if (error) {
      throw new Error(`Khong the tai danh sach lab: ${error.message}`);
    }

    return ((data ?? []) as LabOverviewRow[]).map((lab) => ({
      id: lab.id,
      lab_name: lab.lab_name,
      contact_person: lab.contact_person,
      phone: lab.phone,
      address: lab.address,
      status: normalizeLabStatus(lab.status),
      created_at: lab.created_at,
      serviceCount: Number(lab.service_count ?? 0),
      servicePreview: lab.service_preview ?? [],
      services: [],
      outstandingDebt: Number(lab.outstanding_debt ?? 0),
      unpaidOrders: Number(lab.unpaid_orders ?? 0),
      lastPaymentAt: lab.last_payment_at,
    }));
  });
}

export async function getLabDetail(id: string): Promise<ActionResult<LabDetail>> {
  return withPrintingAccess(async (supabase) => {
    const [labResult, servicesResult, paymentsResult, debtResult] =
      await Promise.all([
        supabase
          .from("labs")
          .select("id, lab_name, contact_person, phone, address, status, created_at")
          .eq("id", id)
          .is("deleted_at", null)
          .single(),
        supabase
          .from("lab_services")
          .select("id, lab_id, item_name, cost_price, created_at, updated_at")
          .eq("lab_id", id)
          .order("item_name"),
        supabase
          .from("lab_payments")
          .select("id, lab_id, amount, payment_method, note, created_at, created_by")
          .eq("lab_id", id)
          .order("created_at", { ascending: false }),
        getLabDebts(),
      ]);

    if (labResult.error || !labResult.data) {
      throw new Error(
        `Khong the tai chi tiet lab: ${labResult.error?.message || "Not found"}`,
      );
    }
    if (servicesResult.error) {
      throw new Error(`Khong the tai dich vu lab: ${servicesResult.error.message}`);
    }
    if (paymentsResult.error) {
      throw new Error(
        `Khong the tai lich su thanh toan: ${paymentsResult.error.message}`,
      );
    }
    if (!debtResult.success) {
      throw new Error(`Khong the tai cong no: ${debtResult.error}`);
    }

    const specificLabDebt = debtResult.data.items.find(item => item.labId === id);

    const [lab] = mapLabRows({
      labs: [labResult.data as BaseLabRow],
      services: (servicesResult.data ?? []) as LabService[],
      payments: (paymentsResult.data ?? []) as LabPayment[],
      unpaidOrders: specificLabDebt 
        ? [{ lab_id: id, total_amount: specificLabDebt.totalDebt, count: specificLabDebt.unpaidOrders } as any] 
        : [],
    });

    return {
      ...lab,
      payments: (paymentsResult.data ?? []) as LabPayment[],
    };
  });
}

export async function getLabOptions(): Promise<ActionResult<LabOption[]>> {
  return withPrintingAccess(async (supabase) => {
    const { data, error } = await supabase
      .from("labs")
      .select("id, lab_name")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("lab_name");

    if (error) {
      throw new Error(`Khong the tai danh sach lab: ${error.message}`);
    }

    return (data ?? []) as LabOption[];
  });
}

export async function getLabServices(labId: string): Promise<ActionResult<LabService[]>> {
  return withPrintingAccess(async (supabase) => {
    const { data, error} = await supabase
      .from("lab_services")
      .select("id, lab_id, item_name, cost_price, created_at, updated_at")
      .eq("lab_id", labId)
      .order("item_name");

    if (error) {
      throw new Error(`Khong the tai dich vu lab: ${error.message}`);
    }

    return (data ?? []) as LabService[];
  });
}

// ─── LAB PAYMENT FLOW QUERIES ───

type RelationRecord = Record<string, unknown>;

function getFirstRelation<T extends RelationRecord>(
  data: RelationRecord | RelationRecord[] | null | undefined
): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  return data as T;
}

/**
 * Fetch unpaid orders for a specific lab with allocation tracking
 * Orders sorted by date (FIFO) for payment allocation
 */
export async function fetchLabUnpaidOrders(
  labId: string
): Promise<ActionResult<LabUnpaidOrder[]>> {
  return withPrintingAccess(async (supabase) => {
    if (!labId?.trim()) {
      throw new Error("Lab ID is required");
    }

    // 1. Fetch unpaid orders for this lab
    const { data: orders, error: ordersError } = await supabase
      .from("printing_orders")
      .select(`
        id,
        order_code,
        total_amount,
        order_date,
        status,
        created_at,
        contracts!inner(
          contract_code,
          customers!inner(full_name)
        )
      `)
      .eq("lab_id", labId)
      .is("deleted_at", null)
      .neq("status", "da_huy")
      .neq("status", "huy_don")
      .order("order_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (ordersError) {
      throw new Error(`Cannot fetch unpaid orders: ${ordersError.message}`);
    }

    if (!orders || orders.length === 0) {
      return [];
    }

    // 2. Fetch allocations for these orders
    const orderIds = orders.map(o => o.id);
    const { data: allocations, error: allocError } = await supabase
      .from("lab_payment_allocations")
      .select("printing_order_id, amount")
      .in("printing_order_id", orderIds);

    if (allocError) {
      throw new Error(`Cannot fetch allocations: ${allocError.message}`);
    }

    // 3. Build allocation map (order_id → total_allocated)
    const allocationMap = new Map<string, number>();
    (allocations || []).forEach(a => {
      const current = allocationMap.get(a.printing_order_id) || 0;
      allocationMap.set(a.printing_order_id, current + Number(a.amount || 0));
    });

    // 4. Map to result with remaining amounts
    const result = orders.map(order => {
      const contract = getFirstRelation(order.contracts) as any;
      const customer = getFirstRelation(contract?.customers) as any;
      const allocated = allocationMap.get(order.id) || 0;
      const total = Number(order.total_amount || 0);

      return {
        id: order.id,
        orderCode: (order.order_code as string) || "-",
        contractCode: (contract?.contract_code as string) || "-",
        customerName: (customer?.full_name as string) || "-",
        totalAmount: total,
        allocatedAmount: allocated,
        remainingAmount: Math.max(0, total - allocated),
        orderDate: (order.order_date as string) || order.created_at,
        status: normalizePrintingOrderStatus(order.status),
      };
    });

    // 5. Filter out fully paid orders
    return result.filter(o => o.remainingAmount > 0);
  });
}

/**
 * Fetch payment history for a specific lab with allocation details
 * Paginated result with allocation breakdown per payment
 */
export async function fetchLabPaymentHistory(
  labId: string,
  params?: { page?: number; pageSize?: number }
): Promise<ActionResult<LabPaymentHistoryPage>> {
  return withPrintingAccess(async (supabase) => {
    if (!labId?.trim()) {
      throw new Error("Lab ID is required");
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 1. Fetch payments for this lab with pagination
    const { data: payments, error: paymentsError, count } = await supabase
      .from("lab_payments")
      .select("*", { count: "exact" })
      .eq("lab_id", labId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (paymentsError) {
      throw new Error(`Cannot fetch payment history: ${paymentsError.message}`);
    }

    if (!payments || payments.length === 0) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
      };
    }

    // 2. Fetch allocations for these payments
    const paymentIds = payments.map(p => p.id);
    const { data: allocations, error: allocError } = await supabase
      .from("lab_payment_allocations")
      .select(`
        payment_id,
        printing_order_id,
        amount,
        printing_orders!inner(order_code)
      `)
      .in("payment_id", paymentIds);

    if (allocError) {
      throw new Error(`Cannot fetch allocations: ${allocError.message}`);
    }

    // 3. Group allocations by payment_id
    const allocationsByPayment = new Map<string, LabPaymentAllocation[]>();
    (allocations || []).forEach(a => {
      const order = getFirstRelation(a.printing_orders) as any;
      const allocation: LabPaymentAllocation = {
        orderId: a.printing_order_id,
        orderCode: (order?.order_code as string) || "-",
        amount: Number(a.amount || 0),
      };

      const existing = allocationsByPayment.get(a.payment_id) || [];
      existing.push(allocation);
      allocationsByPayment.set(a.payment_id, existing);
    });

    // 4. Map to result items
    const items: LabPaymentHistoryItem[] = payments.map(payment => ({
      id: payment.id,
      paymentDate: payment.created_at,
      amount: Number(payment.amount || 0),
      paymentMethod: payment.payment_method as any,
      note: payment.note || null,
      allocations: allocationsByPayment.get(payment.id) || [],
      createdBy: payment.created_by,
      createdAt: payment.created_at,
    }));

    return {
      items,
      total: count || 0,
      page,
      pageSize,
    };
  });
}
