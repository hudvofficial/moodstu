# Phase 03d: UI Slice 4 — Payroll (Salaries)
Status: ⬜ Pending
Dependencies: Phase 03c

## Objective
Dựng UI quản lý bảng lương (Payroll), tính toán lương tự động, penalty/bonus (adjustments).

---

## Files to Create

| File | Mục đích |
|---|---|
| `app/(protected)/finance/salaries/page.tsx` | Server component → fetch initial (`fallbackData`) |
| `components/finance/salaries/salaries-client.tsx` | Danh sách bảng lương các tháng, SWR |
| `components/finance/salaries/salary-detail-modal.tsx` | View chi tiết lương 1 nhân sự (Base + Product + Adjustments) |
| `components/finance/salaries/salary-adjustment-modal.tsx` | form thêm Penalty/Bonus |

---

## SSOT Acceptance Criteria (Phase 03d)

> **Checklist kiểm được — PHẢI pass 100% trước Phase 03e**

- [ ] Page wrapper dùng `main-container`
- [ ] List nhân sự trong tháng hiển thị dạng `<TableWrapper>` (Desktop) hoặc `card-interactive` (Mobile)
- [ ] Detail modal dùng `<UnifiedModal>` size `"xl"` hoặc `"full"`
- [ ] Adjustment form dùng `<UnifiedModal>` size `"md"`
- [ ] Amount input dùng `<CurrencyInput>`
- [ ] Mọi cột tiền dùng `tabular-nums`
- [ ] Thêm adjustment dùng `btn-interactive`
- [ ] Month/Year picker filter rõ ràng.
- [ ] Không hardcode colors
- [ ] Không custom modal
- [ ] Icons chỉ từ `lucide-react`
- [ ] Không có `try/catch` nuốt lỗi trong client gọi action → dùng SWR mutation flow chuẩn, catch show toast.

---

## SWR Cache Strategy (Phase 03d)

| Data | Cache Key | Revalidation |
|------|-----------|--------------|
| Danh sách lương tháng | `cacheKeys.financeSalaries(month, year)` | Sau khi thêm bonus/penalty, hoặc Recalc |

**Rules**:
- Recalc button: Gọi action `recalculateEmployeeSalary` (đã fix lỗi swallowed error ở Phase 02). Xong gọi `revalidate(cacheKeys.financeSalaries(m, y))`
- Update state optimistic khó vì logic tính lương do server quyết định → Reload data = bắt buộc.
- Modal phải sync data: Nếu tạo adjustment trong detail modal, refetch data để cập nhật số tổng. Xem chuẩn `modal-crud-sync-patterns.md`.

---

## Business Logic

### Recalculation Flow (Fix B5 applied)
- Nút "Tính lại lương" → Gọi action `recalculateEmployeeSalary`.
- Nếu lỗi: action throw → client show error toast. **KHÔNG nuốt lỗi**.
- Nếu thành công: trigger SWR revalidate.

### Adjustments
- Penalty/Bonus sẽ được add vào `salary_adjustments`.
- Recalc sẽ đọc bảng này và update vào `employee_salaries.net_salary`. Do đó bắt buộc phải gọi Recalc sau khi Add Adjustment (được xử lý gọn chung trong 1 flow hoặc server-side trigger).

---

## Implementation Steps
1. [ ] Tạo `app/(protected)/finance/salaries/page.tsx`
2. [ ] Tạo `salaries-client.tsx` hiển thị month picker và danh sách nhân sự
3. [ ] Tạo `salary-detail-modal.tsx` hiển thị cấu trúc Base, Product, Bonus, Penalty, Net
4. [ ] Tạo form thêm giảm lương `salary-adjustment-modal.tsx`
5. [ ] Wire SWR mutation and error handling cho B5 fix.
6. [ ] SSOT Acceptance Criteria checklist
7. [ ] `npm run build` pass

## Test/Verification Criteria
- [ ] Mở `/finance/salaries` hiển thị bảng lương.
- [ ] Xem chi tiết lương 1 người → `<UnifiedModal>` mở.
- [ ] Thêm thưởng 500k → `<CurrencyInput>` format đúng → Gọi server action thành công.
- [ ] Lỗi recalc (nếu có) hiển thị Toast đỏ rõ ràng.
- [ ] Không tạo custom css. SSOT pass 100%. `npm run build` pass.

---
Next Phase: `phase-03e-ui-goals-closes.md`
