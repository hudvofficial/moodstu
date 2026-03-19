# Phase 03: ContractForm Two-column Refactor
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Refactor `ContractForm/index.tsx` để:
1. Dùng `FullpageFormShell` thay vì layout inline
2. Tách sections thành LEFT (S1/S2/S3/S6) và RIGHT panel (S4/S5/Actions)
3. Bỏ `FormActions` dạng `fixed bottom-0` trên desktop (thay bằng right panel)
4. FormActions vẫn giữ fixed footer trên mobile (< lg)

## Section Mapping

| Section | Hiện tại | Sau refactor |
|---------|----------|-------------|
| S1: Thông tin HĐ | main flow | LEFT column |
| S2: Khách hàng | main flow | LEFT column |
| S3: Dịch vụ & SP | main flow | LEFT column |
| S4: Tổng kết TC | main flow | RIGHT panel (top) |
| S5: Thanh toán | main flow | RIGHT panel (middle) |
| S6: Ghi chú | main flow | LEFT column (bottom) |
| FormActions | `fixed bottom-0` | RIGHT panel (bottom, desktop) + `fixed bottom-0` (mobile only) |

## Right Panel Structure
```tsx
// Trong ContractForm/index.tsx — rightPanel prop
<div className="space-y-4">
  {/* S4 */}
  <ContractFinancialSummary ... />

  {/* S5 */}
  <ContractPaymentSection ... />

  {/* Actions — desktop only (mobile dùng FormActions fixed footer) */}
  <div className="hidden lg:block">
    <FormActionsPanel ... />
  </div>
</div>
```

## FormActions adjustment
- Desktop (lg+): render trong right panel, không fixed
- Mobile (< lg): vẫn giữ `fixed bottom-0` như hiện tại
- Tạo thêm `FormActionsPanel` variant (non-fixed, dùng trong right panel)
  HOẶC thêm prop `variant="panel" | "fixed"` vào `FormActions`

## Files to Modify
- `components/contracts/form/index.tsx` — chính, refactor layout
- `components/contracts/form/FormActions.tsx` — thêm variant prop

## Header breadcrumb
```tsx
// Truyền vào FullpageFormShell
breadcrumb={
  <button onClick={handleBack} className="...">
    <ArrowLeft /> Quay lại danh sách
  </button>
}
headerRight={badgeCode && <ContractBadge code={badgeCode} />}
```

## Container Width
- FullpageFormShell: `max-w-6xl` (1152px)
- Bỏ `max-w-4xl` trên header/content

## Test Criteria
- [ ] Desktop: 2 cột — LEFT scroll, RIGHT sticky
- [ ] Mobile: 1 cột — S1→S2→S3→S4→S5→S6, fixed footer
- [ ] S4 financial summary update khi thêm/xóa dịch vụ
- [ ] S5 payment section hiển thị đúng trong right panel
- [ ] FormActions buttons hoạt động đúng ở cả desktop và mobile

---
Next Phase: phase-04-move-routes.md
