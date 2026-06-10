"use client";

import { useRealtime, type RealtimeOptions } from "@/hooks/use-realtime";

/**
 * 📡 useRealtimeSignal — nhận tín hiệu đổi-dữ-liệu qua bảng `realtime_signals`
 * thay vì postgres_changes trực tiếp trên bảng nguồn.
 *
 * Dùng cho các bảng authenticated KHÔNG có grant SELECT (dresses, dress_rentals,
 * inventory_items, inventory_transactions, services, service_categories,
 * studio_info, employees — hardening 20260605000000): postgres_changes trực tiếp
 * fail-closed với các bảng này, còn GRANT lại thì lộ nguyên row (RLS không lọc
 * được cột nhạy cảm như purchase_price/salary_info). Pattern Signal ≠ Data:
 * client chỉ nhận {table_name, op} rồi refetch qua server action — lớp kiểm
 * quyền duy nhất. Xem migration 20260610130000_realtime_signals.sql.
 *
 * Lưu ý:
 * - Signal là INSERT vào realtime_signals → eventTypes cố định ["INSERT"];
 *   op gốc của bảng nguồn nằm ở payload.new.op (không filter được theo op —
 *   1 signal/câu lệnh ghi, kể cả câu lệnh chạm 0 row).
 * - Không có row_id → không filter được theo row (chủ đích: signal không lộ
 *   row nào đổi; bảng nguồn đổi là refetch cả vùng cache liên quan).
 */
export function useRealtimeSignal(
  sourceTable: string,
  options?: Omit<RealtimeOptions, "filter" | "eventTypes" | "schema">,
) {
  return useRealtime("realtime_signals", {
    ...options,
    filter: `table_name=eq.${sourceTable}`,
    eventTypes: ["INSERT"],
  });
}
