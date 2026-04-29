-- Productivity RPC contract and permission hardening.
-- Team productivity data is staff-sensitive and must only be read through
-- service-role server actions after app-level RBAC checks.

DROP FUNCTION IF EXISTS public.get_my_employee_job_details(date, date);
DROP FUNCTION IF EXISTS public.get_my_employee_productivity(date, date);
DROP FUNCTION IF EXISTS public.get_employee_job_details(uuid, date, date);
DROP FUNCTION IF EXISTS public.get_employee_productivity(date, date);

CREATE OR REPLACE FUNCTION public.get_employee_productivity(
  p_start_date date,
  p_end_date date
) RETURNS TABLE (
  employee_id uuid,
  full_name text,
  role public.employee_role_enum,
  onsite_hours numeric,
  active_tasks integer,
  completed_tasks integer,
  post_production_active integer,
  overdue_tasks integer,
  total_cost numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      LEAST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS start_date,
      GREATEST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS end_date
  ),
  task_scope AS (
    SELECT
      wt.id,
      wt.assigned_to,
      COALESCE(wt.status, 'chua_lam') AS status,
      wt.deadline,
      wt.work_type,
      COALESCE(wt.cost, 0)::numeric AS cost,
      CASE
        WHEN wt.start_time IS NOT NULL
         AND wt.end_time IS NOT NULL
         AND wt.end_time::time >= wt.start_time::time
          THEN EXTRACT(EPOCH FROM (wt.end_time::time - wt.start_time::time)) / 3600
        ELSE 0
      END::numeric AS onsite_hours
    FROM public.work_tasks wt
    JOIN public.contracts c
      ON c.id = wt.contract_id
     AND c.deleted_at IS NULL
    LEFT JOIN public.contract_events ce ON ce.id = wt.event_id
    CROSS JOIN params p
    WHERE wt.assigned_to IS NOT NULL
      AND COALESCE(wt.status, '') <> 'da_huy'
      AND (ce.id IS NULL OR ce.deleted_at IS NULL)
      AND COALESCE(wt.start_date, wt.deadline, ce.event_date) >= p.start_date
      AND COALESCE(wt.start_date, wt.deadline, ce.event_date) <= p.end_date
  )
  SELECT
    e.id AS employee_id,
    e.full_name,
    e.role,
    COALESCE(SUM(ts.onsite_hours), 0)::numeric AS onsite_hours,
    COUNT(ts.id) FILTER (WHERE ts.status IN ('chua_lam', 'dang_lam'))::integer AS active_tasks,
    COUNT(ts.id) FILTER (WHERE ts.status = 'hoan_thanh')::integer AS completed_tasks,
    COUNT(ts.id) FILTER (
      WHERE ts.status IN ('chua_lam', 'dang_lam')
        AND ts.work_type IN ('hau_ky_anh', 'dung_phim', 'retouch', 'premiere', 'bien_tap')
    )::integer AS post_production_active,
    COUNT(ts.id) FILTER (
      WHERE ts.status IN ('chua_lam', 'dang_lam')
        AND ts.deadline IS NOT NULL
        AND ts.deadline < current_date
    )::integer AS overdue_tasks,
    COALESCE(SUM(ts.cost), 0)::numeric AS total_cost
  FROM public.employees e
  LEFT JOIN task_scope ts ON ts.assigned_to = e.id
  WHERE e.deleted_at IS NULL
    AND COALESCE(e.status, 'active') NOT IN ('inactive', 'nghi_viec')
  GROUP BY e.id, e.full_name, e.role
  ORDER BY overdue_tasks DESC, active_tasks DESC, onsite_hours DESC, e.full_name ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_employee_job_details(
  p_employee_id uuid,
  p_start_date date,
  p_end_date date
) RETURNS TABLE (
  contract_id uuid,
  contract_code text,
  client_name text,
  service_type text,
  event_date date,
  work_type text,
  status text,
  deadline date,
  cost numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      LEAST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS start_date,
      GREATEST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS end_date
  )
  SELECT
    c.id AS contract_id,
    c.contract_code,
    COALESCE(cu.full_name, 'Khong ten') AS client_name,
    c.service_type::text AS service_type,
    ce.event_date,
    wt.work_type::text AS work_type,
    COALESCE(wt.status, 'chua_lam') AS status,
    wt.deadline,
    COALESCE(wt.cost, 0)::numeric AS cost
  FROM public.work_tasks wt
  JOIN public.contracts c ON c.id = wt.contract_id
  LEFT JOIN public.customers cu ON cu.id = c.customer_id
  LEFT JOIN public.contract_events ce ON ce.id = wt.event_id
  CROSS JOIN params p
  WHERE wt.assigned_to = p_employee_id
    AND COALESCE(wt.status, '') <> 'da_huy'
    AND c.deleted_at IS NULL
    AND (ce.id IS NULL OR ce.deleted_at IS NULL)
    AND COALESCE(wt.start_date, wt.deadline, ce.event_date) >= p.start_date
    AND COALESCE(wt.start_date, wt.deadline, ce.event_date) <= p.end_date
  ORDER BY
    CASE
      WHEN COALESCE(wt.status, 'chua_lam') IN ('chua_lam', 'dang_lam')
       AND wt.deadline IS NOT NULL
       AND wt.deadline < current_date THEN 0
      WHEN COALESCE(wt.status, 'chua_lam') IN ('chua_lam', 'dang_lam') THEN 1
      WHEN COALESCE(wt.status, 'chua_lam') = 'hoan_thanh' THEN 2
      ELSE 3
    END,
    COALESCE(ce.event_date, wt.deadline, wt.start_date),
    c.contract_code,
    wt.work_type::text;
$$;

CREATE OR REPLACE FUNCTION public.get_my_employee_productivity(
  p_start_date date,
  p_end_date date
) RETURNS TABLE (
  employee_id uuid,
  full_name text,
  role public.employee_role_enum,
  onsite_hours numeric,
  active_tasks integer,
  completed_tasks integer,
  post_production_active integer,
  overdue_tasks integer,
  total_cost numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id uuid;
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
    NULL::numeric AS total_cost
  FROM public.get_employee_productivity(p_start_date, p_end_date) p
  WHERE p.employee_id = v_employee_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_employee_job_details(
  p_start_date date,
  p_end_date date
) RETURNS TABLE (
  contract_id uuid,
  contract_code text,
  client_name text,
  service_type text,
  event_date date,
  work_type text,
  status text,
  deadline date,
  cost numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id uuid;
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
    NULL::numeric AS cost
  FROM public.get_employee_job_details(v_employee_id, p_start_date, p_end_date) d;
END;
$$;

REVOKE ALL ON FUNCTION public.get_employee_productivity(date, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_employee_job_details(uuid, date, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_employee_productivity(date, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_employee_job_details(date, date) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_employee_productivity(date, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_employee_job_details(uuid, date, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_employee_productivity(date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_employee_job_details(date, date) TO authenticated, service_role;
