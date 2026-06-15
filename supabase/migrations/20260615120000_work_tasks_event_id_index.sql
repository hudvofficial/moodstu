-- work_tasks được query theo event_id ở getTasksByEvent / addTask (check unassigned) /
-- deleteTask / checkAndCompleteEvent. Trước đây chỉ có index trên contract_id,
-- (assigned_to,status,deadline), calendar (deadline/start_date) — KHÔNG có index event_id,
-- nên các thao tác theo từng event phải seq scan. Thêm index này.
CREATE INDEX IF NOT EXISTS idx_work_tasks_event ON public.work_tasks (event_id);
