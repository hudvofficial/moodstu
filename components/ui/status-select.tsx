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
  { value: "cho_xu_ly", label: "Chờ xử lý", color: "#f39c12" },
  { value: "dang_in",   label: "Đang in",    color: "#3498db" },
  { value: "da_in",     label: "Đã in",      color: "#9b59b6" },
  { value: "da_nhan",   label: "Đã nhận",    color: "#27ae60" },
  { value: "da_huy",    label: "Đã hủy",     color: "#e74c3c" },
] as const;

export const RESERVATION_STATUS_OPTIONS = [
  { value: "reserved",  label: "Đã đặt",         color: "#3498db" },
  { value: "in_use",    label: "Đang sử dụng",    color: "#f39c12" },
  { value: "returned",  label: "Đã trả",          color: "#27ae60" },
  { value: "cancelled", label: "Đã hủy",          color: "#e74c3c" },
] as const;
