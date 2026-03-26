# Plan: Dresses V2 — 5 Remaining Features
Created: 2026-03-26 09:40
Updated: 2026-03-26 10:00 (post V1↔V2 audit)
Status: 🟡 In Progress

## Audit Results (v1_v2_audit_report.md)
- V1 code: 0/9 files portable — all REWRITE
- V2 business logic: 90% already exists — only `releaseReservation` missing
- BL-1 bug: `addInventoryReservation` missing availability check → fix in P01
- SSOT: 15+ utility classes + 10 shared components cataloged
- Performance: 6 rules (P-1~P-6) defined and assigned to phases

## Phases

| # | Name | Effort | Status | Key Change (post-audit) |
|---|------|--------|--------|------------------------|
| 01 | Reservation Completion | ~5 min | ⬜ | Was 30min → 90% existed, only releaseReservation + BL-1 fix |
| 02 | Dress Detail Drawer | ~45 min | ⬜ | 0ms drawer (P-1), clone ContractDrawer |
| 03 | ImageUpload (Server-side) | ~20 min | ⬜ | Server action — NOT client-side (P-3) |
| 04 | QR Scanner + Label Print | ~40 min | ⬜ | Install qrcode.react, CSS @media print |
| 05 | Rental History Page | ~45 min | ⬜ | SWR + keepPreviousData (P-5) |

**Total: ~2.5 hours**

## Quick Commands
- `/code phase-01` → Start Phase 01
- `/next` → Check progress
- `/save-brain` → Save context

## Token Compliance Checklist
```
□ Icons = lucide-react only
□ Labels = label-base | Inputs = input-base
□ Buttons = btn btn-primary | btn-ghost | btn-danger
□ Cards = card-interactive | bg-bg-card rounded-xl
□ Typography = text-body-sm, text-caption, text-h3
□ Toast = toast() from @/lib/toast-utils
□ SWR = cacheKeys.xxx() + revalidate()
□ Server actions = withAuth + Zod + fireAuditLog
□ No client-side Supabase in components
```
