# Plan: Split 6 Oversized Action Files
Created: 2026-03-21 13:07
Status: 🟡 In Progress

## Overview
Split 6 files > 250 lines → 12 files, tất cả < 250 lines (Lesson #7)

## Phases

| Phase | File | Lines | Split Into | Status |
|-------|------|-------|------------|--------|
| 1 | crm.ts (538) | 538 → ~150+250 | customer-actions.ts + lead-actions.ts | ⬜ |
| 2 | lab-actions.ts (376) | 376 → ~170+150 | lab-actions.ts + lab-sync-actions.ts | ⬜ |
| 3 | employee-actions.ts (327) | 327 → ~200+100 | employee-actions.ts + salary-actions.ts | ⬜ |
| 4 | contracts.ts (320) | 320 → ~180+140 | contracts.ts + contract-detail-queries.ts | ⬜ |
| 5 | schedule-actions.ts (288) | 288 → ~170+120 | schedule-actions.ts + task-assign-actions.ts | ⬜ |
| 6 | work-task-actions.ts (273) | 273 → ~150+120 | work-task-actions.ts + task-overlap-actions.ts | ⬜ |

## Rules
- NO logic changes — chỉ move functions
- NO new imports — giữ nguyên dependencies
- Build verify sau mỗi phase
- Update imports nếu component nào reference file cũ
