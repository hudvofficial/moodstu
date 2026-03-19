# Plan: Fix All Contracts UI Audit Issues
Created: 2026-03-17 01:21
Status: ✅ Complete

## Overview
Fix toàn bộ 17 border violations + 8 hardcode warnings + 4 component suggestions 
từ audit `audit_contracts_ui_2026_03_17.md`

## Phases

| Phase | Name | Status | Files | Tasks |
|-------|------|--------|-------|-------|
| 01 | Global CSS Reset + Shared Utils | ✅ | 2 | 3 |
| 02 | Fix UI Shared Components (table, select) | ✅ | 2 | 6 |
| 03 | Fix Contract Components (badges, dropdowns) | ✅ | 3 | 12 |
| 04 | Tạo FilterSelect Component | ✅ | 2 | 4 |
| 05 | Build + Verify | ✅ | 0 | 2 |

**Tổng:** 5 phases | 27 tasks | ✅ ALL DONE

## Verification
- ✅ Build pass (0 errors)
- ✅ Grep: 0 `border-border` in contracts/
- ✅ Grep: 0 `divide-border` in contracts/
- ✅ Grep: 0 `inset_0_0_0_1px` in contracts/
- ✅ Grep: 0 `style={{ border` inline
- ✅ Grep: 0 violations in ui/table.tsx, ui/select.tsx, ui/tabs-filter.tsx
