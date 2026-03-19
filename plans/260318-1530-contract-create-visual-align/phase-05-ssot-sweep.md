# Phase 05: SSOT Compliance Sweep

**Status:** ⬜ Pending
**Dependencies:** Phase 01-04
**Files:** All form components (~6 files)

---

## Objective

Quét toàn bộ contract form files, đảm bảo 100% SSOT compliance:
- Mọi input dùng `.input-base`
- Mọi label dùng `.label-base`
- Mọi card dùng `.card-base`
- Mọi button dùng `.btn` variants
- KHÔNG inline Tailwind classes cho colors/radius/borders

## Implementation Steps

### Step 1: Grep check (TRƯỚC khi fix)

```bash
# Tìm inline classes vi phạm
grep -rn "rounded-radius\|bg-bg-input\|px-3 py-2" components/contracts/form/
grep -rn "className=\".*border-\[" components/contracts/form/
```

- [ ] List tất cả violations

### Step 2: Fix violations

- [ ] Replace inline input styles → `.input-base`
- [ ] Replace inline label styles → `.label-base` or `.text-label`
- [ ] Replace inline card wrappers → `.card-base`
- [ ] Replace inline button styles → `.btn .btn-*`
- [ ] Replace hardcoded colors → token references

### Step 3: Verify Form Field component usage

- [ ] Check nếu có shared `<Field>` component → dùng nó
- [ ] Nếu có custom Field in ContractInfoSection → extract shared

## Test Criteria

- [ ] Zero inline Tailwind violations in form files
- [ ] All inputs = `.input-base`
- [ ] All labels = `.label-base` or `.text-label`
- [ ] All buttons = `.btn` variants
- [ ] grep returns 0 violations

---
Next Phase: Phase 06 (Visual Verification)
