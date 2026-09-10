-- #24 T3 tầng RLS — T-20260910-t3-rls-matrix.spec.md · sinh 2026-09-10 từ đối tượng sống; revert: agent/HANDOFFS/T-20260910-t3-rls-matrix.revert.sql
-- (migrate-direct.mjs tự bọc BEGIN/COMMIT)

-- A. Một policy ĐỌC mỗi bảng, gương ma trận ROLE_PERMISSIONS (contracts = admin/manager/sale; work_tasks thêm việc của mình).
--    Gỡ cặp policy cộng OR: *_authenticated_read (is_active_employee → ctv/media đọc mọi HĐ) + *_select (scope theo người tạo/gán — 63/63 HĐ do admin tạo → sale đọc 0).
DROP POLICY IF EXISTS contracts_authenticated_read ON public.contracts;
DROP POLICY IF EXISTS contracts_select ON public.contracts;
CREATE POLICY contracts_read ON public.contracts FOR SELECT TO authenticated
  USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]));

DROP POLICY IF EXISTS contract_events_authenticated_read ON public.contract_events;
DROP POLICY IF EXISTS contract_events_select ON public.contract_events;
CREATE POLICY contract_events_read ON public.contract_events FOR SELECT TO authenticated
  USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]));

DROP POLICY IF EXISTS contract_checklists_authenticated_read ON public.contract_checklists;
DROP POLICY IF EXISTS contract_checklists_select ON public.contract_checklists;
CREATE POLICY contract_checklists_read ON public.contract_checklists FOR SELECT TO authenticated
  USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]));

DROP POLICY IF EXISTS contract_notes_authenticated_read ON public.contract_notes;
DROP POLICY IF EXISTS contract_notes_select ON public.contract_notes;
CREATE POLICY contract_notes_read ON public.contract_notes FOR SELECT TO authenticated
  USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]));

DROP POLICY IF EXISTS payment_plans_authenticated_read ON public.payment_plans;
DROP POLICY IF EXISTS payment_plans_select ON public.payment_plans;
CREATE POLICY payment_plans_read ON public.payment_plans FOR SELECT TO authenticated
  USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]));

DROP POLICY IF EXISTS payment_plan_allocations_authenticated_read ON public.payment_plan_allocations;
CREATE POLICY payment_plan_allocations_read ON public.payment_plan_allocations FOR SELECT TO authenticated
  USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]));

DROP POLICY IF EXISTS work_tasks_authenticated_read ON public.work_tasks;
DROP POLICY IF EXISTS work_tasks_select ON public.work_tasks;
CREATE POLICY work_tasks_read ON public.work_tasks FOR SELECT TO authenticated
  USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum])) OR assigned_to = get_current_employee_id() OR created_by = get_current_employee_id());

-- B. Ghi chỉ qua service_role (ý định migration 20260605000000): thu hồi grant ghi của anon/authenticated + gỡ 24 policy ghi chết (sale PATCH được mọi HĐ qua anon key).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.contracts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.contract_events FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.contract_checklists FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.work_tasks FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.payment_plans FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.payment_plan_allocations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.contract_notes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.schedules FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.customers FROM anon, authenticated;
DROP POLICY IF EXISTS contract_checklists_insert ON public.contract_checklists;
DROP POLICY IF EXISTS contract_checklists_delete ON public.contract_checklists;
DROP POLICY IF EXISTS contract_checklists_update ON public.contract_checklists;
DROP POLICY IF EXISTS contract_events_insert ON public.contract_events;
DROP POLICY IF EXISTS contract_events_delete ON public.contract_events;
DROP POLICY IF EXISTS contract_events_update ON public.contract_events;
DROP POLICY IF EXISTS contract_notes_insert ON public.contract_notes;
DROP POLICY IF EXISTS contract_notes_delete ON public.contract_notes;
DROP POLICY IF EXISTS contract_notes_update ON public.contract_notes;
DROP POLICY IF EXISTS contracts_insert ON public.contracts;
DROP POLICY IF EXISTS contracts_delete ON public.contracts;
DROP POLICY IF EXISTS contracts_update ON public.contracts;
DROP POLICY IF EXISTS customers_insert ON public.customers;
DROP POLICY IF EXISTS customers_delete ON public.customers;
DROP POLICY IF EXISTS customers_update ON public.customers;
DROP POLICY IF EXISTS payment_plans_insert ON public.payment_plans;
DROP POLICY IF EXISTS payment_plans_delete ON public.payment_plans;
DROP POLICY IF EXISTS payment_plans_update ON public.payment_plans;
DROP POLICY IF EXISTS schedules_insert ON public.schedules;
DROP POLICY IF EXISTS schedules_delete ON public.schedules;
DROP POLICY IF EXISTS schedules_update ON public.schedules;
DROP POLICY IF EXISTS work_tasks_insert ON public.work_tasks;
DROP POLICY IF EXISTS work_tasks_delete ON public.work_tasks;
DROP POLICY IF EXISTS work_tasks_update ON public.work_tasks;

-- C. R8: calendar_month_events(p_month, p_year, p_employee_id DEFAULT NULL) — lịch tay lọc theo người khi được truyền (gương schedules_select); mốc HĐ + việc toàn studio (C9).
DROP FUNCTION IF EXISTS public.calendar_month_events(integer, integer);
CREATE OR REPLACE FUNCTION public.calendar_month_events(p_month integer, p_year integer, p_employee_id uuid DEFAULT NULL)
 RETURNS TABLE(event_source text, id uuid, event_type text, event_date text, end_date text, employee_id uuid, contract_id uuid, status text, google_event_id text, color_id text, location text, notes text, work_type text, assigned_to uuid, start_date text, start_time text, end_time text, deadline text, event_id uuid, contract_code text, customer_name text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
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
      AND (p_employee_id IS NULL OR s.employee_id = p_employee_id)   -- R8 (#24): vai không phải admin/manager chỉ thấy lịch tay của mình

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
$function$;
-- Quyền thực thi giữ như bản sống ({postgres, service_role} — migration 20260512/20260513): DROP+CREATE sẽ nhận default ACL public (anon/authenticated EXECUTE) nếu không thu hồi.
REVOKE ALL ON FUNCTION public.calendar_month_events(integer, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calendar_month_events(integer, integer, uuid) TO service_role;
