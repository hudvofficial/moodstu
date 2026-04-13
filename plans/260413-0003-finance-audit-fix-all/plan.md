# Plan: Finance Module — Audit Fix All
Created: 2026-04-13T00:03
Status: 🟡 Awaiting Approval
Source: `docs/reports/audit_2026-04-13_finance.md`

## Overview

Sửa **toàn bộ 16 issues** phát hiện từ Full Audit module Finance:
- 4 Critical (C1-C4) 
- 7 Warning (W1-W7)  
- 5 Suggestion (S1-S5)

### Nguyên tắc:
- **Backend-only** — Không sửa UI/CSS trong plan này
- **Zero-downtime** — Tất cả sửa backward-compatible
- **Lesson #76** — Có `/plan` trước khi code

## Phases

| Phase | Name | Priority | Files | Tasks |
|-------|------|----------|-------|-------|
| 01 | 🔴 Critical Hotfix | P0 — Ngay | 2 files | 3 |
| 02 | 🟡 Code Consolidation | P1 | 3 files | 4 |
| 03 | 🟡 Hardening Gap-fill | P1 | 2 files | 3 |
| 04 | 🟢 Performance & SSOT | P2 | 4 files | 5 |

**Tổng:** 15 tasks | ~4 phases

## Scope Exclusion (Không nằm trong plan này)

| Issue | Lý do exclude | Khi nào |
|---|---|---|
| C2: Sale receipt atomicity | Cần deploy RPC lên Supabase | Separate DB migration plan |
| C3: Debt soft delete | Cần ALTER TABLE migration | Separate DB migration plan |
| C4: AI Analysis stub | Feature mới, cần analytics lib | Feature roadmap |
| S1: Dashboard single RPC | Optimization, không phải bug | Phase Performance riêng |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: xem plan.md
