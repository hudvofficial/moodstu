# Plan: Mobile Header Optimization — /contracts/create
Created: 2026-03-19T19:33
Status: 🟡 In Progress

## Overview
Trên mobile: đưa title vào header, đưa badge HĐ vào card S1.
Desktop: 0 thay đổi.

## Phases

| Phase | Name | Status | Files |
|-------|------|--------|-------|
| 01 | Header + Title merge | ⬜ Pending | `index.tsx`, `fullpage-form-shell.tsx` |
| 02 | Badge → S1 card | ⬜ Pending | `index.tsx`, `ContractInfoSection.tsx` |
| 03 | Verify | ⬜ Pending | (browser check) |

## Scope Guard
- ❌ KHÔNG sửa desktop
- ❌ KHÔNG sửa FullpageFormShell default behavior (shared component)
- ✅ CHỈ dùng responsive classes (lg:hidden / max-lg:hidden)
