-- Calendar audit fix: keep month fetch and employee availability checks indexable.

CREATE INDEX IF NOT EXISTS idx_schedules_calendar_event_date
  ON public.schedules (event_date);

CREATE INDEX IF NOT EXISTS idx_schedules_calendar_employee_event_date
  ON public.schedules (employee_id, event_date);

CREATE INDEX IF NOT EXISTS idx_work_tasks_calendar_assigned_deadline
  ON public.work_tasks (assigned_to, deadline)
  WHERE assigned_to IS NOT NULL AND deadline IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_tasks_calendar_assigned_start_date
  ON public.work_tasks (assigned_to, start_date)
  WHERE assigned_to IS NOT NULL AND deadline IS NULL AND start_date IS NOT NULL;
