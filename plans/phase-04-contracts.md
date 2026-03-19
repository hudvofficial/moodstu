# Phase 04: Contracts Core

**Status:** 🟡 Stitch Partial (List + Detail + Create done D+M, Tablets pending)
**Dependencies:** Phase 03
**Est.:** 2 days

## Objective

Module HỢP ĐỒNG — trung tâm của app. CRUD + lifecycle 9 bước + nhiều loại DV + chọn trang phục + timeline.

## ⚠️ Module phức tạp nhất — cần chú ý:
- 6 loại dịch vụ với fields khác nhau
- Lifecycle 9 trạng thái
- Liên kết: customers, inventory, payments
- v1 lesson: dùng ENUM/ID cho service_type thay vì free-text

## Implementation Steps

### Server Actions
- [ ] `getContracts()` — list + filter (status, service_type, date range)
- [ ] `getContractById()` — detail + payments + items + timeline
- [ ] `createContract()` — tạo HĐ mới (dynamic form theo service_type)
- [ ] `updateContract()` — cập nhật
- [ ] `updateContractStatus()` — chuyển trạng thái (lifecycle)
- [ ] `cancelContract()` — huỷ HĐ
- [ ] `getContractStats()` — số lượng theo status (cho tabs)

### Contract Lifecycle (9 stages — theo DESIGN.md SSOT)
```
draft → deposited → preparing → shooting → 
editing → reviewing → delivering → 
completed → cancelled
```
- [ ] Status transition rules (không skip bước)
- [ ] Auto-actions khi chuyển status (VD: deposited → tạo timeline entry)

### Dynamic Form theo Service Type
- [ ] Wedding: cô dâu + chú rể + ngày cưới + váy + áo dài + vest
- [ ] Baby: tên bé + ngày sinh + concept
- [ ] Concept: chủ đề + số người + location
- [ ] Rental: trang phục chọn + ngày mượn/trả
- [ ] Invitation: mẫu thiệp + số lượng + deadline

### UI Components — Stitch Screens
- [x] Contract list page — Desktop `37b29e12` ⭐ GOLD Mobile `ca6942ab` ✅
- [x] Contract detail page — Desktop `9e95bc24` ✅ Mobile `16c286be` ✅
- [x] Create contract wizard — Desktop `590edbd1` ✅ Mobile `dedc3e9d` ✅
- [ ] Contract list — Tablet (NEEDED)
- [ ] Contract detail — Tablet (NEEDED)
- [ ] Create contract — Tablet (NEEDED)

### UI Components — Code-Only (theo design-specs.md)
- [ ] Status badge component (màu theo ENUM → Color Map trong design-specs)
- [ ] Timeline component (vertical timeline, contract lifecycle)
- [ ] Client-side tabs pattern (filter không reload)
- [ ] Cancel/Reactivate modal (ConfirmDialog)

### Stitch Palette Note
> ✅ P04 = GOLD STANDARD — palette đúng, không cần fix.

### Patterns Applied
- [ ] Contract form dynamic fields (show/hide theo service_type)
- [ ] CurrencyInput cho giá trị HĐ
- [ ] useRealtime cho live status updates
- [ ] Optimistic UI khi chuyển status
- [ ] String normalization (v1 lesson: normalize service_type)

## Test Criteria
- [ ] Tạo HĐ cho 5 loại DV khác nhau
- [ ] Chuyển status đúng flow lifecycle
- [ ] Filter theo status + service_type
- [ ] Timeline hiển thị đúng lịch sử
- [ ] Form validation (required fields theo loại)
- [ ] Mobile responsive (tabs, form wizard)

## Stitch Audit (2026-03-15)
- **Coverage:** 3/3 layout screens ✅ (List + Detail + Create)
- **Breakpoints:** Desktop ✅✅✅ / Mobile ✅✅✅ / Tablet ❌❌❌
- **Palette:** ⭐ Gold Standard — đúng chuẩn, không cần fix
- **Lifecycle fix:** ~~in_progress/post_production/payment_complete~~ → shooting/editing/reviewing (theo DESIGN.md)
- **Code-only:** Badge, Timeline, Tabs, Cancel modal

---
**Next Phase:** → Phase 05 (Payments)

