# Phase 01: Setup & UI Tokens Standardization
Status: ✅ Complete
Dependencies: None

## Objective
Thay thế toàn bộ inline styling và custom class vi phạm hệ sinh thái CSS SSOT tại file `event-form-drawer.tsx`.

## Requirements
### Functional
- [x] Tuân thủ chặt chẽ `REGISTRY.md` cho form token.

## Implementation Steps
1. [x] Sửa `text-sm font-medium` thành `.label-base`.
2. [x] Sửa container `grid grid-cols-2 gap-4 shrink-0` thành `.form-grid-2col shrink-0`.
3. [x] Sửa Error toast red div thành thẻ mang chuẩn `.error-text`.
4. [x] Khôi phục chuẩn design system footer `mt-auto pt-4 flex ...` thành `.form-actions`.

## Files to Modify
- `components/calendar/drawers/event-form-drawer.tsx`
