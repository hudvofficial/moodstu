# Phase 06: Verification, Final Score, and Deploy

Status: Local verification complete; browser visual/deploy pending
Dependencies: Phase 00-05
Priority: P0

## Commands

```bash
npx tsc --noEmit --pretty false
npm run lint
npm run build
```

## Manual Smoke

- [ ] Desktop title opens picker.
- [ ] Desktop month select works.
- [ ] Desktop year select works.
- [ ] Desktop today works.
- [ ] Mobile title opens picker.
- [ ] Mobile picker has no overflow.
- [ ] Day 31 -> February clamps.
- [ ] Closing picker changes nothing.

## Local Verification

- [x] `npx tsc --noEmit --pretty false`
- [x] `npm run lint` passes with 5 pre-existing warnings in `lib/navigation-data-prefetch.ts`
- [x] `npm run build`

## Acceptance Criteria

- All checks pass.
- Final score and remaining risks are recorded.
- Deploy from clean snapshot if needed.
