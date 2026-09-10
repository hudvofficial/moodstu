-- REVERT #26 (T4 CHECK status) — trạng thái SỐNG trước khi áp (đọc pg_constraint prod 2026-09-10):
--   work_tasks      : chỉ có CHECK check_assignment_mutually_exclusive (không đụng status)
--   contract_events : chỉ có CHECK contract_events_google_sync_status_check (không đụng status)
--   → không có CHECK nào trên cột status ở cả 2 bảng. Quay lui = gỡ đúng 2 ràng buộc do #26 thêm.
-- Chạy: ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs <file>  (runner tự bọc BEGIN/COMMIT)
ALTER TABLE public.work_tasks DROP CONSTRAINT IF EXISTS work_tasks_status_check;
ALTER TABLE public.contract_events DROP CONSTRAINT IF EXISTS contract_events_status_check;
