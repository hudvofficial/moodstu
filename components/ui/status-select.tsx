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

export {
  SelectStatus as default,
  type StatusOption,
} from "./select/SelectStatus";

// ─── Pre-built option sets (kept here for consumers) ──────────

/**
 * Printing Order Status Options - Phase 2 Workflow
 *
 * Ordered by workflow progression + legacy statuses at end.
 * Includes all statuses from PRINTING_ORDER_STATUSES for full FSM support.
 *
 * Migration: 2026-05-26 - Added Phase 2 statuses (dat_coc, da_giao, hoan_thanh, huy_don)
 */
export const PRINT_ORDER_STATUS_OPTIONS = [
  // ─── Active Workflow (Phase 2) ───
  { value: "cho_xu_ly",   label: "Chờ xử lý",    color: "var(--color-status-warning)" },
  { value: "dat_coc",     label: "Đã đặt cọc",   color: "var(--color-status-info)" },
  { value: "dang_in",     label: "Đang in",      color: "var(--color-status-info)" },
  { value: "da_in",       label: "Đã in",        color: "var(--color-status-primary)" },
  { value: "da_giao",     label: "Đã giao",      color: "var(--color-status-success)" },
  { value: "hoan_thanh",  label: "Hoàn thành",   color: "var(--color-status-success)" },
  { value: "gap_su_co",   label: "Gặp sự cố",    color: "var(--color-status-error)" },
  { value: "huy_don",     label: "Hủy đơn",      color: "var(--color-status-error)" },

  // ─── Legacy (Backward Compatibility) ───
  { value: "da_nhan",     label: "Đã nhận",      color: "var(--color-status-success)" },
  { value: "da_huy",      label: "Đã hủy",       color: "var(--color-status-error)" },
] as const;

export const RESERVATION_STATUS_OPTIONS = [
  { value: "reserved",  label: "Đã đặt",         color: "var(--color-status-reserved, var(--color-status-info))" },
  { value: "in_use",    label: "Đang sử dụng",    color: "var(--color-status-pending)" },
  { value: "returned",  label: "Đã trả",          color: "var(--color-status-success)" },
  { value: "cancelled", label: "Đã hủy",          color: "var(--color-status-error)" },
] as const;
