# Phase 02: Consolidate FilterChip
Status: ✅ Complete

## Objective
Gom `FilterChip` (nút báo hiển thị đang Filter trên giao diện Mobile) vào một nơi quản lý duy nhất là `CrmLayoutHeader`. Dọn dẹp các tàn dư code liên quan đến Render FilterChip ở các Component con đứt gãy.

## Requirements
### Functional
- [ ] Xóa `FilterChip` khỏi `CustomerListClient` và `app/(protected)/crm/leads/page.tsx` (hoặc bất kì file nào render trực tiếp nó).
- [ ] Nhét `FilterChip` trực tiếp vào trong `CrmLayoutHeader` với DOM layout phù hợp (Nằm riêng một dòng hoặc xen kẽ trên mobile, và ẩn trên Desktop vì Desktop đã hiển thị đầy đủ cái `q`).
- [ ] Đảm bảo Layout không bị nhảy quá mức khi có/không có Chip.
- [ ] Cải thiện UI di động: Giao diện search `input` nên giấu đi vào dạng Icon hoặc nằm gọn dưới gầm FilterChip để không bị tràn màn hình.

## Implementation Steps
1. Mở `CrmLayoutHeader.tsx`, import và sử dụng `FilterChip`.
2. Sắp xếp lại class Tailwind cho Responsive Breakpoints (`md:hidden` vs `md:flex`).
3. Gỡ `FilterChip` ra khỏi `CustomerListClient.tsx` và `LeadsPage`.

## Files to Modify
- `components/crm/CrmLayoutHeader.tsx`
- `components/crm/customers/CustomerListClient.tsx`
- `app/(protected)/crm/leads/page.tsx`

---
Next Phase: phase-03-qa.md
