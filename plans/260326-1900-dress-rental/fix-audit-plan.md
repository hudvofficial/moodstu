# Plan: Fix All Audit — Rental Code (7 Issues)
Created: 2026-03-26T19:31
Status: ⬜ Pending

## Overview
Fix 7 issues phát hiện từ audit rental code (Phase 02+03). 
Audit report: `docs/reports/audit_rental_2026_03_26.md`

## References
- Gold Standard: `components/dresses/dress-form-modal.tsx`
- SSOT DatePicker: `components/ui/date-picker.tsx` (479 lines)
- Action Template: `tasks/action-template.md`
- Auth wrapper: `lib/auth_utils.ts` → `withAuth` trả `ActionResult<T> = { success, data } | { success: false, error }`

## Phases

| Phase | Name | Status | Tasks |
|-------|------|--------|-------|
| 01 | Fix ActionResult double-wrap (C3) | ⬜ | 2 |
| 02 | Fix RentalModal UI (C2+W1+W2+W3) | ⬜ | 4 |
| 03 | Fix Types & Constants SSOT (W4+S2) | ⬜ | 4 |
| 04 | Build Verify | ⬜ | 1 |

---

## Phase 01: Fix ActionResult double-wrap (C3)

### Vấn đề
`withAuth` đã wrap output: `{ success: true, data: T }` hoặc `{ success: false, error }`.
Nhưng 6 actions trong `rental-mutations.ts` cũng tự return `{ success: true, id }` bên trong callback.
→ Kết quả cuối: `{ success: true, data: { success: true, id } }` = double wrap.
→ Client phải unwrap 2 lần, gây bug ẩn.

### Fix

#### [MODIFY] `app/actions/rental-mutations.ts`
6 actions cần sửa:

| Action | Hiện tại return | Sửa thành |
|--------|----------------|-----------|
| `createRental` | `{ success: true, id }` | `rental.id` (string) |
| `startRental` | `{ success: true }` | `undefined` |
| `returnDressRental` | `{ success: true }` | `undefined` |
| `markCleaned` | `{ success: true }` | `undefined` |
| `cancelRental` | `{ success: true }` | `undefined` |
| `refundDeposit` | `{ success: true }` | `undefined` |

Error case: `return { success: false, error: "..." }` → `throw new Error("...")`
(để `withAuth` catch → tự wrap `{ success: false, error }`)

#### [MODIFY] `components/dresses/dress-drawer-content.tsx`
- `handleAction`: check `result.success` thay vì `"error" in result`
- `createRental` response: `result.data` = rental ID (string)
- `fetchActiveRental` SWR: đã unwrap `.data` ✅ (fix trước đó)

---

## Phase 02: Fix RentalModal UI (C2 + W1 + W2 + W3)

#### [MODIFY] `components/dresses/rental-modal.tsx`

**C2 — Native date → SSOT DatePicker:**
- Dòng 152: `<input type="date" ... pickup_date>` → `<DatePicker value={form.pickup_date} onChange={(v) => update("pickup_date", v)} label="Ngày lấy" required />`
- Dòng 166: `<input type="date" ... return_date>` → `<DatePicker value={form.return_date} onChange={(v) => update("return_date", v)} label="Ngày trả dự kiến" required />`
- Import: `import DatePicker from "@/components/ui/date-picker"`
- Bỏ icon CalendarDays (DatePicker đã có icon Calendar built-in)

**W1 — Thêm form reset khi reopen:**
```tsx
// Clone pattern dress-form-modal.tsx dòng 79-84
useEffect(() => {
  if (isOpen) {
    setForm(getInitial(dress));
  }
}, [isOpen, dress]);
```
- Extract `getInitial(dress)` function ra ngoài component

**W2 — Move submit button → footer slot:**
```tsx
<UnifiedModal
  ...
  footer={
    <div className="form-actions">
      <button type="button" onClick={onClose} className="btn btn-ghost">Đóng</button>
      <button type="button" onClick={handleSubmit} className="btn btn-primary" disabled={saving}>
        {saving ? "Đang lưu..." : "Xác nhận đặt thuê"}
      </button>
    </div>
  }
>
```
- Xóa submit button khỏi body

**W3 — type="button":**
- Đảm bảo mọi `<button>` có `type="button"`

---

## Phase 03: Fix Types & Constants SSOT (W4 + S2)

**W4 — Move DressRental interface:**

#### [MODIFY] `types/dress.ts`
- Thêm `DressRental` interface (move nguyên từ `rental-queries.ts`)

#### [MODIFY] `app/actions/rental-queries.ts`
- Xóa `DressRental` interface inline
- Import: `import type { DressRental } from "@/types/dress"`

#### [MODIFY] `components/dresses/dress-drawer-content.tsx`
- Đổi import: `from "@/types/dress"` thay vì `from "@/app/actions/rental-queries"`

**S2 — Extract RENTAL_STATUS_MAP:**

#### [MODIFY] `types/dress-constants.ts`
```tsx
export const RENTAL_STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  reserved:  { label: "Đã đặt",    variant: "info" },
  renting:   { label: "Đang thuê", variant: "warning" },
  returned:  { label: "Đã trả",    variant: "success" },
  overdue:   { label: "Quá hạn",   variant: "error" },
  cancelled: { label: "Đã hủy",    variant: "neutral" },
};
```

#### [MODIFY] `components/dresses/dress-drawer-content.tsx`
- Xóa inline `STATUS_MAP` trong `StandaloneRentalsSection`
- Import `RENTAL_STATUS_MAP` từ `@/types/dress-constants`

---

## Phase 04: Build Verify
- [ ] Kill port → `npm run build` → 0 errors
- [ ] `npm run dev` → mở browser → test modal

## Verification Plan
1. Build pass 0 errors
2. Mở /dresses → click váy → Drawer load OK (không crash)
3. Click "Đặt thuê" → Modal mở → DatePicker SSOT (không native) → footer sticky
4. Đóng modal → mở lại → form reset (không giữ data cũ)
