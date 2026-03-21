# Plan: Fix All Audit Issues — EventTaskModal
Created: 2026-03-21T02:05:00+07:00
Status: 🟡 In Progress

## Fixes from Audit

| # | Issue | Severity | Phase |
|---|-------|----------|-------|
| C1 | Native `<select>` Loại việc → `SelectGrouped` | 🔴 | 01 |
| C2 | Native `<select>` Nhân sự → `SelectForm` | 🔴 | 01 |
| W2 | `WORK_TYPE_GROUPS` format → `OptionGroup[]` | 🟡 | 01 |
| W1 | `as unknown as` unsafe cast | 🟡 | 02 |
| W3 | Stale closure race condition | 🟡 | 02 |

## Phases

| Phase | Name | Status | Files |
|-------|------|--------|-------|
| 01 | Replace selects + convert data | ⬜ | `event-task-modal.tsx` |
| 02 | Fix typing + race condition | ⬜ | `event-task-modal.tsx` |
| 03 | Build + Verify | ⬜ | — |

---

## Phase 01: Replace native selects → V2 Radix components

### Steps:
1. [ ] Add imports: `SelectGrouped`, `SelectForm`
2. [ ] Convert `WORK_TYPE_GROUPS` → `OptionGroup[]` format with `{groupName, color, options}`
3. [ ] Replace native `<select>` L394-413 (Loại việc) → `<SelectGrouped>`
4. [ ] Replace native `<select>` L417-429 (Nhân sự) → `<SelectForm>`
5. [ ] Remove unused import `WORK_TYPE_MAP` (if no longer used)

### Files:
- `components/contracts/detail/event-task-modal.tsx`

---

## Phase 02: Fix typing + race condition

### Steps:
1. [ ] Remove `as unknown as TaskRow[]` → use proper typing or cast only the needed fields
2. [ ] Remove `as unknown as Employee[]` → same
3. [ ] Fix `handleEmployeeChange` stale closure → read form values inside `setForm` callback

### Files:
- `components/contracts/detail/event-task-modal.tsx`

---

## Phase 03: Build + Verify

### Steps:
1. [ ] `npx next build` — zero errors
2. [ ] Kill port + `npm run dev`
3. [ ] Browser: Open modal → click "Loại việc" → see Radix dropdown with color-coded headers
4. [ ] Browser: Click "Nhân sự" → see Radix dropdown with tokens
5. [ ] No native browser popups anywhere
