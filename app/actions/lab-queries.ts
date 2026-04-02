"use server";

import { withAuth } from "@/lib/auth_utils";
import type {
  Lab,
  LabDetail,
  LabOption,
  LabPayment,
  LabService,
} from "@/types/printing";
import { normalizeLabStatus } from "@/types/printing-constants";

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

function mapLabRows(params: {
  labs: BaseLabRow[];
  services: LabService[];
  payments: LabPayment[];
  unpaidOrders: { lab_id: string | null; total_amount: number | null }[];
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

  const debtByLab = new Map<string, { amount: number; count: number }>();
  params.unpaidOrders.forEach((order) => {
    if (!order.lab_id) return;
    const current = debtByLab.get(order.lab_id) ?? { amount: 0, count: 0 };
    current.amount += Number(order.total_amount ?? 0);
    current.count += 1;
    debtByLab.set(order.lab_id, current);
  });

  return params.labs.map((lab) => {
    const services = servicesByLab.get(lab.id) ?? [];
    const payments = paymentsByLab.get(lab.id) ?? [];
    const debt = debtByLab.get(lab.id) ?? { amount: 0, count: 0 };

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
      outstandingDebt: debt.amount,
      unpaidOrders: debt.count,
      lastPaymentAt: payments[0]?.created_at ?? null,
    };
  });
}

export async function fetchLabsList(): Promise<ActionResult<Lab[]>> {
  return withAuth(async (supabase) => {
    const [labsResult, servicesResult, paymentsResult, unpaidOrdersResult] =
      await Promise.all([
        supabase
          .from("labs")
          .select("id, lab_name, contact_person, phone, address, status, created_at")
          .is("deleted_at", null)
          .order("lab_name"),
        supabase
          .from("lab_services")
          .select("id, lab_id, item_name, cost_price, created_at, updated_at")
          .order("item_name"),
        supabase
          .from("lab_payments")
          .select("id, lab_id, amount, payment_method, note, created_at, created_by")
          .order("created_at", { ascending: false }),
        supabase
          .from("printing_orders")
          .select("lab_id, total_amount")
          .eq("payment_status", "chua_thanh_toan")
          .not("lab_id", "is", null)
          .is("deleted_at", null),
      ]);

    if (labsResult.error) {
      throw new Error(`Khong the tai danh sach lab: ${labsResult.error.message}`);
    }
    if (servicesResult.error) {
      throw new Error(`Khong the tai bang gia lab: ${servicesResult.error.message}`);
    }
    if (paymentsResult.error) {
      throw new Error(
        `Khong the tai lich su thanh toan lab: ${paymentsResult.error.message}`,
      );
    }
    if (unpaidOrdersResult.error) {
      throw new Error(
        `Khong the tai cong no lab: ${unpaidOrdersResult.error.message}`,
      );
    }

    return mapLabRows({
      labs: (labsResult.data ?? []) as BaseLabRow[],
      services: (servicesResult.data ?? []) as LabService[],
      payments: (paymentsResult.data ?? []) as LabPayment[],
      unpaidOrders: unpaidOrdersResult.data ?? [],
    });
  });
}

export async function getLabDetail(id: string): Promise<ActionResult<LabDetail>> {
  return withAuth(async (supabase) => {
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
        supabase
          .from("printing_orders")
          .select("lab_id, total_amount")
          .eq("lab_id", id)
          .eq("payment_status", "chua_thanh_toan")
          .is("deleted_at", null),
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
    if (debtResult.error) {
      throw new Error(`Khong the tai cong no: ${debtResult.error.message}`);
    }

    const [lab] = mapLabRows({
      labs: [labResult.data as BaseLabRow],
      services: (servicesResult.data ?? []) as LabService[],
      payments: (paymentsResult.data ?? []) as LabPayment[],
      unpaidOrders: debtResult.data ?? [],
    });

    return {
      ...lab,
      payments: (paymentsResult.data ?? []) as LabPayment[],
    };
  });
}

export async function getLabOptions(): Promise<ActionResult<LabOption[]>> {
  return withAuth(async (supabase) => {
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

