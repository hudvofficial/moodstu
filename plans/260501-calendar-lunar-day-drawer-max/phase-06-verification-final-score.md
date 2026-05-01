# Phase 06: Verification, Final Score, and Deploy

Status: Local verification complete; browser visual/deploy pending
Dependencies: Phase 00-05
Priority: P0

## Goal

Prove the feature is production-ready and deploy from a clean snapshot if needed.

## Commands

```bash
npx tsc --noEmit --pretty false
npm run lint
npm run build
```

## Manual Smoke

- [ ] Desktop solar -> lunar -> drawer.
- [ ] Desktop lunar -> solar -> drawer.
- [ ] Desktop `Di toi lich` switches to selected day view.
- [ ] Desktop `Tao lich trinh` opens event form with selected date.
- [ ] Mobile drawer has no overflow.
- [ ] Mobile `Di toi lich` opens existing day drawer.
- [ ] Invalid date does not open detail drawer.

## Local Verification

- [x] `npx tsc --noEmit --pretty false`
- [x] `npm run lint` passes with 5 pre-existing warnings in `lib/navigation-data-prefetch.ts`
- [x] `npm run build`

## Acceptance Criteria

- All prior phases pass.
- Verification commands pass.
- Final report records evidence and score.
- Production deploy uses clean snapshot if unrelated dirty files exist.
