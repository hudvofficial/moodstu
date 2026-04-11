# Phase 02: Update Gate Spec + Verify
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Update grep gate spec để phản ánh đúng SSOT token rules.

## Task A: Document Gate Exceptions

### Problem
Grep gate yêu cầu 0 hits cho `border-border` nhưng class này là **Tailwind v4 SSOT token hợp lệ** (maps to `--color-border`).
Inline `style={{` cho charts là **justified exception** (dynamic runtime values).

### Action

Update `docs/specs/crm.md` Final Verification section (lines 706-712):
- Remove `border-border` from banned patterns → document as ALLOWED SSOT token
- Remove `style={{` from banned patterns → document as ALLOWED chart exception
- Keep `divide-border` as banned (must be 0)

### Grep Gate Reference (After Fix)

```powershell
# Banned patterns (should = 0)
Get-ChildItem components/crm -Recurse -Filter *.tsx | Select-String -Pattern 'divide-border'
# Expected: 0

# Allowed patterns (documented exceptions)
# border-border → Tailwind v4 @theme token, maps to --color-border
# style={{ → Chart components: lead-analytics.tsx, widget-source-donut.tsx (dynamic SVG)
```

---

## Task B: Full Verification

```powershell
# 1. Build
npm run build

# 2. Type check
npx tsc --noEmit

# 3. Grep validation
Get-ChildItem components/crm -Recurse -Filter *.tsx | Select-String -Pattern 'divide-border'

# employees!assigned_to — search source roots (the broken query was in app/actions/, NOT components/crm)
Select-String -Path app/actions/lead-actions.ts -Pattern 'employees!assigned_to'
```

### Expected Results
- [ ] Build: ✅ pass
- [ ] `divide-border`: 0 hits (banned)
- [ ] `employees!assigned_to` in `app/actions/lead-actions.ts`: 0 hits (removed in Phase 01)
- [ ] `border-border`: ~22 hits (ALLOWED — SSOT token)
- [ ] `style={{`: ~5 hits (ALLOWED — chart exceptions in lead-analytics.tsx, widget-source-donut.tsx)

---

Next: Mark plan complete → `/save-brain`
