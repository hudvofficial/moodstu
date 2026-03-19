# Plan: Select System — Fix All
Created: 2026-03-19 13:42
Status: 🟡 In Progress

## Vấn đề
Audit phát hiện native `<select>` còn sót lại trong:
1. Filter bar desktop (ContractsDropdownFilters)
2. Status dropdowns trong contract detail blocks
3. GroupedSelect dùng custom click-outside logic thay Radix

## Mục tiêu
Đồng bộ 100% select components sang Radix UI.
Không còn native `<select>` nào trong production UI.

## Phases

| Phase | Name | Status | Files |
|-------|------|--------|-------|
| 01 | Migrate FilterSelect → SelectPill (Desktop filter bar) | ⬜ Pending | contracts-dropdown-filters.tsx |
| 02 | Migrate StatusSelect → SelectForm variant | ⬜ Pending | costumes-block.tsx, print-orders-block.tsx |
| 03 | Migrate GroupedSelect → Radix SelectGrouped | ⬜ Pending | grouped-select.tsx, ContractInfoSection.tsx |

## Quick Commands
- Phase 01: `/code p1`
- Phase 02: `/code p2`
- Phase 03: `/code p3`
