/**
 * ═══════════════════════════════════════════════════════════
 * grouped-select.tsx — Re-export alias (backward compat)
 * ═══════════════════════════════════════════════════════════
 *
 * MIGRATED: Custom click-outside dropdown → Radix SelectGrouped
 *
 * Consumers vẫn import:
 *   import { GroupedSelect } from "@/components/ui/grouped-select"
 * → Hoạt động ngay, zero breaking change.
 *
 * Migration date: 2026-03-19
 * ═══════════════════════════════════════════════════════════
 */

export { SelectGrouped as GroupedSelect } from "./select/SelectGrouped";
