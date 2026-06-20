# Review: {Ten task / git range}

> **Plan:** `docs/plans/{plan-folder}/plan.md`
> **Scope:** `git diff {base}..{head}` | {danh sach file cu the}
> **Reviewer:** reviewer agent
> **Date:** {YYYY-MM-DD}
> **Verdict:** DAT | CAN SUA

---

## Scope

**Files reviewed:**

| File | Lines changed | Category |
|------|---------------|----------|
| `{path/file.tsx}` | +{X} -{Y} | {component / action / type / style} |

## Issues

<!-- Muc do: P0 phai sua | P1 nen sua | P2 goi y
   Moi issue: file:line + mo ta + tai sao sai + code de xuat -->

### P0 — Phai sua

#### R1: {Mo ta ngan}

**`{file.tsx}:{line}`**

**Van de:** {Mo ta cu the — tai sao no sai / nguy hiem}

**Hien tai:**
```typescript
// code hien tai co van de
```

**De xuat:**
```typescript
// code da sua
```

### P1 — Nen sua

#### R2: {Mo ta ngan}

**`{file.tsx}:{line}`**

**Van de:** {Mo ta}

**De xuat:** {Huong sua — co the khong can full code}

### P2 — Goi y

- `{file:line}` — {Goi y ngan}

## Doi chieu CLAUDE.md

<!-- Kiem tra cac rang buoc cung -->

| Rule | Status | Ghi chu |
|------|--------|---------|
| Surgical (chi dong cai can) | OK / VI PHAM | {chi tiet neu vi pham} |
| Simplicity (khong speculative) | OK / VI PHAM | |
| Finance (giu revalidatePath) | N/A / OK / VI PHAM | |
| Responsive 3-tier | N/A / OK / VI PHAM | |
| Verify da chay | OK / CHUA | {paste output neu co} |

## Verdict

**{DAT / CAN SUA}** — {1 cau tom tat}

- P0: {so luong} issues
- P1: {so luong} issues
- P2: {so luong} issues

**Dieu kien DAT:** 0 P0 + da address P1 hoac giai thich duoc tai sao khong sua.
