/**
 * simple-select.tsx — Backward-compat re-export
 *
 * SimpleSelect is now powered by Radix UI internally (SelectForm).
 * All existing imports continue to work with zero changes:
 *   import { SimpleSelect } from "@/components/ui/simple-select"
 *
 * Migration complete: 2026-03-19
 */

export { SelectForm as SimpleSelect } from "./select/SelectForm";
