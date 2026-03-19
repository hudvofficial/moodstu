# 🏥 Audit Report — Contract Form SSOT Compliance
**Date:** 2026-03-18 14:15  
**Scope:** `components/contracts/form/` (16 files)  
**Auditor:** Antigravity Code Auditor

---

## Summary
- 🔴 Critical Issues: **3** (inline buttons, inline labels, inline errors — vi phạm SSOT)
- 🟡 Warnings: **4** (dropdown card chưa dùng `card-base`, duplicate Field/FormField, inline button states)
- 🟢 Suggestions: **2** (nhất quán hóa helper components, extract ModalActions)

> **Tình trạng tổng:** Phần lớn input/card/heading ĐÃ ĐƯỢC fix (session trước). Nhưng còn **3 nhóm vi phạm quan trọng** cần sửa.

---

## ✅ ĐÃ ĐÚNG SSOT (Không cần sửa)

| File | Status | Notes |
|------|--------|-------|
| `ContractInfoSection.tsx` | ✅ PASS | `input-base`, `card-base`, `label-base`, `text-label` |
| `ContractPaymentSection.tsx` | ✅ PASS | `input-base`, `card-base`, `label-base`, `badge`, `text-label` |
| `ContractFinancialSummary.tsx` | ✅ PASS | `input-base`, `card-base`, `text-label` |
| `ContractItemsSection.tsx` | ✅ PASS | `card-base`, `badge`, `btn btn-ghost`, `btn btn-interactive`, `error-text`, `text-label` |
| `FormActions.tsx` | ✅ PASS | `btn btn-secondary`, `btn btn-interactive`, `error-text` |
| `index.tsx` (shell) | ✅ PASS | `text-h2`, `text-label`, `input-base` |
| `ContractCustomerSection.tsx` | ⚠️ Partial | `input-base` ✅, `card-base` ✅, `error-text` ✅, **nhưng see Issues below** |
| `hooks/*.ts` (4 files) | ✅ N/A | Pure logic, no UI classes |
| `modals/ItemModal.tsx` | ✅ PASS | Delegates to sub-forms, uses UnifiedModal |
| `modals/CustomerFormModal.tsx` | ⚠️ Partial | `input-base` ✅, **nhưng see Issues below** |
| `modals/ServiceItemForm.tsx` | ⚠️ Partial | `input-base` ✅, **nhưng see Issues below** |
| `modals/AddonItemForm.tsx` | ⚠️ Partial | `input-base` ✅, **nhưng see Issues below** |
| `modals/CreateServiceModal.tsx` | ⚠️ Partial | `input-base` ✅, **nhưng see Issues below** |

---

## 🔴 Critical Issues (PHẢI SỬA)

### C1: Inline Button Styles — 7 vi phạm

Có `.btn` + `.btn-secondary` / `.btn-interactive` / `.btn-ghost` trong design-system.css, nhưng **7 nút** vẫn hardcode inline.

| File | Line | Inline Class | Should Be |
|------|------|-------------|-----------|
| `ServiceItemForm.tsx` | L240 | `rounded-radius-md px-4 py-2 text-body-sm font-medium text-text-secondary hover:bg-bg-hover` | `btn btn-ghost` |
| `ServiceItemForm.tsx` | L243 | `rounded-radius-md bg-interactive px-4 py-2 text-body-sm font-medium text-text-inverse hover:bg-interactive-hover` | `btn btn-interactive` |
| `AddonItemForm.tsx` | L143 | Same cancel pattern | `btn btn-ghost` |
| `AddonItemForm.tsx` | L146 | Same submit pattern | `btn btn-interactive` |
| `CreateServiceModal.tsx` | L105 | Same cancel pattern | `btn btn-ghost` |
| `CreateServiceModal.tsx` | L112 | Same submit pattern + `disabled:opacity-50` | `btn btn-interactive` |
| `CustomerFormModal.tsx` | L242 | Same cancel pattern | `btn btn-ghost` |
| `CustomerFormModal.tsx` | L250 | Same submit pattern + `disabled:opacity-50` | `btn btn-interactive` |
| `index.tsx` | L55 | Error page "Quay lại" button inline | `btn btn-interactive` |

### C2: Inline Label Styles — 12 vi phạm

Có `.label-base` trong design-system.css, nhưng **12 labels** vẫn hardcode `mb-1 block text-caption font-medium text-text-secondary`.

| File | Lines | Count |
|------|-------|-------|
| `AddonItemForm.tsx` | L82, L96, L111, L115, L119, L126 | 6 |
| `CreateServiceModal.tsx` | L66, L79, L91 | 3 |
| `CustomerFormModal.tsx` | L265 (FormField wrapper) | 1 (affects ~10 usages) |
| `ServiceItemForm.tsx` | L220 (Field wrapper) | 1 (affects ~4 usages) |

### C3: Inline Error Text — 3 vi phạm

Có `.error-text` trong design-system.css, nhưng **3 errors** vẫn hardcode `text-caption text-error`.

| File | Line | Inline Class |
|------|------|-------------|
| `AddonItemForm.tsx` | L91 | `mt-1 text-caption text-error` |
| `CreateServiceModal.tsx` | L102 | `text-caption text-error` |
| `CustomerFormModal.tsx` | L234 | `text-caption text-error` |

---

## 🟡 Warnings (NÊN SỬA)

### W1: Dropdown container chưa dùng `card-base`
- **File:** `ContractCustomerSection.tsx` L120
- **Current:** `rounded-radius-md bg-bg-card shadow-lg`  
- **Should:** `card-base` + `shadow-lg` (override shadow)

### W2: Duplicate Field/FormField helper components
- `ContractInfoSection.tsx` có `Field` component
- `ServiceItemForm.tsx` có `Field` component (copy)
- `CustomerFormModal.tsx` có `FormField` component (copy)
- **Tất cả** đều wrap `<label> + {children}` → **nên extract thành 1 shared component**

### W3: Duplicate ModalActions helper
- `ServiceItemForm.tsx` L227-248 có local `ModalActions`
- `AddonItemForm.tsx` L142-149 có inline button pair (same pattern)
- **Nên extract thành shared** `components/contracts/form/modals/ModalActions.tsx`

### W4: Section title h3 inline trên customer "Searching" state
- **File:** `ContractCustomerSection.tsx` L96
- **Current:** `text-body-sm font-semibold text-text-primary`  
- **Should:** `text-label font-semibold text-text-primary` (like other sections)

---

## 🟢 Suggestions (TÙY CHỌN)

### S1: Extract shared `FormField` component
Cả 3 wrappers (Field, FormField, inline divs) đều làm cùng 1 việc. Tạo `components/contracts/form/shared/FormField.tsx` export 1 component duy nhất.

### S2: Extract shared `ModalActions` component
Pattern `Cancel + Submit` button pair lặp lại ở 4 modal files. Extract ra 1 file shared.

---

## Files cần sửa

| File | Issues | Effort |
|------|--------|--------|
| `ServiceItemForm.tsx` | C1(2 btns), C2(1 Field wrapper) | Small |
| `AddonItemForm.tsx` | C1(2 btns), C2(6 labels), C3(1 error) | Medium |
| `CreateServiceModal.tsx` | C1(2 btns), C2(3 labels), C3(1 error) | Medium |
| `CustomerFormModal.tsx` | C1(2 btns), C2(1 FormField wrapper), C3(1 error) | Small |
| `ContractCustomerSection.tsx` | W1(dropdown), W4(h3 title) | Small |
| `index.tsx` | C1(1 btn inline in error state) | Tiny |
