# Phase 03: Verify & Polish
Status: ⬜ Pending
Dependencies: Phase 01, Phase 02

## Objective
Build, verify desktop không bị ảnh hưởng, mobile match Stitch, fix lint errors.

## Implementation Steps

### Step 1: Build verification
- [ ] `npx next build` → exit code 0
- [ ] No TypeScript errors
- [ ] No ESLint errors

### Step 2: Desktop comparison
- [ ] Open browser desktop viewport (1920px)
- [ ] Contracts table renders identically to BEFORE Phase 01
- [ ] Stats bar + inline "Tạo hợp đồng" button visible
- [ ] All existing features: tooltips, badges, sorting, filters

### Step 3: Mobile comparison
- [ ] Open browser mobile viewport (375px)
- [ ] Card layout matches Stitch (5 rows):
  - Row 1: Mã HĐ + Status badge
  - Row 2: Customer name (bold)
  - Row 3: Service badge + date
  - Row 4: Amount + payment info
  - Row 5: Progress bar
- [ ] FAB button floating bottom-right
- [ ] Card tap → navigate to detail

### Step 4: Edge cases
- [ ] Cancelled contract: opacity-50, line-through tên
- [ ] Overdue contract: overdue-indicator (left bar đỏ)
- [ ] No contracts: EmptyState renders correctly
- [ ] Long customer name: truncated properly

### Step 5: Kill port + restart dev
- [ ] Kill port 3000
- [ ] `npm run dev`

## Files Reviewed (NOT modified)
- ALL files from Phase 01 + 02

## Test Criteria
- [ ] Build pass ✓
- [ ] Desktop unchanged ✓
- [ ] Mobile match Stitch ✓
- [ ] No regressions ✓

---
Plan complete! 🎉
