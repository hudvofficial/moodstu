# Phase 03: DebtToolbar — Tab Thu/Trả + Filter + Sort + Search

Status: ⬜ Pending
Dependencies: Phase 01

## Objective

Thêm Toolbar hoàn chỉnh cho trang `/finance/debts` — hiện tại KHÔNG CÓ bất kỳ filter/search nào. V1 có đầy đủ Tab + Filter + Sort + Search, V2 cần port lại dùng V2 components.

## Tính năng

### Tab Thu/Trả
- [ ] 2 tab chính: "Phải thu" (RECEIVABLE) / "Phải trả" (PAYABLE)
- [ ] V2 implementation: dùng `SelectPill` hoặc `tab-pill` CSS
- [ ] Khi chuyển tab → reset filter/search về mặc định

### Filter Trạng Thái
- [ ] SelectPill chips: Tất cả | Chưa TT | Quá hạn | Đã TT
- [ ] Hiển thị count trên mỗi chip (VD: "Chưa TT (5)")

### Sort
- [ ] SelectPill: Mới nhất | Số tiền ↓ | Hạn gần
- [ ] Default: Mới nhất

### Search
- [ ] Input search rounded (V2 style) — tìm theo tên/chủ nợ/ghi chú
- [ ] Debounce 300ms
- [ ] Desktop: hiện inline cạnh filters
- [ ] Mobile: có thể collapse/toggle

## Files to Create/Modify

- `components/finance/debts/debt-toolbar.tsx` — **[NEW]**
- `components/finance/debts/debts-client.tsx` — Integrate toolbar + filter state
- `app/actions/finance-operations-queries.ts` — Cập nhật `fetchDebts()` hỗ trợ filter params

## V2 Components sử dụng

| V2 Component | Mục đích |
|---|---|
| `SelectPill` | Tab Thu/Trả + Status filter + Sort |
| `Input` (rounded) | Search |
| responsive hide/show | `lg:hidden` / `hidden lg:flex` |

## Test Criteria

- [ ] Tab Thu/Trả: chuyển tab → data đúng, filter reset
- [ ] Filter trạng thái: bấm "Quá hạn" → chỉ hiện quá hạn
- [ ] Sort: đổi sort → thứ tự thay đổi
- [ ] Search: gõ tên → filter realtime (debounce)
- [ ] Mobile responsive: toolbar không bị tràn

---
Next Phase: [phase-04](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/plans/260416-0655-debts-v2-upgrade/phase-04-stats-aging.md)
