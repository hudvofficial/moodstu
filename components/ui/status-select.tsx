/**
 * ═══════════════════════════════════════════════════════════
 * status-select.tsx — Re-export alias (backward compat)
 * ═══════════════════════════════════════════════════════════
 *
 * MIGRATED: native <select> → Radix SelectStatus
 *
 * Consumers (costumes-block, print-orders-block) vẫn import:
 *   import StatusSelect, { RESERVATION_STATUS_OPTIONS } from "@/components/ui/status-select"
 * → Hoạt động ngay, zero breaking change.
 *
 * Migration date: 2026-03-19
 * ═══════════════════════════════════════════════════════════
 */

import { PRINTING_VALID_TRANSITIONS } from "@/types/printing-constants";

export {
  SelectStatus as default,
  type StatusOption,
} from "./select/SelectStatus";

// ─── Pre-built option sets (kept here for consumers) ──────────

/**
 * Printing Order Status Options — Trục A: tiến độ sản xuất Mood ⇄ Lab (ADR-014)
 *
 * Không "đặt cọc" (không tồn tại trong quan hệ Mood↔Lab), không "giao khách" (thuộc
 * contract_events.giao_san_pham). da_in = lab đã in xong, hình vẫn ở bên lab;
 * hoan_thanh = Mood đã nhận hình về. Công nợ Lab là trục B độc lập, xem lab-payment-modal.
 *
 * Migration: 2026-08-24 (T-20260824-printing-workflow-redesign) — gỡ dat_coc/da_giao.
 */
export const PRINT_ORDER_STATUS_OPTIONS = [
  // ─── Active Workflow ───
  // cho_xu_ly/da_in trước đây dùng --color-status-warning/--color-status-primary —
  // 2 token KHÔNG tồn tại trong app/globals.css (chấm tròn vô hình, phát hiện qua
  // ảnh chụp 2026-08-24) — đổi sang token có sẵn, đúng nghĩa: --color-status-pending
  // ("chờ") và --color-status-printed ("đã in", trước đó không nơi nào dùng).
  { value: "cho_xu_ly",   label: "Chờ xử lý",       color: "var(--color-status-pending)" },
  { value: "dang_in",     label: "Đang in",         color: "var(--color-status-info)" },
  { value: "da_in",       label: "Đã in — bên lab", color: "var(--color-status-printed)" },
  { value: "hoan_thanh",  label: "Hoàn thành",      color: "var(--color-status-success)" },
  { value: "gap_su_co",   label: "Gặp sự cố",       color: "var(--color-status-error)" },
  { value: "huy_don",     label: "Hủy đơn",         color: "var(--color-status-error)" },

  // ─── Legacy (Backward Compatibility) ───
  { value: "da_nhan",     label: "Đã nhận",         color: "var(--color-status-success)" },
  { value: "da_huy",      label: "Đã hủy",          color: "var(--color-status-error)" },
] as const;

/**
 * Chỉ trả về option hiện tại + các bước hợp lệ kế tiếp (khớp thẳng
 * PRINTING_VALID_TRANSITIONS phía server) — tránh cho staff chọn một bước server
 * sẽ từ chối, và ẩn 2 giá trị legacy (da_nhan/da_huy — chỉ để đọc dữ liệu cũ,
 * không còn ghi mới) khỏi dropdown khi trạng thái hiện tại không phải chính nó.
 */
export function selectablePrintOrderStatusOptions(current: string) {
  const allowed = new Set<string>([current, ...(PRINTING_VALID_TRANSITIONS[current] ?? [])]);
  return PRINT_ORDER_STATUS_OPTIONS.filter((opt) => allowed.has(opt.value));
}

export const RESERVATION_STATUS_OPTIONS = [
  { value: "reserved",  label: "Đã đặt",         color: "var(--color-status-reserved, var(--color-status-info))" },
  { value: "in_use",    label: "Đang sử dụng",    color: "var(--color-status-pending)" },
  { value: "returned",  label: "Đã trả",          color: "var(--color-status-success)" },
  { value: "cancelled", label: "Đã hủy",          color: "var(--color-status-error)" },
] as const;
