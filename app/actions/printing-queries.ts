"use server";

import { withPrintingAccess } from "@/lib/auth_utils";
import { printingFiltersSchema } from "@/lib/validations/printing.schema";
import type {
  PrintingFilters,
  PrintingItem,
  PrintingOrderDetail,
  PrintingOrderRow,
  PrintingOrdersPage,
  PrintingStats,
} from "@/types/printing";
import {
  normalizePrintingOrderStatus,
  normalizePrintingPaymentStatus,
  toUIPaymentStatus,
  PRINTING_PAGE_SIZE,
} from "@/types/printing-constants";

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Escape LIKE wildcards to prevent search injection (W1 audit fix) */
function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, (char) => `\\${char}`);
}

type RelationRecord = Record<string, unknown>;

type RawPrintingOrderRow = {
  id: string;
  order_code: string | null;
  contract_id: string | null;
  lab_id: string | null;
  status: string | null;
  payment_status: string | null;
  total_amount: number | null;
  order_date: string | null;
  expected_date: string | null;
  received_date: string | null;
  delivered_date?: string | null;
  notes: string | null;
  items: unknown;
  updated_at: string | null;
  created_at: string | null;
  labs: RelationRecord | RelationRecord[] | null;
  contracts: RelationRecord | RelationRecord[] | null;
};

function getFirstRelation<T extends RelationRecord>(
  relation: T | T[] | null | undefined,
): T | null {
  if (!relation) return null;
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function parsePrintingItems(rawItems: unknown): PrintingItem[] {
  if (!Array.isArray(rawItems)) return [];

  return rawItems
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const name = String(record.name ?? "").trim();
      const size = String(record.size ?? "").trim();
      const quantity = Number(record.quantity ?? 0);
      const unitPrice = Number(record.unitPrice ?? record.unit_price ?? 0);

      if (!name) return null;

      return {
        name: size && !name.includes(size) ? `${name} ${size}` : name,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        unitPrice: Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0,
      };
    })
    .filter((item): item is PrintingItem => item !== null);
}

