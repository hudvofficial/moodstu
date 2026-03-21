# Plan: Tối ưu Financial Dashboard V2
Created: 2026-03-21T17:26
Status: 🟡 In Progress

## Overview
Nâng cấp phần Tài chính trên Contract Detail — giữ design V2 (earth-tone) + bổ sung thông tin thiếu từ V1.

## Scope
- **File chính:** `components/contracts/detail/financial-dashboard.tsx`
- **Không thay đổi:** DB schema, API, backend actions
- **Loại:** UI-only enhancement

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Desktop: Còn nợ + Trạng thái | ⬜ Pending | 0% |
| 02 | Tóm tắt tài chính (chiết khấu + thực thu) | ⬜ Pending | 0% |

---

## Phase 01: Desktop — Còn nợ + Trạng thái thanh toán

**Mục tiêu:** Desktop hiện đủ thông tin như mobile + banner trạng thái rõ ràng

### Tasks:
- [ ] Thêm grid 2-col "Đã thu / Còn nợ" trên desktop (giống mobile đã có)
- [ ] Thêm banner trạng thái:
  - `remainingAmount === 0` → ✅ "Đã thanh toán đầy đủ" (xanh)
  - `progress > 0` → 🟡 Progress bar (hiện tại)
  - `progress === 0` → ⚠️ "Chưa thanh toán" (đỏ nhạt)
- [ ] Tất cả dùng SSOT tokens, KHÔNG inline styles

### Files:
- `financial-dashboard.tsx` — Desktop variant (dòng 136-211)

---

## Phase 02: Tóm tắt tài chính

**Mục tiêu:** Hiện breakdown chi tiết cho admin (từ V1)

### Tasks:
- [ ] Thêm section "Tóm tắt" cuối card:
  - Tổng giá trị HĐ
  - Chiết khấu/Giảm giá (nếu có)
  - Thực thu (Sau giảm)
  - Đã thanh toán
  - Còn nợ
- [ ] Cần kiểm tra props: `discount` có được truyền từ parent chưa
- [ ] Tất cả dùng SSOT tokens

### Files:
- `financial-dashboard.tsx` — Thêm summary section
- `contract-detail-client.tsx` — Truyền thêm prop `discount` nếu cần

---

## Quick Commands
- Code Phase 1: `/code phase-01`
- Check progress: `/next`
