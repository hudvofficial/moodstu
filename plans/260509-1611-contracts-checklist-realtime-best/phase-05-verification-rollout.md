# Phase 05: Verification & Rollout
Status: Automated Done; Manual QA Pending

## Objective
Xac nhan flow checklist dung trong dieu kien van hanh that, khong chi build pass.

## Automated Checks
1. [ ] `npm run lint`
2. [ ] `npx tsc --noEmit --pretty false`
3. [ ] `npm run verify:contracts`
4. [ ] `npm run smoke:contracts`
5. [ ] `npm run perf:audit`
6. [ ] `npm run build`

## Manual QA
1. [ ] Mo `/contracts` va drawer checklist, tick 1 item: table badge doi ngay.
2. [ ] Tick all: drawer hien `100%`, table hien `Day du`, khong F5.
3. [ ] Untick 1 item: table quay ve `Thieu 1` ngay.
4. [ ] Tick nhanh 5 item: khong mat update nao.
5. [ ] Mo `/contracts/[id]`, tick checklist: quay ve list van dung badge.
6. [ ] Hai browser/session: session A tick, session B update dung trong debounce window.
7. [ ] `INSERT/DELETE` checklist fallback revalidate dung.
8. [ ] Drawer dang mo khi filter/sort list khong crash.

## Commit/Deploy Rules
- Stage chon loc file trong scope phase.
- Khong stage docs/plans/migration cua agent truoc neu khong thuoc commit.
- Commit message de xuat: `Optimize contract checklist realtime`
- Deploy chi sau khi build pass va user dong y scope stage.

## Acceptance Criteria
- Tat ca automated checks pass.
- Manual QA checklist pass hoac co note ro item chua test duoc.
- Commit scoped, rollback duoc.
