# Phase 03e: UI Slice 5 — Goals, Budget & Close Management
Status: ⬜ Pending
Dependencies: Phase 03d, `finance_monthly_closes` tables.

## Objective
Module cuối cùng: UI Mục tiêu tài chính (Goals), Budget vs Actual (ngân sách vs thực tế), và quy trình chốt sổ tháng (Close Management).

---

## Files to Create

### Goals
| File | Mục đích |
|---|---|
| `app/(protected)/finance/goals/page.tsx` | Goals page server component |
| `components/finance/goals/goals-client.tsx` | Goal tracking visuals (progress bar) |
| `components/finance/goals/goal-form-modal.tsx` | `<UnifiedModal>` for Goal CRUD |

### Budget
| File | Mục đích |
|---|---|
| `app/(protected)/finance/budget/page.tsx` | Budget vs Actuals server component |
| `components/finance/budget/budget-client.tsx` | Bảng so sánh ngân sách & chi phí thực tế (đã fix bug B2, B9) |
| `components/finance/budget/budget-form-modal.tsx` | `<UnifiedModal>` set ngân sách cho categories |

### Close Management
| File | Mục đích |
|---|---|
| `app/(protected)/finance/closes/page.tsx` | Close management hub server component |
| `app/(protected)/finance/closes/[id]/page.tsx` | Chi tiết 1 kỳ chốt sổ (8 bước) |
| `components/finance/closes/close-list.tsx` | List các kỳ đã/đang xử lý |
| `components/finance/closes/close-detail-view.tsx` | View 8 bước. Nút "Chuyển bước". Render UI từ `finance_close_tasks` |

---

## SSOT Acceptance Criteria (Phase 03e)

> **Checklist kiểm được — PHẢI pass 100% trước Phase 04**

- [ ] Page wrapper dùng `main-container`
- [ ] Goal items render dùng `card-base` hoặc `stats-card`
- [ ] Progress bars UI dùng native SSOT (nếu có) hoặc thẻ div inline style an toàn (`width: XX%`) với CSS var token
- [ ] Mọi Form modal dùng `<UnifiedModal>` size `"md"` hoặc `"lg"`
- [ ] Budget table dùng `<TableWrapper>` + `<TBody>` + `<TR>`
- [ ] Progress percentage `tabular-nums`
- [ ] Form inputs: `input-base`, `form-grid-2col`
- [ ] "Chuyển bước" (Advance close task) dùng `btn-interactive`
- [ ] Badge trạng thái quy trình: `chua_bat_dau` (neutral), `dang_thuc_hien` (info), `hoan_thanh` (success), `co_van_de` (error).
- [ ] KHÔNG tạo CSS classes mới. Không `<input type="number">`. Dùng `<CurrencyInput>`.
- [ ] Icons chỉ từ `lucide-react`
- [ ] Mọi file < 250 lines

---

## SWR Cache Strategy (Phase 03e)

| Data | Cache Key | Revalidation |
|------|-----------|--------------|
| Goals | `cacheKeys.goals()` | Sau khi Thêm/Update/Contribution |
| Budgets | `cacheKeys.financeBudgets(month, year)` | Sau khi set budgets. |
| Closes list | `cacheKeys.financeCloses(year)` | Sau khi create kỳ chốt. |
| Close detail| `cacheKeys.financeCloseDetail(id)` | Sau khi `advanceCloseTask`. |

**Rules**:
- Budget vs Actuals: (Performance Contract 4.6) `getBudgetsWithActuals(m, y)` bắt buộc fetch server-side, ghép từ `expenses` join `transaction_categories`. (BUG B2, B9 resolved in action, UI just renders returned data).

---

## Business Logic

### Budget vs Actuals
- Dữ liệu trả về sẽ là `Array<{ category_name, budget_amount, actual_spent, usage_percent }>`.
- Nếu `usage_percent > 100` → hiển thị text màu đỏ (`text-error`) hoặc badge warning.

### Close Management Flow
- UI hiển thị 8 bước tĩnh:
  1. Chốt quỹ tiền mặt
  2. Đối chiếu ngân hàng
  3. Quét Ghost Payments
  4. Xác nhận lương
  5. Cập nhật chi phí cố định
  6. Khấu hao tài sản
  7. Confirm thu chi khác
  8. Lock kỳ
- Nút Action trên mỗi step dựa theo State Machine được define trong RPC `advance_close_task` (Phase 01):
  - Check lock state -> Nếu Locked disable ALL.
  - Step 8 DONE -> Auto Lock Period.

---

## Implementation Steps
1. [ ] Tạo pages và client component cho Goals
2. [ ] Tạo pages và client component cho Budget (verify fix B2, B9 output)
3. [ ] Tạo pages (list + detail) và client component cho Close Management
4. [ ] Khớp nút "Next Step" vào RPC action `advanceCloseTask`
5. [ ] Wire SWR mutation
6. [ ] SSOT Acceptance Criteria checklist
7. [ ] `npm run build` pass

## Test/Verification Criteria
- [ ] Mở `/finance/goals` → xem danh sách mục tiêu.
- [ ] Form contribution lưu DB ok.
- [ ] Mở `/finance/budget` → view bảng vs Actual. Actual số tiền đúng từ `expenses`.
- [ ] Mở `/finance/closes` → tạo kỳ `2026-04`.
- [ ] Mở detail kỳ, test advance step 1 -> step 2. Thử jump step (bị từ chối).
- [ ] Advance full 8 steps → Status Close trở thành `locked`.
- [ ] Mọi acceptance criteria pass 100%. `npm run build` không lỗi.

---
Next Phase: `phase-04-verify.md`
