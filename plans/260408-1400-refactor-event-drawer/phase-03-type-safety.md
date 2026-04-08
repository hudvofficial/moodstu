# Phase 03: Type Safety Clean up & Debug
Status: ✅ Complete
Dependencies: Phase 02

## Objective
Ngăn chặn security risk và lint error từ catch(err: any).

## Implementation Steps
1. [x] Tìm toàn bộ `.catch(err: any)`.
2. [x] Thay logic ép kiểu theo chuẩn: `if (err instanceof Error) ...`.

## Files to Modify
- `components/calendar/drawers/event-form-drawer.tsx`
