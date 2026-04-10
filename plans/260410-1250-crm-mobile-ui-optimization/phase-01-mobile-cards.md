# Phase 01: Cấu trúc lại Mobile Cards
Status: ⬜ Pending
Dependencies: None

## Objective
Tái cấu trúc 1:1 `LeadCard` và `CustomerCard` để giống hệt chuẩn thiết kế của `PrintingCard`. 

## Requirements
### Functional
- [x] Chuyển HTML của Mobile Card từ flex wrap lộn xộn sang lưới Grid 1 cột (`grid-cols-1 gap-2`).
- [x] Xoá thẻ bọc `ChevronRight` và `Deal Value` dư thừa ở góc bên phải.
- [x] Thêm 1 Row riêng ở đáy (Bottom Action Footer) dùng `justify-between`.
- [x] Đưa `StatusSelect` (Dropdown đổi trạng thái nhanh) vào nửa trái của Bottom Action.
- [x] Đưa nút `Sửa` hoặc `Chi tiết` vào nửa phải của Bottom Action.

### Non-Functional
- [x] Font size chuẩn `text-sm`, icon size `w-4 h-4`.
- [x] Dùng style `card-base p-4 hover-lift space-y-2.5` cho Class cha.

## Implementation Steps
1. [x] Cập nhật `components/crm/lead-card.tsx` theo chuẩn YCKT.
2. [x] Cập nhật `components/crm/customer-card.tsx` theo chuẩn YCKT.

## Files to Create/Modify
- `components/crm/lead-card.tsx` - Áp dụng layout mới.
- `components/crm/customer-card.tsx` - Áp dụng layout mới.

## Test Criteria
- [ ] Card hiển thị trên điện thoại cực rộng và rõ ràng từng dòng.
- [ ] Click Dropdown Đổi trạng thái ở Row dưới cùng hoạt động mượt mà không bị click nhầm vào Card detail.

---
Next Phase: `/code phase-02`
