# Phase 02: UI Consistency — Stock-out Modal
Status: ⬜ Pending
Dependencies: Phase 01 (SSOT exports cần có trước)

## Objective
Fix 2 vấn đề UI trong stock-out-modal:
1. Tabs bị truncate text trên mobile ("Bá...", "Xu...", "Bán...", "Nộ...")
2. Payment method dùng Button toggle thay vì SimpleSelect (inconsistent với toàn app)

## Implementation Steps

### A. Fix tabs truncate
1. [ ] **stock-out-modal.tsx** — Thay đổi mode selector:
   - Desktop (sm+): giữ 4-col grid buttons có icon + text
   - Mobile (<sm): dùng `SimpleSelect` dropdown hoặc hiển thị full text bằng cách giảm padding
   
   **Approach chọn:** Giảm font-size và dùng `text-xs` + bỏ `truncate` trên mobile. Giữ icon luôn hiện.
   ```
   Hiện tại: grid-cols-2 gap-2 sm:grid-cols-4 + truncate
   Fix: grid-cols-4 gap-1.5 + text-xs trên mobile, text-sm trên desktop
   ```

### B. Payment method: Button toggle → SimpleSelect
2. [ ] **stock-out-modal.tsx** — Thay 2x payment Button toggle blocks (line 555-567, line 592-604) bằng `SimpleSelect` component:
   ```tsx
   // TRƯỚC: 2 Button toggle
   <div className="grid grid-cols-2 gap-2">
     {(["tien_mat", "chuyen_khoan"] as PaymentMethod[]).map(method => (
       <Button variant={paymentMethod === method ? "primary" : "secondary"} ...>
         {paymentLabel(method)}
       </Button>
     ))}
   </div>

   // SAU: 1 SimpleSelect (consistent với expense, receipt, cancel-banner)
   <SimpleSelect
     label="Thanh toán"
     value={paymentMethod}
     onChange={(v) => setPaymentMethod(v as PaymentMethod)}
     options={PAYMENT_METHOD_OPTIONS}
   />
   ```

### C. Cleanup
3. [ ] Xóa `paymentLabel()` function (đã covered bởi Phase 01), xóa unused `PaymentMethod` toggle code

## Files to Modify
- `components/inventory/stock-out-modal.tsx` — Main changes

## Test Criteria
- [ ] Mobile: tabs hiện đủ text, không truncate
- [ ] Payment method là dropdown giống expense/receipt form
- [ ] Tất cả 4 mode (bán lẻ, xuất HĐ, bán thêm HĐ, nội bộ) vẫn hoạt động
- [ ] Submit bán lẻ + bán thêm HĐ vẫn gửi đúng `paymentMethod`

---
Next Phase: phase-03-realtime-consolidation.md
