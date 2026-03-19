# Phase 02: Badge → S1 Card (Mobile Only)
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Mobile: hiện mã HĐ (HĐ-2026-0009) bên trong card S1.
Hiện tại chỉ hiện ở edit mode — cần hiện luôn cả create mode (nếu có code).
Desktop: giữ nguyên (badge vẫn ở header).

## Changes

### File: `components/contracts/form/ContractInfoSection.tsx` (dòng ~97-107)

**Before:** Chỉ hiện contract_code ở edit mode
```tsx
{/* Contract code (edit mode: read-only) */}
{isEditMode && formData.contract_code && (
  <Field label="Mã hợp đồng">
    <input type="text" value={formData.contract_code} readOnly className="input-base opacity-50 cursor-not-allowed" />
  </Field>
)}
```

**After:** Mobile luôn hiện (nếu có code), desktop chỉ edit mode
```tsx
{/* Contract code — mobile: luôn hiện, desktop: chỉ edit mode */}
{formData.contract_code && (
  <div className={isEditMode ? "" : "lg:hidden"}>
    <Field label="Mã hợp đồng">
      <div className="flex items-center gap-2">
        <Fingerprint className="h-4 w-4 text-interactive shrink-0" />
        <span className="text-body font-bold text-interactive tracking-wider">
          {formData.contract_code}
        </span>
      </div>
    </Field>
  </div>
)}
```

Logic:
- `isEditMode` = true → hiện trên CẢ mobile + desktop (className="")
- `isEditMode` = false (create) → `lg:hidden` = chỉ hiện mobile
- Nếu `contract_code` = null/empty → không hiện

### Props: Thêm `Fingerprint` import
```tsx
import { Fingerprint } from "lucide-react";  // thêm vào imports
```

## Impact
- ✅ Desktop create: mã HĐ vẫn ở header badge (không đổi)
- ✅ Desktop edit: mã HĐ ở header badge + trong S1 card
- ✅ Mobile create: mã HĐ trong S1 card (nếu có)
- ✅ Mobile edit: mã HĐ trong S1 card
- ⚠️ Note: create mode có thể chưa có contract_code → field ẩn

## Test Criteria  
- [ ] Mobile create (có code): mã HĐ hiện trong S1 card
- [ ] Mobile create (chưa có code): không hiện
- [ ] Desktop create: badge header, không có trong S1
- [ ] Desktop edit: badge header + trong S1

---
Next Phase: phase-03-verify.md
