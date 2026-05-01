# Phase 07: Verification, Final Score, and Deploy

Status: Local verification complete; browser visual/deploy pending
Dependencies: Phase 00-06
Priority: P0

## Commands

```bash
npx tsc --noEmit --pretty false
npm run lint
npm run build
```

## Manual Smoke

- [ ] Create basic schedule.
- [ ] Create timed schedule.
- [ ] Create all-day schedule.
- [ ] Invalid end time is handled.
- [ ] Google sync connected/disconnected states are correct.
- [ ] Edit schedule still works.
- [ ] Task edit still works.
- [ ] Google event read-only still works.
- [ ] Mobile has no overflow.

## Local Verification

- [x] `npx tsc --noEmit --pretty false`
- [x] `npm run lint` passes with 5 pre-existing warnings in `lib/navigation-data-prefetch.ts`
- [x] `npm run build`

## Acceptance Criteria

- All verification passes.
- Final score is recorded.
- Deploy uses clean snapshot if needed.
