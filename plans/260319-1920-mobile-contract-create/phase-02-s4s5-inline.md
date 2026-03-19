# Phase 02: S4+S5 Mobile Inline
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Khi sidebar ẩn trên mobile, S4 (Tổng kết tài chính) + S5 (Thanh toán ban đầu) biến mất.
Cần render inline cho mobile, giữa S3 và S6.

## File: `components/contracts/form/index.tsx`

## Implementation

### Vị trí chèn: Sau S3 (ContractItemsSection), trước S6 (Notes)
Khoảng dòng 181-183 hiện tại.

### Code thêm:
```tsx
{/* Section 4+5: Mobile inline — desktop hiện trong rightPanel */}
<div className="lg:hidden space-y-4">
  <ContractFinancialSummary
    financials={form.financials}
    isEditMode={mode === "edit"}
  />
  {form.shouldShowPaymentSection && (
    <ContractPaymentSection financials={form.financials} />
  )}
</div>
```

## Design Decision
- S4+S5 render **2 lần**: inline (mobile, `lg:hidden`) + rightPanel (desktop, `hidden lg:flex` trên sidebar)
- Pattern đã tồn tại: FormActions cũng render 2 lần (fixed footer mobile + panel desktop)
- `lg:hidden` dùng trên wrapper div (không phải component), tránh lesson #57 issue

## Impact Assessment
- ✅ Desktop: S4+S5 vẫn trong rightPanel sidebar
- ✅ Mobile: S4+S5 hiện inline sau S3
- ⚠️ Content render double nhưng chỉ 1 bản visible → acceptable

## Test Criteria
- [ ] Mobile 375px: S4 "Tổng kết tài chính" hiện full width sau S3
- [ ] Mobile 375px: S5 "Thanh toán ban đầu" hiện full width sau S4
- [ ] Desktop 1920px: S4+S5 vẫn trong sidebar phải, inline bị hidden

---
Next Phase: phase-03-footer-polish.md
