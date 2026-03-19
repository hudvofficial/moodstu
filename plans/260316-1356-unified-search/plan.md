# Plan: Unified Search — CRM Module
Created: 2026-03-16 13:56
Status: 🟡 In Progress
BRIEF: unified_search_brief.md

## Overview
Xóa duplicate search bars. Header search = SSOT duy nhất.
Header ghi URL params → Pages đọc URL params → Data filter.

## Tech Decisions
- URL params via `useSearchParams` + `useRouter().replace()` (Next.js native)
- Debounce 300ms trước khi push URL
- KHÔNG refactor SWR/Realtime (scope riêng)
- Giữ nguyên server actions fetchData pattern

## Phases

| Phase | Name | Status | Files |
|-------|------|--------|-------|
| 01 | Header → URL params | ✅ Complete | header.tsx |
| 02 | CRM Pages đọc URL params | ✅ Complete | customers/page.tsx, leads/page.tsx |
| 03 | Xóa inline search + Fix SSOT | ✅ Complete | CustomerList.tsx, LeadList.tsx |
| 04 | Mobile Filter Chip | ✅ Complete | FilterChip.tsx (new), page layouts |
| 05 | Cleanup CRM Layout | ✅ Complete | CrmLayoutClient.tsx |
| 06 | Verify & Test | ✅ Complete | Browser test |

## Quick Commands
- Start: `/code phase-01`
- Check: `/next`
