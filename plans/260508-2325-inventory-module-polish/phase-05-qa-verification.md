# Phase 05: QA & Verification
Status: ⬜ Pending
Dependencies: Phase 01-04 all complete

## Objective
Full regression test toàn module inventory sau tất cả changes.

## Verification Steps

1. [ ] **Build check** — `npm run build` pass, 0 TS errors, 0 warnings
2. [ ] **SSOT audit** — Grep confirm:
   - `grep -r "Tiền mặt" components/` → chỉ còn trong constants files
   - `grep -r "Chuyển khoản" components/` → chỉ còn trong constants files
   - 0 local `PAYMENT_METHOD_OPTIONS` / `PAYMENT_TYPE_OPTIONS` trong components
3. [ ] **Functional test** — Browser walkthrough:
   - Inventory list loads → stats bar, filters, table OK
   - Click row → drawer opens with detail
   - Navigate to detail page → skeleton → data
   - Stock-in modal → submit → list refreshes
   - Stock-out modal (bán lẻ) → payment = dropdown → submit OK
   - Stock-out modal (xuất HĐ) → contract search works
   - Stock-out modal (bán thêm HĐ) → payment + price fields OK
   - Stock-out modal (nội bộ) → reason required
   - Realtime: 2 tabs → change in 1 → other updates
4. [ ] **Performance check** — DevTools:
   - WS connections: 1 channel (not 2) for inventory list
   - Detail page profiler: < 100ms RPC (check action-profiler logs)
   - Detail page: skeleton hiện trong < 100ms

## Done Criteria
- All 4 verification steps pass
- Update plan.md status to ✅ Complete

---
