-- #26 T4 · CHECK danh mục đóng cho work_tasks.status + contract_events.status — agent/HANDOFFS/T-20260910-t4-check-status.spec.md
-- (migrate-direct.mjs tự bọc BEGIN/COMMIT). Revert: agent/HANDOFFS/T-20260910-t4-check-status.revert.sql
-- Sự thật 10/09 (prod, chỉ đọc): work_tasks 171 dòng · contract_events 220 dòng (kể cả xoá mềm) — 0 NULL, 0 giá trị ngoài
-- 4 trạng thái của kiểu TS `TaskStatus` (types/contract.ts:55) → thêm NOT VALID rồi VALIDATE ngay trong cùng lần áp.
-- Ý nghĩa: sai chính tả trạng thái fail lúc ghi (23514) thay vì im lặng nhiều tuần (PHUONG-AN T4, điều kiện G2).

ALTER TABLE public.work_tasks
  ADD CONSTRAINT work_tasks_status_check
  CHECK (status IS NOT NULL AND status IN ('chua_lam', 'dang_lam', 'hoan_thanh', 'da_huy')) NOT VALID;
ALTER TABLE public.work_tasks VALIDATE CONSTRAINT work_tasks_status_check;

ALTER TABLE public.contract_events
  ADD CONSTRAINT contract_events_status_check
  CHECK (status IS NOT NULL AND status IN ('chua_lam', 'dang_lam', 'hoan_thanh', 'da_huy')) NOT VALID;
ALTER TABLE public.contract_events VALIDATE CONSTRAINT contract_events_status_check;
