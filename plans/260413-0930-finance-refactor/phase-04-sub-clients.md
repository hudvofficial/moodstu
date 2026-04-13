# Phase 04: Sub-module Clients
Status: ⬜ Pending
Dependencies: phase-03-modals.md

## Objective
Gỡ bỏ toàn bộ `onClick` inline trong các danh sách List/Table của các Client nhỏ, chuyển qua Stable Callback (bằng `useCallback`).

## Implementation Steps
1. [ ] Refactor `investments-client.tsx`
2. [ ] Refactor `lab-debts-client.tsx`
3. [ ] Refactor `fixed-costs-client.tsx`
4. [ ] Refactor `debts-client.tsx`
5. [ ] Refactor `goals-client.tsx`
6. [ ] Refactor `categories-client.tsx`

## Test Criteria
- [ ] Action mở modal "Create" hay bấm Edit trên từng dòng bảng không bị Re-render toàn bảng.

---
Next Phase: phase-05-testing.md
