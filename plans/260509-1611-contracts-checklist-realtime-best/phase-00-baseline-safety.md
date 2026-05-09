# Phase 00: Baseline & Safety Gate
Status: Done

## Objective
Khoa baseline truoc khi toi uu sau hon. Phase nay dam bao minh chi lam tren file lien quan checklist/realtime, khong tron migration/docs/plans cua agent truoc vao commit.

## Tasks
1. [ ] Chay `git status --short` va ghi ro file dirty nao thuoc scope.
2. [ ] Xac dinh file nao la thay doi cua phase checklist hien tai, file nao la agent truoc.
3. [ ] Khong stage untracked migration `supabase/migrations/20260509140000_contract_detail_v2_rpc.sql` neu chua review/fix.
4. [ ] Chay baseline `lint`, `tsc`, `verify:contracts`, `smoke:contracts`, `perf:audit`.
5. [ ] Neu baseline fail, fix regression truoc khi sang Phase 01.

## Acceptance Criteria
- Co danh sach file stage du kien.
- Build/test baseline pass hoac co issue ro rang duoc tach rieng.
- Khong co migration/schema change nam trong scope phase nay.

## Risk
- Worktree dang dirty. Can stage chon loc bang file path, khong `git add .`.
