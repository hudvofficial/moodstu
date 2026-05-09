# Plan: Contracts Checklist Realtime Best
Created: 2026-05-09T16:11+07:00
Status: Implementation Done; Manual QA Pending

## Goal
Lam cho checklist cua module Contracts dung theo van hanh thuc te:
- User tick checklist trong drawer/detail thi table ngoai cap nhat ngay, khong can F5.
- Tick nhanh nhieu item khong mat realtime event.
- Drawer khong giu snapshot cu cua row da click.
- List hop dong render nhe hon, khong phai mang theo data checklist day du neu chi can biet thieu/du.
- Khong revert cac thay doi dang co cua user/agent khac.

## Current Baseline
Da co hotfix nen tang:
- `updateContractListChecklistCache` patch list, drawer-extra, detail cache.
- `contract_checklists UPDATE` tren list/detail patch cache nhe thay vi refetch ca list/detail.
- Drawer/detail checklist giu optimistic mutation va `pendingIds`.
- Verification da pass: `lint`, `tsc`, `verify:contracts`, `smoke:contracts`, `perf:audit`, `build`.

Con ton tai:
- `useRealtimeMulti` debounce chi xu ly payload cuoi cung trong mot cua so debounce.
- Drawer dang luu `selectedContract` object, de bi cu neu list cache doi sau khi drawer da mo.
- Contracts list van dua `contract_checklists` array vao table de tinh `MissingInfoBadge`; payload va render cost chua toi uu.
- Worktree co docs/plans/migration untracked tu agent truoc. Migration RPC can review rieng, khong dua vao phase nay neu chua sua shape.

## Phases

| Phase | Name | Status | Scope | Est. |
|-------|------|--------|-------|------|
| 00 | Baseline & Safety Gate | Done | Chot diff, tach file an toan, xac nhan khong commit migration la | 15m |
| 01 | Batch-safe Realtime Multi | Done | Gom payload realtime, xu ly du event trong debounce window | 45m |
| 02 | Canonical Drawer Selection | Done | Doi drawer tu snapshot object sang selected id + derive tu SWR list | 45m |
| 03 | Checklist Summary for List | Done | Them summary count cho list, giam payload/render cua table | 90m |
| 04 | MissingInfoBadge UX/Perf | Done | Render badge nhe, lazy detail tooltip, khong block table | 45m |
| 05 | Verification & Rollout | Automated Done; Manual Pending | Test realtime, smoke, perf, build, commit scoped | 45m |

Total estimate: 4h45m

## Non-goals
- Khong sua business wording hay layout lon cua `/contracts/create`.
- Khong apply migration `20260509140000_contract_detail_v2_rpc.sql` neu chua review/fix shape.
- Khong refactor toan bo Contracts module.
- Khong thay doi schema production khi chua co fallback.

## Success Criteria
- Tick all checklist trong drawer: drawer hien `100%`, table ngoai doi sang `Day du` trong cung session khong F5.
- Tick checklist trong detail: list cache va drawer cache dong bo neu user quay lai list.
- Hai client cung mo `/contracts`: client A tick item, client B cap nhat dung trong debounce window.
- Tick nhanh 5 item lien tiep khong mat event nao.
- Contracts list khong bi refetch ca list cho moi checklist `UPDATE`.
- `npm run lint`, `npx tsc --noEmit --pretty false`, `npm run verify:contracts`, `npm run smoke:contracts`, `npm run perf:audit`, `npm run build` pass.

## Rollback Plan
- Phase 01 co the rollback ve callback tung payload hien tai.
- Phase 02 co the rollback ve `selectedContract` object neu drawer bi regression.
- Phase 03 bat buoc giu fallback doc `contract_checklists` array cu trong khi rollout.
- Moi phase commit tach rieng de rollback duoc theo commit.

## File Ownership
- `hooks/use-realtime-multi.ts`
- `components/contracts/contracts-list-client.tsx`
- `components/contracts/contract-drawer.tsx`
- `components/contracts/drawer-tab-content.tsx`
- `components/contracts/missing-info-badge.tsx`
- `lib/hooks/use-contracts.ts`
- `app/actions/contract-queries.ts`
- Tests/scripts neu can: `scripts/verify-contracts.mjs`, `scripts/perf-audit.mjs`
