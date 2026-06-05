import { createClient } from "@/lib/supabase/client";
import { mapPaymentPlans } from "@/lib/contracts/payment-plans";
import type {
  ContractEvent,
  ContractChecklist,
  WorkTask,
  PaymentPlan,
} from "@/types/contract";

/**
 * Client-direct (browser → Supabase) fetchers for the contracts drawer.
 *
 * Cấp 2: bỏ server-action 2-hop, query Supabase thẳng từ browser. RLS làm
 * cổng (employee active mới đọc — migration 20260605000000 + 020000).
 *
 * Trả shape `{ success: true, data }` GIỐNG server action getContractDrawerExtra
 * / getContractNotes → hook/queryFn swap chỉ đổi reference, không đổi thân.
 * Lỗi → throw (React Query/SWR bắt). employees JOIN không embed bảng employees
 * (nhạy cảm) — resolve tên từ view employees_public, gắn lại .employees để
 * component không đổi.
 */

type DrawerExtra = {
  events: ContractEvent[];
  checklists: ContractChecklist[];
  workTasks: WorkTask[];
  paymentPlans: PaymentPlan[];
};

export async function fetchContractDrawerExtraClient(
  id: string,
): Promise<{ success: true; data: DrawerExtra }> {
  const supabase = createClient();

  const [eventsRes, checklistsRes, workTasksRes, paymentPlansRes, empsRes] =
    await Promise.all([
      supabase
        .from("contract_events")
        .select(
          `id, event_type, title, event_date, end_date, location, status, notes,
           sync_to_google, google_event_id, google_sync_status,
           google_sync_error, google_synced_at`,
        )
        .eq("contract_id", id)
        .is("deleted_at", null)
        .order("event_date", { ascending: true }),
      supabase
        .from("contract_checklists")
        .select(
          "id, event_stage, category, item_name, is_completed, created_at, updated_at",
        )
        .eq("contract_id", id)
        .order("created_at", { ascending: true }),
      // KHÔNG embed employees (bảng nhạy cảm — không grant cho browser). Giữ
      // vendors embed (đã có RLS authenticated-read). Tên nhân sự resolve dưới.
      supabase
        .from("work_tasks")
        .select(
          "id, event_id, work_type, assigned_to, vendor_id, status, deadline, start_date, completion_date, cost, notes, vendors:vendor_id(id, full_name, phone)",
        )
        .eq("contract_id", id)
        .order("deadline", { ascending: true }),
      supabase
        .from("payment_plans")
        .select(
          "id, contract_id, stage_name, stage_key, sort_order, amount, due_date, status, receipt_id, created_at, payment_plan_allocations(id, contract_id, payment_plan_id, payment_id, amount, created_at, created_by)",
        )
        .eq("contract_id", id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase.from("employees_public").select("id, full_name"),
    ]);

  const firstErr =
    eventsRes.error ||
    checklistsRes.error ||
    workTasksRes.error ||
    paymentPlansRes.error ||
    empsRes.error;
  if (firstErr) {
    throw new Error(firstErr.message || "Lỗi tải dữ liệu drawer");
  }

  const empRows = (empsRes.data ?? []) as Array<{ id: string; full_name: string }>;
  const empMap = new Map(empRows.map((e) => [e.id, e]));

  const taskRows = (workTasksRes.data ?? []) as Array<
    Record<string, unknown> & { assigned_to: string | null }
  >;
  const workTasks = taskRows.map((t) => ({
    ...t,
    employees: t.assigned_to ? empMap.get(t.assigned_to) ?? null : null,
  })) as unknown as WorkTask[];

  return {
    success: true,
    data: {
      events: (eventsRes.data ?? []) as unknown as ContractEvent[],
      checklists: (checklistsRes.data ?? []) as unknown as ContractChecklist[],
      workTasks,
      paymentPlans: mapPaymentPlans(paymentPlansRes.data ?? []),
    },
  };
}

export async function fetchContractNotesClient(
  contractId: string,
): Promise<{
  success: true;
  data: Array<{ id: string; content: string; created_by: string; created_at: string }>;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contract_notes")
    .select("id, content, created_by, created_at")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Lỗi lấy ghi chú: ${error.message}`);
  }

  return {
    success: true,
    data: (data ?? []) as Array<{
      id: string;
      content: string;
      created_by: string;
      created_at: string;
    }>,
  };
}
