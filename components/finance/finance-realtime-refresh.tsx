"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeMulti } from "@/hooks/use-realtime-multi";
import { realtimeSignalConfig } from "@/hooks/use-realtime-signal";

// Chuông báo "màn hình cũ rồi" cho Finance (2 admin cùng thao tác):
// nhận event → router.refresh() → trang RSC (force-dynamic) re-render với số
// từ server. KHÔNG patch cache, KHÔNG đọc số từ payload — số tiền chỉ chảy qua
// server action/RSC như cũ; revalidatePath ở các action GIỮ NGUYÊN (checklist §B).
// - receipts/payments/payment_plans: postgres_changes trực tiếp (đã trong
//   publication, RLS verified 2026-06-10).
// - Các bảng finance còn lại: tín hiệu mỏng qua realtime_signals (migration
//   20260610140000) — không grant, không lộ row.
const FINANCE_SIGNAL_TABLES =
  "expenses,debts,fixed_costs,financial_goals,budgets,investments,vendor_payments,monthly_salaries,transaction_categories";

const REFRESH_DEBOUNCE_MS = 800;

export function FinanceRealtimeRefresh() {
  const router = useRouter();

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  useRealtimeMulti(
    [
      realtimeSignalConfig("receipts"),
      realtimeSignalConfig("payments"),
      realtimeSignalConfig("payment_plans"),
      {
        table: "realtime_signals",
        filter: `table_name=in.(${FINANCE_SIGNAL_TABLES})`,
        eventTypes: ["INSERT"],
      },
    ],
    {
      channelName: "finance-realtime",
      debounceMs: REFRESH_DEBOUNCE_MS,
      onChange: refresh,
      // refresh 1 lần cho cả batch event trong cùng cửa sổ debounce
      onBatchChange: () => refresh(),
    },
  );

  return null;
}
