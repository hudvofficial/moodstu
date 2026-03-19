# Phase 01: Compact Inline Stats + Remove Duplicate Header
Status: ⬜ Pending
Dependencies: None

## Objective
1. Thay thế `ContractsStats` (4 KPI cards lớn) → **compact inline stats bar** (1 dòng, ~40px)
2. Bỏ h1 "Hợp đồng" + subtitle trong page content (app-shell header đã là SSOT)
3. Đặt nút "+Tạo hợp đồng" cùng dòng với stats bar

## Layout Sau Khi Xong

```
┌─ APP SHELL HEADER (KHÔNG SỬA) ──────────────────────────┐
│ Hợp đồng                   🔍 Tìm trong HĐ  ⌘K  🌙 🔔  │
│ Quản lý hợp đồng & tiến độ dịch vụ                       │
└───────────────────────────────────────────────────────────┘
┌─ PAGE CONTENT ────────────────────────────────────────────┐
│ 📄 12 tổng │ ⚡ 4 đang │ 💰 127.5M doanh thu │ ✅ 6 +33%  [+Tạo HĐ] │
│ [Tất cả 12] [Đang 4] [Chờ 1] [HT 6] [Hủy]              │
│ ┌─ Table ──────────────────────────────────────────────┐  │
└───────────────────────────────────────────────────────────┘
```

## Implementation Steps

### 1. Tạo `CompactStats` component
- [ ] Tạo file `components/contracts/compact-stats.tsx` (~60 lines)
- [ ] Props: `stats: ContractStats`
- [ ] Render: 1 hàng flex, 4 stat items inline, ngăn cách bằng `|`
- [ ] Mỗi item: Lucide icon nhỏ (16px) + label + value + trend %
- [ ] Items: Tổng (FileText) | Đang thực hiện (Loader) | Doanh thu (DollarSign) | Hoàn thành (CheckCircle)
- [ ] Styling: `text-sm`, `bg-bg-base/50`, `rounded-lg`, height ~40px, `py-2 px-4`
- [ ] Dùng CSS classes từ design-system.css
- [ ] Mobile: scroll horizontal hoặc wrap 2x2

### 2. Update `contracts-list-client.tsx`
- [ ] **BỎ** block header (h1 + subtitle) — lines 102-113
- [ ] **BỎ** `<ContractsStats>` — line 116
- [ ] **THÊM** `<CompactStats>` + nút "+Tạo HĐ" cùng 1 dòng flex
- [ ] Layout mới: `flex items-center justify-between mb-4`
  - Left: `<CompactStats stats={MOCK_STATS} />`  
  - Right: Button "+Tạo hợp đồng"

### 3. Clean up imports
- [ ] Remove import `ContractsStats` 
- [ ] Add import `CompactStats`
- [ ] Import `Plus` vẫn giữ (cho button)

## Files to Create/Modify
- `components/contracts/compact-stats.tsx` — **CREATE** (new component)
- `components/contracts/contracts-list-client.tsx` — **MODIFY** (remove h1 + KPI, add CompactStats)
- `components/contracts/contracts-stats.tsx` — KEEP (không xóa file, có thể dùng lại ở detail page)

## Test Criteria
- [ ] Không còn title "Hợp đồng" trùng trong page content
- [ ] Stats hiển thị trên 1 dòng compact (desktop)
- [ ] Nút "+Tạo hợp đồng" nằm bên phải dòng stats
- [ ] Mobile: stats wrap gọn, button vẫn accessible
- [ ] Build thành công, không TypeScript errors

---
Next Phase: phase-02-dropdown-filters.md
