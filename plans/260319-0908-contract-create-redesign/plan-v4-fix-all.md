# Plan v4: Fix ALL — Trait-by-trait Audit → Code
Ref: `audit_trait_by_trait_full.md`
⚠️ Avatar: SKIP (anh xác nhận HĐ ko cần avatar)
⚠️ NO INLINE: tất cả dùng shared tokens/classes từ `design-system.css`

## Token Reference (đã verify)
| Token | Value | Stitch equiv |
|-------|-------|-------------|
| `--radius-md` | 10px | `rounded-xl` (~) |
| `--radius-sm` | *check* | rounded-md (6px) |
| `--font-size-caption` | 12px | `text-xs` ✅ |
| `.btn` base | padding 10px 16px, radius-sm, font-size body-sm | — |
| `.btn-ghost` | bg transparent, color text-secondary | — |
| `.btn-interactive` | bg interactive, color white, shadow-sm, radius-lg | — |

---

## Phase A: Header + Footer z-index & badge (3 tasks)

### A1. z-index: z-40 → z-50
- File: `index.tsx` L69
- Change: `z-40` → `z-50`

### A2. z-index footer: z-40 → z-50
- File: `FormActions.tsx` L29
- Change: `z-40` → `z-50`

### A3. Badge gap: gap-1.5 → gap-2
- File: `index.tsx` L83
- Change: `gap-1.5` → `gap-2`

---

## Phase B: S2 — Customer (3 tasks)

### B1. "Tạo mới" → "Tạo khách hàng mới"
- File: `ContractCustomerSection.tsx` L156
- Change: text `Tạo mới` → `Tạo khách hàng mới`

### B2. Couple cards space-y-3 → space-y-4
- File: `ContractCustomerSection.tsx` L187 (bride), `L260` (groom)
- Change: `space-y-3` → `space-y-4` (BOTH cards)

### B3. Couple title font-semibold → font-bold
- File: `ContractCustomerSection.tsx` L190 (bride), L263 (groom)
- Change: `font-semibold` → `font-bold` (BOTH cards)

---

## Phase C: S3 — Items buttons + subtotal (3 tasks)

### C1. "Phụ thu" button → match Stitch
Stitch: `px-4 py-2 text-slate-600 text-sm font-semibold hover:bg-slate-50 rounded-lg`
- File: `ContractItemsSection.tsx` L60
- Current: `btn btn-ghost text-caption`
- Change: `btn btn-ghost text-sm` (`.btn` base provides padding+radius, `.btn-ghost` provides colors; just fix font-size from text-caption to text-sm)

### C2. "Thêm DV" button → add shadow
Stitch: `shadow-sm shadow-primary/20` + `text-sm font-bold`
- File: `ContractItemsSection.tsx` L67
- Current: `btn btn-interactive text-caption`
- Change: `btn btn-interactive text-sm font-bold shadow-sm shadow-interactive/20`

### C3. Subtotal text-body → text-lg
Stitch: `text-lg font-bold`
- File: `ContractItemsSection.tsx` L120
- Current: `text-body font-bold text-text-primary`
- Change: `text-lg font-bold text-text-primary`

---

## Phase D: S4 — Financial toggle + separator (4 tasks)

### D1. Toggle wrapper → rounded-lg + bg
Stitch: `flex bg-slate-100 rounded-lg p-0.5`
- File: `ContractFinancialSummary.tsx` L52
- Current: `flex overflow-hidden rounded-sm shadow-xs`
- Change: `flex overflow-hidden rounded-lg bg-neutral-100 p-0.5`

### D2. Toggle buttons → px-3 py-1 font-bold rounded-md
Stitch active: `px-3 py-1 text-xs font-bold rounded-md bg-primary text-white shadow-sm`
Stitch inactive: `px-3 py-1 text-xs font-bold rounded-md text-slate-500`
- File: `ContractFinancialSummary.tsx` L56, L67
- Current: `px-2 py-0.5 text-caption font-semibold`
- Change active: `px-3 py-1 text-xs font-bold rounded-md bg-interactive text-text-inverse shadow-sm`
- Change inactive: `px-3 py-1 text-xs font-bold rounded-md text-text-secondary hover:bg-bg-hover`

### D3. Discount input width w-28 → w-32
Stitch: `w-32`
- File: `ContractFinancialSummary.tsx` L86
- Current: `input-base w-28 px-2 py-1 text-right`
- Change: `input-base w-32 px-2 py-1 text-right`

### D4. Separator my-4 → my-2
Stitch: `my-2`
- File: `ContractFinancialSummary.tsx` L104
- Current: `my-4 h-px bg-border/30`
- Change: `my-2 h-px bg-border/30`

---

## Phase E: S3 table th padding (1 task, MINOR)

### E1. th padding px-3 → px-4, py-2.5 → py-3
Stitch: `px-4 py-3 font-semibold text-slate-600`
- File: `ContractItemsSection.tsx` L85-90
- Current: first th `px-4 py-2.5`, rest `px-3 py-2.5`
- Change: ALL th → `px-4 py-3`

---

## Execution Order
```
Phase A (3 tasks) → Phase B (3 tasks) → Phase C (3 tasks)
→ Phase D (4 tasks) → Phase E (1 task)
Total: 14 tasks, 6 files
```
