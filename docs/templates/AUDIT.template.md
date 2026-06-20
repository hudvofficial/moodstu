# Audit: {Module name} — {YYYY-MM-DD}

> **Module:** {module-name}
> **Scope:** Full module | Partial ({khu vuc cu the})
> **Auditor:** reviewer agent
> **Previous audit:** `docs/reports/{file-truoc}.md` | Chua co

---

## Diem tong

| Category | Score | Trend |
|----------|-------|-------|
| **Code quality** | {A/B/C/D} | {lên / giữ / xuống so với audit trước} |
| **Performance** | {A/B/C/D} | |
| **Type safety** | {A/B/C/D} | |
| **Responsive** | {A/B/C/D} | |
| **Security/RLS** | {A/B/C/D} | |
| **TONG** | **{A/B/C/D}** | |

> A = xuat sac, B = tot, C = co van de, D = phai sua gap

## So lieu

| Metric | Gia tri |
|--------|---------|
| Tong files | {X} |
| Files > 300 dong | {Y} (danh sach ben duoi) |
| `any` usage | {Z} cho |
| Missing error.tsx | {co/khong} |
| Test coverage | {co test / khong co / playwright only} |

## Issues

### P0 — Phai sua

| # | File:Line | Mo ta | Category |
|---|-----------|-------|----------|
| A1 | `{file}:{line}` | {Mo ta} | {perf / type / security / responsive} |

### P1 — Nen sua

| # | File:Line | Mo ta | Category |
|---|-----------|-------|----------|
| A2 | `{file}:{line}` | {Mo ta} | {category} |

### P2 — Goi y

- `{file:line}` — {Goi y ngan}

## Files > 300 dong (can split)

| File | Lines | Split suggestion |
|------|-------|-----------------|
| `{file}` | {X} | {Tach gi ra?} |

## Doi chieu v2-module-template

<!-- Kiem tra tuan thu docs/specs/v2-module-template.md -->

- [ ] Actions split: queries + mutations + lifecycle
- [ ] Khong cross-module functions
- [ ] withAuth() wrapper
- [ ] Zod validation
- [ ] Audit logs (fireAuditLog)
- [ ] Optimistic locking (update)
- [ ] revalidatePath sau mutations
- [ ] created_by FK → auth.users
- [ ] Soft delete (deleted_at)
- [ ] RLS policies
- [ ] error.tsx rieng
- [ ] Responsive 3-tier verified

## Khuyen nghi

<!-- Top 3 viec nen lam tiep theo, sap xep theo impact -->

1. **{Viec 1}** — {Tai sao, impact gi}
2. **{Viec 2}** — {Tai sao}
3. **{Viec 3}** — {Tai sao}
