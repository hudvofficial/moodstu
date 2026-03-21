# Phase 02 (FIX): Bỏ trùng lặp tài chính — Thêm caption chiết khấu

Status: ⬜ Pending
Dependencies: Phase 01 ✅

## Vấn đề hiện tại

Block "Tổng kết tài chính" (FinancialSummary) embed trong sidebar **trùng 100%** thông tin:
- Tổng hợp đồng 63M → đã có "TỔNG CỘNG" phía trên
- Đã thanh toán 35M → đã có grid "ĐÃ THU"
- Còn phải thu 28M → đã có grid "CÒN NỢ"
- Tạm tính + Giảm giá → đã có ở "Chi tiết dịch vụ" (main column)

## Giải pháp

Bỏ FinancialSummary khỏi sidebar → Thêm 1 dòng caption chiết khấu dưới TỔNG CỘNG

## Tasks

### Task 1: Bỏ FinancialSummary render trong desktop variant
- [ ] File: `financial-dashboard.tsx`
- [ ] Xóa block `{subtotal != null && subtotal > 0 && (<FinancialSummary .../>)}`
- [ ] Giữ import nếu dùng nơi khác, bỏ nếu không

### Task 2: Thêm caption chiết khấu dưới TỔNG CỘNG
- [ ] File: `financial-dashboard.tsx` (desktop variant)
- [ ] Dưới dòng `<p className="text-amount">...TỔNG CỘNG...</p>`
- [ ] Thêm: `{discountAmount > 0 && <p className="text-caption">Tạm tính: {subtotal} · Giảm: −{discount}</p>}`

### Task 3: Cleanup props nếu không cần
- [ ] Nếu `subtotal` + `discountAmount` vẫn cần cho caption → giữ
- [ ] Nếu không cần `FinancialSummary` import → xóa import

### Task 4: Verify
- [ ] Build thành công
- [ ] Screenshot sidebar → xác nhận không còn block "Tổng kết"
- [ ] Xác nhận caption chiết khấu hiện đúng

## Files sửa
- `components/contracts/detail/financial-dashboard.tsx`
- `components/contracts/detail/contract-detail-client.tsx` (nếu cần bỏ props)

## Không sửa
- `financial-summary.tsx` (giữ nguyên, có thể dùng nơi khác)
- Database, API: không đổi
