-- Calendar month view filters work_tasks by COALESCE(deadline, start_date).
-- Keep both branches indexable for the PostgREST OR query.

CREATE INDEX IF NOT EXISTS idx_work_tasks_calendar_deadline
  ON public.work_tasks (deadline)
  WHERE deadline IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_tasks_calendar_start_date
  ON public.work_tasks (start_date)
  WHERE deadline IS NULL AND start_date IS NOT NULL;
