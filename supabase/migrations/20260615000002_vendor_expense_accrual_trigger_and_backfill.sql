-- =====================================================
-- Migration: Vendor Expense Accrual — Trigger + Backfill
-- Date: 2026-06-15
-- =====================================================
-- Problem: upsert_vendor_expense() chỉ được gọi từ MỘT path (toggleTaskStatus)
--   và chỉ khi vendor_id đã set đúng lúc gạt 'hoan_thanh'. Task hoàn thành qua path
--   khác (updateTaskDetails, bulk) hoặc gán vendor/cost SAU khi đã hoàn thành → KHÔNG
--   bao giờ tạo accrual expense → chi phí vendor bị UNDER-count (verify 2026-06-15:
--   6 task hoàn thành 6.8M, 0 accrual expense).
-- Solution: trigger trên work_tasks gọi upsert_vendor_expense (idempotent) trên MỌI
--   thay đổi liên quan → phủ hết các path. Kèm backfill 1 lần cho task hiện có.
-- Reversible: DROP TRIGGER + DROP FUNCTION; soft-deleted/created expenses có thể đảo.
-- =====================================================

-- 1) Trigger function — nuốt lỗi (vd kỳ kế toán đã khóa) để KHÔNG chặn thao tác task.
CREATE OR REPLACE FUNCTION public.trg_sync_vendor_expense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM public.upsert_vendor_expense(NEW.id, NULL);
  EXCEPTION WHEN OTHERS THEN
    -- Bookkeeping accrual không được làm fail việc cập nhật task
    RAISE NOTICE 'trg_sync_vendor_expense skipped task %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- 2) Trigger — fire khi tạo task, hoặc khi đổi status/vendor_id/cost/completion_date.
DROP TRIGGER IF EXISTS work_task_vendor_expense_sync ON public.work_tasks;
CREATE TRIGGER work_task_vendor_expense_sync
AFTER INSERT OR UPDATE OF status, vendor_id, cost, completion_date
ON public.work_tasks
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_vendor_expense();

-- 3) Backfill 1 lần: task vendor đã hoàn thành (cost>0) mà CHƯA có expense active.
--    Mỗi task bọc EXCEPTION riêng → kỳ khóa thì skip task đó, không abort cả batch.
--    Idempotent: lần chạy sau bỏ qua task đã có expense (NOT EXISTS guard).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT wt.id
    FROM public.work_tasks wt
    WHERE wt.vendor_id IS NOT NULL
      AND wt.status = 'hoan_thanh'
      AND wt.cost > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.work_task_id = wt.id AND e.deleted_at IS NULL
      )
  LOOP
    BEGIN
      PERFORM public.upsert_vendor_expense(r.id, NULL);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'backfill skipped task %: %', r.id, SQLERRM;
    END;
  END LOOP;
END $$;

COMMENT ON FUNCTION public.trg_sync_vendor_expense() IS
  'Đồng bộ accrual expense [Auto-Vendor] theo trạng thái work_task trên mọi path (idempotent qua upsert_vendor_expense). Lỗi (vd kỳ khóa) bị nuốt để không chặn cập nhật task.';
