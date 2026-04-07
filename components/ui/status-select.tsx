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

export const PRINT_ORDER_STATUS_OPTIONS = [
  { value: "cho_xu_ly", label: "Chờ xử lý", color: "var(--color-status-pending)" },
  { value: "dang_in",   label: "Đang in",    color: "var(--color-status-info)" },
  { value: "da_in",     label: "Đã in",      color: "var(--color-status-printed)" },
  { value: "da_nhan",   label: "Đã nhận",    color: "var(--color-status-success)" },
  { value: "da_huy",    label: "Đã hủy",     color: "var(--color-status-error)" },
] as const;

export const RESERVATION_STATUS_OPTIONS = [
  { value: "reserved",  label: "Đã đặt",         color: "var(--color-status-reserved, var(--color-status-info))" },
  { value: "in_use",    label: "Đang sử dụng",    color: "var(--color-status-pending)" },
  { value: "returned",  label: "Đã trả",          color: "var(--color-status-success)" },
  { value: "cancelled", label: "Đã hủy",          color: "var(--color-status-error)" },
] as const;
