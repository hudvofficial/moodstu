# Plan: Split 6 Oversized Action Files
Created: 2026-03-21 13:07
Status: ✅ Done

## Overview
Split 6 files > 250 lines → 12 files, tất cả < 250 lines (Lesson #7)

## Phases

| Phase | File | Lines | Split Into | Status |
|-------|------|-------|------------|--------|
| 1 | crm.ts (640) | 640 → 126+188 | customer-actions.ts + lead-actions.ts | ✅ Done |
| 2 | lab-actions.ts (444) | 444 → 98+100 | lab-actions.ts + lab-sync-actions.ts | ✅ Done |
| 3 | employee-actions.ts (389) | 389 → 95+63 | employee-actions.ts + salary-actions.ts | ✅ Done |
| 4 | contracts.ts (360) | 360 → 98+77 | contracts.ts + contract-detail-actions.ts | ✅ Done |
| 5 | schedule-actions.ts (340) | 340 → 90+54 | schedule-actions.ts + task-assign-actions.ts | ✅ Done |
| 6 | work-task-actions.ts (316) | 316 → 87+56 | work-task-actions.ts + task-overlap-actions.ts | ✅ Done |

## Rules
- NO logic changes — chỉ move functions
- NO new imports — giữ nguyên dependencies
- Build verify sau mỗi phase
- Update imports nếu component nào reference file cũ
