-- Productivity V2.1 migration handoff for avg
-- Purpose:
-- 1. Add auth-aware self-view RPCs for productivity
-- 2. Guarantee media/self mode never receives full-team rows or cost values
-- 3. Keep team RPC behavior unchanged for admin/manager
--
-- NOTE:
-- - This repo currently ships with temporary app-layer filtering for self-view.
-- - Apply this SQL on the linked Supabase project, then refresh database typegen.
-- - If the existing team RPC SQL differs, keep its business logic and only adapt the auth scoping + cost redaction below.

-- Suggested verification before apply:
-- SELECT proname FROM pg_proc WHERE proname IN (
--   'get_employee_productivity',
--   'get_employee_job_details',
--   'get_my_employee_productivity',
--   'get_my_employee_job_details'
-- );

CREATE OR REPLACE FUNCTION public.get_my_employee_productivity(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  employee_id UUID,
  full_name TEXT,
  role public.employee_role_enum,
  onsite_hours NUMERIC,
  active_tasks INTEGER,
  completed_tasks INTEGER,
  post_production_active INTEGER,
  overdue_tasks INTEGER,
  total_cost BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_employee_id UUID;
BEGIN
  SELECT e.id
    INTO v_employee_id
  FROM public.employees e
  WHERE e.auth_user_id = auth.uid()
    AND e.deleted_at IS NULL
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.employee_id,
    p.full_name,
    p.role,
    p.onsite_hours,
    p.active_tasks,
    p.completed_tasks,
    p.post_production_active,
    p.overdue_tasks,
    NULL::BIGINT AS total_cost
  FROM public.get_employee_productivity(p_start_date, p_end_date) AS p
  WHERE p.employee_id = v_employee_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_employee_job_details(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  contract_id UUID,
  contract_code TEXT,
  client_name TEXT,
  service_type TEXT,
  event_date DATE,
  work_type TEXT,
  status TEXT,
  deadline DATE,
  cost BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_employee_id UUID;
BEGIN
  SELECT e.id
    INTO v_employee_id
  FROM public.employees e
  WHERE e.auth_user_id = auth.uid()
    AND e.deleted_at IS NULL
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    d.contract_id,
    d.contract_code,
    d.client_name,
    d.service_type,
    d.event_date,
    d.work_type,
    d.status,
    d.deadline,
    NULL::BIGINT AS cost
  FROM public.get_employee_job_details(v_employee_id, p_start_date, p_end_date) AS d;
END;
$$;

-- Verify:
-- 1. Media account linked to employees.auth_user_id returns exactly one productivity row:
--    SELECT * FROM public.get_my_employee_productivity('2026-04-01', '2026-04-30');
-- 2. Cost is NULL in both self RPCs.
-- 3. Team RPCs still return unchanged data for admin/manager flows.
