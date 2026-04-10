# Phase 02: Lead Compact Card Safety
Status: ⬜ Pending

## Objective
Audit và double check `LeadCompactCard` (và `CustomerCompactCard`) đảm bảo chúng bung full chiều rộng (`w-full`) bất kể khung chứa có bị thay đổi Flexbox, nhằm đề phòng các lỗi clipping (cắt xén) text. Đồng thời kiểm tra xem Mobile Mode có bị che khuất hành động swipe nào do overflow không.

## Implementation Steps
1. [ ] Check `SwipeableCard` xem component cha/con có đang sử dụng class nào xung đột về `flex` hay `hidden` không. Đảm bảo `<motion.div>` bọc ngoài có height = nội dung.
2. [ ] Rà soát `customer-list-page.tsx` cho đồng nhất layout.

## Files to Modify
- `components/crm/lead-compact-card.tsx` (nếu cần)
- `components/crm/customer-list-page.tsx` (kiểm tra `hidden lg:flex` wrappers).

---
Next Phase: N/A
