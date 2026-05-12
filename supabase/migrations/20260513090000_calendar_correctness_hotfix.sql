-- Calendar correctness hotfix.
-- Preserve the existing visible window while using an exclusive end boundary,
-- and keep task/schedule ordering based on the displayed calendar date.

CREATE OR REPLACE FUNCTION public.calendar_month_events(
  p_month int,
  p_year int
) RETURNS TABLE (
  event_source text,
  id uuid,
  event_type text,
  event_date text,
  end_date text,
  employee_id uuid,
  contract_id uuid,
  status text,
  google_event_id text,
  color_id text,
  location text,
  notes text,
  work_type text,
  assigned_to uuid,
  start_date text,
  start_time text,
  end_time text,
  deadline text,
  event_id uuid,
  contract_code text,
  customer_name text
) AS $$
DECLARE
  v_month int := LEAST(12, GREATEST(1, COALESCE(p_month, EXTRACT(MONTH FROM CURRENT_DATE)::int)));
  v_year int := COALESCE(NULLIF(p_year, 0), EXTRACT(YEAR FROM CURRENT_DATE)::int);
  v_start date;
  v_end_exclusive date;
BEGIN
  v_start := (
    CASE
      WHEN v_month <= 1 THEN make_date(v_year - 1, 12, 20)
      ELSE make_date(v_year, v_month - 1, 20)
    END
  );
  v_end_exclusive := (
    CASE
      WHEN v_month >= 12 THEN make_date(v_year + 1, 1, 11)
      ELSE make_date(v_year, v_month + 1, 11)
    END
  );

  RETURN QUERY
  SELECT
    'schedule'::text AS event_source,
    s.id,
    s.event_type::text,
    s.event_date::text,
    s.end_date::text,
    s.employee_id,
    s.contract_id,
    s.status::text,
    s.google_event_id::text,
    s.color_id::text,
    s.location::text,
    s.notes::text,
    NULL::text AS work_type,
    NULL::uuid AS assigned_to,
    NULL::text AS start_date,
    NULL::text AS start_time,
    NULL::text AS end_time,
    NULL::text AS deadline,
    NULL::uuid AS event_id,
    NULL::text AS contract_code,
    NULL::text AS customer_name
  FROM public.schedules s
  WHERE s.event_date >= v_start
    AND s.event_date < v_end_exclusive

  UNION ALL

  SELECT
    'task'::text AS event_source,
    wt.id,
    NULL::text AS event_type,
    NULL::text AS event_date,
    NULL::text AS end_date,
    NULL::uuid AS employee_id,
    wt.contract_id,
    wt.status::text,
    NULL::text AS google_event_id,
    NULL::text AS color_id,
    NULL::text AS location,
    NULL::text AS notes,
    wt.work_type::text,
    wt.assigned_to,
    wt.start_date::text,
    wt.start_time::text,
    wt.end_time::text,
    wt.deadline::text,
    wt.event_id,
    c.contract_code::text,
    cu.full_name::text AS customer_name
  FROM public.work_tasks wt
  LEFT JOIN public.contracts c ON c.id = wt.contract_id
  LEFT JOIN public.customers cu ON cu.id = c.customer_id
  WHERE (
      wt.deadline >= v_start
      AND wt.deadline < v_end_exclusive
    )
    OR (
      wt.deadline IS NULL
      AND wt.start_date >= v_start
      AND wt.start_date < v_end_exclusive
    )
  ORDER BY
    COALESCE(event_date::date, deadline::date, start_date::date) NULLS LAST,
    event_source,
    id;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.calendar_month_events(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calendar_month_events(int, int) FROM anon;
REVOKE ALL ON FUNCTION public.calendar_month_events(int, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.calendar_month_events(int, int) TO service_role;
