# Phase 04: Build + Browser Verification
Status: ⬜ Pending
Dependencies: Phase 01, 02, 03

## Objective
Build check + verify UI trên browser.

## Steps

1. [ ] `npx next build` — zero errors
2. [ ] Kill port 3000 → `npm run dev`
3. [ ] Mở browser → navigate to contract detail
4. [ ] Click event card → modal mở
5. [ ] Verify:
   - DatePicker hiện đúng ngày
   - Click DatePicker → calendar popup → chọn ngày → toast + refresh
   - Time pill hiện giờ BĐ/KT (on-set)
   - Location pill hiện địa điểm
   - Thêm task → event badge đổi status
   - Toggle task → auto-complete event khi tất cả xong
6. [ ] Screenshot trước/sau để audit

---
Done! 🎉
