-- Canonical multi-day contract schedule templates and internal calendar feed.
-- Operational dates remain one row per contract_events record; templates only
-- define the default lifecycle and downstream deadline offsets.

BEGIN;

DELETE FROM public.event_templates
WHERE service_type IN ('studio', 'ngay_cuoi', 'combo');

INSERT INTO public.event_templates (
  service_type,
  event_type,
  event_name,
  default_days_offset,
  sort_order,
  is_active
)
VALUES
  ('studio', 'ngay_chup', 'Studio', 0, 1, true),
  ('studio', 'ngay_to_chuc', 'Ngày cưới', 0, 2, true),
  ('studio', 'hau_ky', 'Hậu kỳ Studio', 3, 3, true),
  ('studio', 'giao_san_pham', 'Giao sản phẩm', 7, 4, true),
  ('ngay_cuoi', 'ngay_to_chuc', 'Ngày cưới', 0, 1, true),
  ('ngay_cuoi', 'hau_ky', 'Hậu kỳ Ngày cưới', 5, 2, true),
  ('ngay_cuoi', 'giao_san_pham', 'Giao sản phẩm', 10, 3, true),
  ('combo', 'ngay_chup', 'Ngày chụp', 0, 1, true),
  ('combo', 'ngay_to_chuc', 'Ngày cưới', 0, 2, true),
  ('combo', 'hau_ky', 'Hậu kỳ Combo', 5, 3, true),
  ('combo', 'giao_san_pham', 'Giao sản phẩm', 10, 4, true);

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
  v_start := make_date(v_year, v_month, 1) - interval '2 months';
  v_end_exclusive := make_date(v_year, v_month, 1) + interval '3 months';

  RETURN QUERY
  SELECT feed.*
  FROM (
    SELECT
      'schedule'::text,
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
      NULL::text,
      NULL::uuid,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::uuid,
      NULL::text,
      NULL::text
    FROM public.schedules s
    WHERE s.event_date >= v_start
      AND s.event_date < v_end_exclusive

    UNION ALL

    SELECT
      'contract_event'::text,
      ce.id,
      COALESCE(ce.title, ce.event_type::text),
      ce.event_date::text,
      ce.end_date::text,
      NULL::uuid,
      ce.contract_id,
      ce.status::text,
      ce.google_event_id::text,
      NULL::text,
      ce.location::text,
      ce.notes::text,
      NULL::text,
      NULL::uuid,
      NULL::text,
      ce.start_time::text,
      ce.end_time::text,
      NULL::text,
      ce.id,
      c.contract_code::text,
      cu.full_name::text
    FROM public.contract_events ce
    JOIN public.contracts c ON c.id = ce.contract_id
    LEFT JOIN public.customers cu ON cu.id = c.customer_id
    WHERE ce.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND ce.event_type IN ('ngay_chup', 'ngay_to_chuc')
      AND ce.event_date >= v_start
      AND ce.event_date < v_end_exclusive

    UNION ALL

    SELECT
      'task'::text,
      wt.id,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::uuid,
      wt.contract_id,
      wt.status::text,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      wt.work_type::text,
      wt.assigned_to,
      wt.start_date::text,
      wt.start_time::text,
      wt.end_time::text,
      wt.deadline::text,
      wt.event_id,
      c.contract_code::text,
      cu.full_name::text
    FROM public.work_tasks wt
    LEFT JOIN public.contracts c ON c.id = wt.contract_id
    LEFT JOIN public.customers cu ON cu.id = c.customer_id
    WHERE wt.work_type IN ('chup_anh', 'quay_phim', 'makeup', 'tro_ly', 'cameraman')
      AND (
        (wt.deadline >= v_start AND wt.deadline < v_end_exclusive)
        OR (wt.deadline IS NULL AND wt.start_date >= v_start AND wt.start_date < v_end_exclusive)
      )
  ) AS feed(
    event_source, id, event_type, event_date, end_date, employee_id,
    contract_id, status, google_event_id, color_id, location, notes,
    work_type, assigned_to, start_date, start_time, end_time, deadline,
    event_id, contract_code, customer_name
  )
  ORDER BY
    COALESCE(feed.event_date::date, feed.deadline::date, feed.start_date::date) NULLS LAST,
    feed.event_source,
    feed.id;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.calendar_month_events(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calendar_month_events(int, int) FROM anon;
REVOKE ALL ON FUNCTION public.calendar_month_events(int, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.calendar_month_events(int, int) TO service_role;

COMMIT;
