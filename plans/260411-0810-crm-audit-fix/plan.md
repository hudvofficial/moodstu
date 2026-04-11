# Plan: CRM Audit Remediation — 4 Findings
Created: 2026-04-11T08:10
Status: ✅ Complete

## Overview
Sửa 2 lỗi P1 confirmed từ CRM audit + update gate spec. Finding 3 (drawer props) đã invalidated.

## Scope
- **3 file changes** (lead-actions.ts, lead-list-page.tsx, lead-card.tsx)
- **1 gate spec update** (grep gate exception docs)
- **0 migration** (Option B: no FK, fetch riêng)

## Phases

| Phase | Name | Status | Files |
|-------|------|--------|-------|
| 01 | Fix FK join + error handling + child toast | ✅ Complete | `lead-actions.ts`, `lead-list-page.tsx`, `lead-card.tsx` |
| 02 | Update gate spec + verify | ✅ Complete | gate docs, build check |

## Quick Commands
- Start: `/code phase-01`
- Verify: `npm run build`