function mapPrintingOrderRow(row: RawPrintingOrderRow): PrintingOrderRow {
  const lab = getFirstRelation(row.labs);
  const contract = getFirstRelation(row.contracts);
  const customer = getFirstRelation(
    (contract?.customers as RelationRecord | RelationRecord[] | null | undefined) ??
      null,
  );

  return {
    id: row.id,
    orderCode: row.order_code || "IN-UNKNOWN",
    contractId: row.contract_id,
    contractCode: String(contract?.contract_code ?? "-"),
    customerName: String(customer?.full_name ?? "-"),
    labId: row.lab_id,
    labName: lab?.name ? String(lab.name) : null,
    status: normalizePrintingOrderStatus(row.status),
    paymentStatus: toUIPaymentStatus(row.payment_status, row.status),  // Use DB→UI mapping with legacy fallback
    totalAmount: Number(row.total_amount ?? 0),
    orderDate: row.order_date,
    expectedDate: row.expected_date,
    receivedDate: row.received_date,
    notes: row.notes,
    items: parsePrintingItems(row.items),
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

function buildPrintingSelect() {
  return `
    id,
    order_code,
    contract_id,
    lab_id,
    status,
    payment_status,
    total_amount,
    order_date,
    expected_date,
    received_date,
    delivered_date,
    notes,
    items,
    updated_at,
    created_at,
    labs (id, name:lab_name),
    contracts (
      id,
      contract_code,
      customers (full_name)
    )
  `;
}

export async function fetchPrintingOrders(
  filters: PrintingFilters = {},
): Promise<ActionResult<PrintingOrdersPage>> {
  const parsedFilters = printingFiltersSchema.safeParse(filters);
  if (!parsedFilters.success) {
    return {
      success: false,
      error: parsedFilters.error.issues[0]?.message || "Bo loc khong hop le",
    };
  }

  return withPrintingAccess(async (supabase) => {
    const filters = parsedFilters.data;
    const page = filters.page || 1;
    const pageSize = filters.pageSize || PRINTING_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("printing_orders")
      .select(buildPrintingSelect(), { count: "estimated" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters.labId && filters.labId !== "all") {
      query = query.eq("lab_id", filters.labId);
    }

    if (filters.paymentStatus && filters.paymentStatus !== "all") {
      if (filters.paymentStatus === "da_thanh_toan") {
        query = query.or("payment_status.eq.paid,status.in.(hoan_thanh,da_nhan)");
      } else {
        query = query.in("payment_status", ["unpaid", "partial"])
                     .neq("status", "hoan_thanh")
                     .neq("status", "da_nhan");
      }
    }

    if (filters.search?.trim()) {
      const escaped = escapeLikePattern(filters.search.trim());
      
      // Query contracts matching the search term
      const { data: matchedContracts } = await supabase
        .from("contracts")
        .select("id, customers!inner(full_name)")
        .is("deleted_at", null)
        .or(`contract_code.ilike.%${escaped}%,customers.full_name.ilike.%${escaped}%`)
        .limit(100);
        
      const contractIds = matchedContracts?.map(c => c.id) || [];
      
      if (contractIds.length > 0) {
        query = query.or(`order_code.ilike.%${escaped}%,contract_id.in.(${contractIds.join(',')})`);
      } else {
        query = query.ilike("order_code", `%${escaped}%`);
      }
    }

    if (filters.fromDate) {
      query = query.gte("order_date", filters.fromDate);
    }

    if (filters.toDate) {
      query = query.lte("order_date", filters.toDate);
    }

    const { data, count, error } = await query.range(from, to);

    if (error) {
      throw new Error(`Khong the tai danh sach don in: ${error.message}`);
    }

    return {
      orders: (((data ?? []) as unknown) as RawPrintingOrderRow[]).map(
        mapPrintingOrderRow,
      ),
      total: count || 0,
      page,
      pageSize,
    };
  });
}

export async function getPrintingOrderStats(): Promise<
  ActionResult<PrintingStats>
> {
  return withPrintingAccess(async (supabase) => {
    const { data, error } = await supabase.rpc("printing_stats");

    if (error) {
      throw new Error(`Khong the tai thong ke don in: ${error.message}`);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      throw new Error("Khong the tai thong ke don in");
    }

    return {
      total: Number(row.total ?? 0),
      choXuLy: Number(row.cho_xu_ly ?? 0),
      datCoc: Number(row.dat_coc ?? 0),
      dangIn: Number(row.dang_in ?? 0),
      daIn: Number(row.da_in ?? 0),
      daGiao: Number(row.da_giao ?? 0),
      hoanThanh: Number(row.hoan_thanh ?? 0),
      huyDon: Number(row.huy_don ?? 0),
      daNhan: Number(row.da_nhan ?? 0),
      daHuy: Number(row.da_huy ?? 0),
      totalCost: Number(row.total_cost ?? 0),
      unpaidCost: Number(row.unpaid_cost ?? 0),
    };
  });
}

/**
 * Bootstrap: gộp orders + stats + labs vào 1 server action (trả thuế auth 1 lần).
 * Tiết kiệm ~400-700ms trên mobile 4G so với 3 call riêng.
 */
export async function getPrintingBootstrap(
  filters: PrintingFilters = {},
): Promise<ActionResult<{ orders: PrintingOrdersPage; stats: PrintingStats; labOptions: Array<{ id: string; lab_name: string }> }>> {
  const parsedFilters = printingFiltersSchema.safeParse(filters);
  if (!parsedFilters.success) {
    return { success: false, error: parsedFilters.error.issues[0]?.message || "Bo loc khong hop le" };
  }

  return withPrintingAccess(async (supabase) => {
    const f = parsedFilters.data;
    const page = f.page || 1;
    const pageSize = f.pageSize || PRINTING_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build orders query
    let ordersQuery = supabase
      .from("printing_orders")
      .select(buildPrintingSelect(), { count: "estimated" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (f.status && f.status !== "all") ordersQuery = ordersQuery.eq("status", f.status);
    if (f.labId && f.labId !== "all") ordersQuery = ordersQuery.eq("lab_id", f.labId);
    if (f.paymentStatus && f.paymentStatus !== "all") {
      if (f.paymentStatus === "da_thanh_toan") {
        ordersQuery = ordersQuery.or("payment_status.eq.paid,status.in.(hoan_thanh,da_nhan)");
      } else {
        ordersQuery = ordersQuery.in("payment_status", ["unpaid", "partial"]).neq("status", "hoan_thanh").neq("status", "da_nhan");
      }
    }
    if (f.search?.trim()) {
      const escaped = escapeLikePattern(f.search.trim());
      const { data: mc } = await supabase
        .from("contracts")
        .select("id, customers!inner(full_name)")
        .is("deleted_at", null)
        .or(`contract_code.ilike.%${escaped}%,customers.full_name.ilike.%${escaped}%`)
        .limit(100);
      const cids = mc?.map(c => c.id) || [];
      ordersQuery = cids.length > 0
        ? ordersQuery.or(`order_code.ilike.%${escaped}%,contract_id.in.(${cids.join(",")})`)
        : ordersQuery.ilike("order_code", `%${escaped}%`);
    }
    if (f.fromDate) ordersQuery = ordersQuery.gte("order_date", f.fromDate);
    if (f.toDate) ordersQuery = ordersQuery.lte("order_date", f.toDate);

    // Fire ALL 3 in parallel (1 auth session)
    const [ordersRes, statsRes, labsRes] = await Promise.all([
      ordersQuery.range(from, to),
      supabase.rpc("printing_stats"),
      supabase.from("labs").select("id, lab_name").eq("status", "active").is("deleted_at", null).order("lab_name"),
    ]);

    if (ordersRes.error) throw new Error(`Lỗi tải đơn in: ${ordersRes.error.message}`);
    if (statsRes.error) throw new Error(`Lỗi tải thống kê: ${statsRes.error.message}`);
    if (labsRes.error) throw new Error(`Lỗi tải labs: ${labsRes.error.message}`);

    const statsRow = Array.isArray(statsRes.data) ? statsRes.data[0] : statsRes.data;
    if (!statsRow) throw new Error("Không tải được thống kê");

    return {
      orders: {
        orders: (((ordersRes.data ?? []) as unknown) as RawPrintingOrderRow[]).map(mapPrintingOrderRow),
        total: ordersRes.count || 0,
        page,
        pageSize,
      },
      stats: {
        total: Number(statsRow.total ?? 0),
        choXuLy: Number(statsRow.cho_xu_ly ?? 0),
        datCoc: Number(statsRow.dat_coc ?? 0),
        dangIn: Number(statsRow.dang_in ?? 0),
        daIn: Number(statsRow.da_in ?? 0),
        daGiao: Number(statsRow.da_giao ?? 0),
        hoanThanh: Number(statsRow.hoan_thanh ?? 0),
        huyDon: Number(statsRow.huy_don ?? 0),
        daNhan: Number(statsRow.da_nhan ?? 0),
        daHuy: Number(statsRow.da_huy ?? 0),
        totalCost: Number(statsRow.total_cost ?? 0),
        unpaidCost: Number(statsRow.unpaid_cost ?? 0),
      },
      labOptions: (labsRes.data ?? []) as Array<{ id: string; lab_name: string }>,
    };
  });
}

export async function getPrintingOrderDetail(
  id: string,
): Promise<ActionResult<PrintingOrderDetail>> {
  return withPrintingAccess(async (supabase) => {
    const { data, error } = await supabase
      .from("printing_orders")
      .select(buildPrintingSelect())
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      throw new Error(
        `Khong the tai chi tiet don in: ${error?.message || "Not found"}`,
      );
    }

    const rawData = data as unknown as RawPrintingOrderRow;
    const mapped = mapPrintingOrderRow(rawData);
    const lab = getFirstRelation(rawData.labs);
    const contract = getFirstRelation(rawData.contracts);
    const customer = getFirstRelation(
      (contract?.customers as RelationRecord | RelationRecord[] | null | undefined) ??
        null,
    );

    return {
      ...mapped,
      deliveredDate: rawData.delivered_date ?? null,
      lab: lab
        ? {
            id: String(lab.id),
            lab_name: String(lab.name ?? ""),
          }
        : null,
      contract: {
        id: String(contract?.id ?? mapped.contractId ?? ""),
        contract_code: String(contract?.contract_code ?? mapped.contractCode),
        customer_name: String(customer?.full_name ?? mapped.customerName),
      },
    };
  });
}

// ─── PHASE 2: PAYMENT QUERIES ────────────────────────────

/**
 * Get payment summary for an order
 */
export async function getOrderPaymentSummary(orderId: string) {
  return withPrintingAccess(async (supabase) => {
    const { data, error } = await supabase
      .from("order_payment_summary")
      .select("*")
      .eq("order_id", orderId)
      .single();

    if (error) {
      throw new Error(`Không thể lấy thông tin thanh toán: ${error.message}`);
    }

    return {
      orderId: data.order_id,
      totalAmount: data.total_amount || 0,
      depositPaid: data.deposit_paid || 0,
      finalPaid: data.final_paid || 0,
      refundAmount: data.refund_amount || 0,
      adjustmentAmount: data.adjustment_amount || 0,
      totalPaid: data.total_paid || 0,
      remaining: data.remaining || 0,
    };
  });
}

/**
 * Get payment history for an order
 */
export async function getOrderPaymentHistory(orderId: string) {
  return withPrintingAccess(async (supabase) => {
    const { data, error } = await supabase
      .from("order_payments")
      .select("*")
      .eq("order_id", orderId)
      .order("payment_date", { ascending: false });

    if (error) {
      throw new Error(`Không thể lấy lịch sử thanh toán: ${error.message}`);
    }

    return data.map((payment) => ({
      id: payment.id,
      orderId: payment.order_id,
      paymentId: payment.payment_id,
      receiptId: payment.receipt_id,
      paymentType: payment.payment_type as "deposit" | "final" | "refund" | "adjustment",
      amount: payment.amount,
      paymentDate: payment.payment_date,
      paymentMethod: payment.payment_method as "cash" | "transfer" | "card" | "other",
      notes: payment.notes || null,
      createdAt: payment.created_at,
    }));
  });
}
