/**
 * components/ui/select/index.ts
 * Barrel export — Radix Select System
 *
 * Import examples:
 *   import { SelectForm }    from "@/components/ui/select"  → form fields
 *   import { SelectPill }    from "@/components/ui/select"  → filter pills
 *   import { SelectForm as SimpleSelect } from "@/components/ui/select"  → alias
 */

export { SelectForm } from "./SelectForm";
export { SelectPill } from "./SelectPill";
export { SelectStatus } from "./SelectStatus";
export type { StatusOption } from "./SelectStatus";
export { SelectGrouped } from "./SelectGrouped";

// Base primitives (for advanced usage / custom variants)
export {
  SelectRoot,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
  renderOptions,
  renderGroupedOptions,
} from "./radix-base";
export type { SelectOption, SelectOptionGroup } from "./radix-base";
