# Phase 02: Tích hợp + Cleanup
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Thay thế `window.print()` bằng `printDressLabel()` trong cả 2 file.
Xóa CSS `@media print` thừa (không cần nữa vì popup tự xử lý).

## Implementation Steps

### 2.1 dress-form-modal.tsx (Modal Sửa — single print)
1. [ ] Import `printDressLabel` từ `lib/print-qr-label`
2. [ ] Thêm ref hoặc logic lấy QR canvas data URL trước khi gọi print
3. [ ] Thay `onClick={() => window.print()}` (L184) → `onClick={() => printDressLabel(editItem, qrDataUrl)}`
4. [ ] Xóa block `<style jsx global>` @media print (L281-300)
5. [ ] Xóa class `qr-print-area` + `print:hidden` (không cần nữa)

### 2.2 dress-qr-modal.tsx (Modal QR — single + batch)
1. [ ] Import `printDressLabel` từ `lib/print-qr-label`
2. [ ] Single mode: thay `window.print()` (L89) → `printDressLabel(items[0], qrDataUrl)`
3. [ ] Batch mode: loop qua items, ghi tất cả nhãn vào 1 popup → in 1 lần
4. [ ] Xóa block `<style jsx global>` @media print (L129-153)
5. [ ] Xóa class `qr-print-area` (không cần nữa)

### 2.3 Rollback CSS changes (từ session trước)
1. [ ] Đảm bảo CSS `@media print` đã bị xóa hoàn toàn (em đã sửa sai trước đó)
2. [ ] Verify nút vẫn là `btn-primary` (đã đổi đúng)

## Files to Modify
- `components/dresses/dress-form-modal.tsx`
- `components/dresses/dress-qr-modal.tsx`

## Test Criteria
- [ ] Bấm "In nhãn QR" trong modal Sửa → popup mở → hiện nhãn QR → in → đóng
- [ ] Bấm "In" trong modal QR (single) → popup → in → đóng
- [ ] Bấm "In X nhãn" (batch) → popup → hiện tất cả nhãn → in → đóng
- [ ] **KHÔNG** còn trắng trang
- [ ] Build check: `npm run build` pass
- [ ] Nút "In nhãn QR" vẫn hiện nền nâu (btn-primary) ✅

---
Done! 🎉
