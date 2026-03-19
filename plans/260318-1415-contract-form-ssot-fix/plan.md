# Plan: Contract Form SSOT Compliance Fix
Created: 2026-03-18T14:15
Status: 🟡 In Progress

## Overview
Sửa toàn bộ vi phạm SSOT trong `components/contracts/form/`.
Audit Report: `docs/reports/audit_contract_form_ssot_20260318.md`

## Nguyên tắc
1. **CHỈ thay inline → SSOT class** — không thay đổi logic/layout
2. **Không thêm file mới** trừ Phase 03 (extract shared components)
3. **Mỗi phase = 1 loại fix** — dễ review + rollback

## SSOT Classes Reference (design-system.css)
| Class | Dùng cho |
|-------|---------|
| `.input-base` | input, select, textarea |
| `.label-base` | form labels |
| `.error-text` | validation messages |
| `.card-base` | card wrappers |
| `.badge` | status/type badges |
| `.btn` | button base |
| `.btn-interactive` | primary CTA |
| `.btn-ghost` | ghost/cancel |
| `.btn-secondary` | secondary |
| `.text-label` | section headings |

## Phases

| Phase | Name | Status | Scope |
|-------|------|--------|-------|
| 01 | Fix Inline Buttons | ⬜ Pending | C1: 9 nút across 5 files |
| 02 | Fix Inline Labels + Errors | ⬜ Pending | C2+C3: labels + errors across 4 files |
| 03 | Fix Warnings (dropdown, h3, extract shared) | ⬜ Pending | W1-W4 + S1+S2 |
| 04 | Verify Build + Final Scan | ⬜ Pending | tsc + grep check |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: xem file này

---

# Phase 01: Fix Inline Buttons → SSOT
Status: ⬜ Pending
Dependencies: None

## Objective
Thay 9 inline button class → `.btn .btn-*` SSOT classes

## Files to Modify

### 1. `modals/ServiceItemForm.tsx`
- **L240:** Cancel button `rounded-radius-md px-4 py-2 text-body-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors` → `btn btn-ghost`
- **L243:** Submit button `rounded-radius-md bg-interactive px-4 py-2 text-body-sm font-medium text-text-inverse hover:bg-interactive-hover transition-colors` → `btn btn-interactive`

### 2. `modals/AddonItemForm.tsx`
- **L143:** Cancel button → `btn btn-ghost`
- **L146:** Submit button → `btn btn-interactive`

### 3. `modals/CreateServiceModal.tsx`
- **L105:** Cancel button → `btn btn-ghost`
- **L112:** Submit button `flex items-center gap-2 rounded-radius-md bg-interactive px-4 py-2 text-body-sm font-medium text-text-inverse hover:bg-interactive-hover disabled:opacity-50 transition-colors` → `btn btn-interactive`

### 4. `modals/CustomerFormModal.tsx`
- **L242:** Cancel button → `btn btn-ghost`
- **L250:** Submit button → `btn btn-interactive`

### 5. `index.tsx`
- **L55:** Error state "Quay lại" button `rounded-radius-md bg-interactive px-4 py-2 text-body-sm text-text-inverse hover:bg-interactive-hover transition-colors` → `btn btn-interactive`

## Test Criteria
- [ ] `tsc --noEmit` passes
- [ ] grep `rounded-radius-md bg-interactive` in form folder = 0 results
- [ ] grep `hover:bg-bg-hover transition-colors` in form folder = 0 results (for buttons)

---

# Phase 02: Fix Inline Labels + Errors → SSOT
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
- Thay 12 inline label class → `.label-base`
- Thay 3 inline error class → `.error-text`

## Files to Modify

### 1. `modals/AddonItemForm.tsx`
Labels at L82, L96, L111, L115, L119, L126:
- `mb-1 block text-caption font-medium text-text-secondary` → `label-base`
Error at L91:
- `mt-1 text-caption text-error` → `error-text`

### 2. `modals/CreateServiceModal.tsx`
Labels at L66, L79, L91:
- `mb-1 block text-caption font-medium text-text-secondary` → `label-base`
Error at L102:
- `text-caption text-error` → `error-text`

### 3. `modals/CustomerFormModal.tsx`
FormField wrapper at L265:
- `mb-1 block text-caption font-medium text-text-secondary` → `label-base`
Error at L234:
- `text-caption text-error` → `error-text`

### 4. `modals/ServiceItemForm.tsx`
Field wrapper at L220:
- `mb-1 block text-caption font-medium text-text-secondary` → `label-base`

## Test Criteria
- [ ] `tsc --noEmit` passes
- [ ] grep `mb-1 block text-caption font-medium text-text-secondary` in form folder = 0 results
- [ ] grep `text-caption text-error` in form folder = 0 results

---

# Phase 03: Fix Warnings + Extract Shared Components
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
- W1: Dropdown card → `card-base`
- W4: h3 title → `text-label`
- S1: Extract shared `FormField` component
- S2: Extract shared `ModalActions` component

## Files to Create
- `components/contracts/form/shared/FormField.tsx` — `<label className="label-base">{label}</label>{children}`
- `components/contracts/form/shared/ModalActions.tsx` — Cancel + Submit btn pair

## Files to Modify
- `ContractCustomerSection.tsx` L96, L120 → fix h3 + dropdown
- `ContractInfoSection.tsx` → import shared FormField, remove local Field
- `ServiceItemForm.tsx` → import shared FormField + ModalActions, remove locals
- `AddonItemForm.tsx` → import shared FormField + ModalActions, remove inline btns
- `CreateServiceModal.tsx` → import shared FormField + ModalActions
- `CustomerFormModal.tsx` → import shared FormField, remove local FormField

## Test Criteria
- [ ] `tsc --noEmit` passes
- [ ] Zero duplicate Field/FormField wrappers
- [ ] Zero duplicate ModalActions patterns

---

# Phase 04: Verify Build + Final Scan
Status: ⬜ Pending
Dependencies: Phase 03

## Objective
Final verification — ZERO inline violations remaining

## Tasks
1. [ ] Run `tsc --noEmit` — 0 errors
2. [ ] Run grep checks:
   - `rounded-radius-md bg-bg-input` in form folder = 0
   - `rounded-radius-md bg-bg-card` in form folder = 0
   - `rounded-radius-md bg-interactive` in form folder = 0
   - `mb-1 block text-caption font-medium` in form folder = 0
   - `text-caption text-error` in form folder = 0
3. [ ] Run dev server — form renders correctly
4. [ ] Update `tasks/lessons.md` if needed
