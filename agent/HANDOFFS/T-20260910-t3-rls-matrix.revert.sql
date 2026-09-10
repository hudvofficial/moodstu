-- REVERT #24 (T3 tầng RLS) — policy + grant + hàm SỐNG dump từ prod 2026-09-10 TRƯỚC khi áp T-20260910-t3-rls-matrix
-- Chạy: ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs <file>  (runner tự bọc BEGIN/COMMIT)

-- 1. Gỡ policy mới (nếu đã áp)
DROP POLICY IF EXISTS contracts_read ON public.contracts;
DROP POLICY IF EXISTS contract_events_read ON public.contract_events;
DROP POLICY IF EXISTS contract_checklists_read ON public.contract_checklists;
DROP POLICY IF EXISTS work_tasks_read ON public.work_tasks;
DROP POLICY IF EXISTS payment_plans_read ON public.payment_plans;
DROP POLICY IF EXISTS payment_plan_allocations_read ON public.payment_plan_allocations;
DROP POLICY IF EXISTS contract_notes_read ON public.contract_notes;
DROP POLICY IF EXISTS schedules_read ON public.schedules;
DROP POLICY IF EXISTS customers_read ON public.customers;

-- 2. Dựng lại 46 policy sống (DROP IF EXISTS rồi CREATE nguyên văn)
DROP POLICY IF EXISTS contract_checklists_service_role_all ON public.contract_checklists;
CREATE POLICY contract_checklists_service_role_all ON public.contract_checklists
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS contract_checklists_insert ON public.contract_checklists;
CREATE POLICY contract_checklists_insert ON public.contract_checklists
  FOR INSERT TO PUBLIC
  WITH CHECK ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum])));
DROP POLICY IF EXISTS contract_checklists_delete ON public.contract_checklists;
CREATE POLICY contract_checklists_delete ON public.contract_checklists
  FOR DELETE TO PUBLIC
  USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])));
DROP POLICY IF EXISTS contract_checklists_authenticated_read ON public.contract_checklists;
CREATE POLICY contract_checklists_authenticated_read ON public.contract_checklists
  FOR SELECT TO authenticated
  USING (is_active_employee());
DROP POLICY IF EXISTS contract_checklists_select ON public.contract_checklists;
CREATE POLICY contract_checklists_select ON public.contract_checklists
  FOR SELECT TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM contracts c
  WHERE ((c.id = contract_checklists.contract_id) AND (c.deleted_at IS NULL) AND ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])) OR (c.created_by = get_current_employee_id()) OR (c.assigned_to = get_current_employee_id()))))));
DROP POLICY IF EXISTS contract_checklists_update ON public.contract_checklists;
CREATE POLICY contract_checklists_update ON public.contract_checklists
  FOR UPDATE TO PUBLIC
  USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum])));
DROP POLICY IF EXISTS contract_events_service_role_all ON public.contract_events;
CREATE POLICY contract_events_service_role_all ON public.contract_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS contract_events_insert ON public.contract_events;
CREATE POLICY contract_events_insert ON public.contract_events
  FOR INSERT TO PUBLIC
  WITH CHECK ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum])));
DROP POLICY IF EXISTS contract_events_delete ON public.contract_events;
CREATE POLICY contract_events_delete ON public.contract_events
  FOR DELETE TO PUBLIC
  USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])));
DROP POLICY IF EXISTS contract_events_authenticated_read ON public.contract_events;
CREATE POLICY contract_events_authenticated_read ON public.contract_events
  FOR SELECT TO authenticated
  USING (is_active_employee());
DROP POLICY IF EXISTS contract_events_select ON public.contract_events;
CREATE POLICY contract_events_select ON public.contract_events
  FOR SELECT TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM contracts c
  WHERE ((c.id = contract_events.contract_id) AND ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])) OR (c.created_by = get_current_employee_id()) OR (c.assigned_to = get_current_employee_id()))))));
DROP POLICY IF EXISTS contract_events_update ON public.contract_events;
CREATE POLICY contract_events_update ON public.contract_events
  FOR UPDATE TO PUBLIC
  USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum])));
DROP POLICY IF EXISTS contract_notes_service_role_all ON public.contract_notes;
CREATE POLICY contract_notes_service_role_all ON public.contract_notes
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS contract_notes_insert ON public.contract_notes;
CREATE POLICY contract_notes_insert ON public.contract_notes
  FOR INSERT TO PUBLIC
  WITH CHECK ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum])));
DROP POLICY IF EXISTS contract_notes_delete ON public.contract_notes;
CREATE POLICY contract_notes_delete ON public.contract_notes
  FOR DELETE TO PUBLIC
  USING (((created_by = get_current_employee_id()) OR (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))));
DROP POLICY IF EXISTS contract_notes_authenticated_read ON public.contract_notes;
CREATE POLICY contract_notes_authenticated_read ON public.contract_notes
  FOR SELECT TO authenticated
  USING (is_active_employee());
DROP POLICY IF EXISTS contract_notes_select ON public.contract_notes;
CREATE POLICY contract_notes_select ON public.contract_notes
  FOR SELECT TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM contracts c
  WHERE ((c.id = contract_notes.contract_id) AND (c.deleted_at IS NULL) AND ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])) OR (c.created_by = get_current_employee_id()) OR (c.assigned_to = get_current_employee_id()))))));
DROP POLICY IF EXISTS contract_notes_update ON public.contract_notes;
CREATE POLICY contract_notes_update ON public.contract_notes
  FOR UPDATE TO PUBLIC
  USING (((created_by = get_current_employee_id()) OR (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))));
DROP POLICY IF EXISTS contracts_service_role_all ON public.contracts;
CREATE POLICY contracts_service_role_all ON public.contracts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS contracts_insert ON public.contracts;
CREATE POLICY contracts_insert ON public.contracts
  FOR INSERT TO PUBLIC
  WITH CHECK ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum])));
DROP POLICY IF EXISTS contracts_delete ON public.contracts;
CREATE POLICY contracts_delete ON public.contracts
  FOR DELETE TO PUBLIC
  USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])));
DROP POLICY IF EXISTS contracts_authenticated_read ON public.contracts;
CREATE POLICY contracts_authenticated_read ON public.contracts
  FOR SELECT TO authenticated
  USING (is_active_employee());
DROP POLICY IF EXISTS contracts_select ON public.contracts;
CREATE POLICY contracts_select ON public.contracts
  FOR SELECT TO PUBLIC
  USING (((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])) OR (created_by = get_current_employee_id()) OR (assigned_to = get_current_employee_id())));
DROP POLICY IF EXISTS contracts_update ON public.contracts;
CREATE POLICY contracts_update ON public.contracts
  FOR UPDATE TO PUBLIC
  USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum])));
DROP POLICY IF EXISTS customers_insert ON public.customers;
CREATE POLICY customers_insert ON public.customers
  FOR INSERT TO PUBLIC
  WITH CHECK ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum])));
DROP POLICY IF EXISTS customers_delete ON public.customers;
CREATE POLICY customers_delete ON public.customers
  FOR DELETE TO PUBLIC
  USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])));
DROP POLICY IF EXISTS customers_select ON public.customers;
CREATE POLICY customers_select ON public.customers
  FOR SELECT TO PUBLIC
  USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum])));
DROP POLICY IF EXISTS customers_update ON public.customers;
CREATE POLICY customers_update ON public.customers
  FOR UPDATE TO PUBLIC
  USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum])));
DROP POLICY IF EXISTS payment_plan_allocations_service_role_all ON public.payment_plan_allocations;
CREATE POLICY payment_plan_allocations_service_role_all ON public.payment_plan_allocations
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS payment_plan_allocations_authenticated_read ON public.payment_plan_allocations;
CREATE POLICY payment_plan_allocations_authenticated_read ON public.payment_plan_allocations
  FOR SELECT TO authenticated
  USING (is_active_employee());
DROP POLICY IF EXISTS payment_plans_service_role_all ON public.payment_plans;
CREATE POLICY payment_plans_service_role_all ON public.payment_plans
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS payment_plans_insert ON public.payment_plans;
CREATE POLICY payment_plans_insert ON public.payment_plans
  FOR INSERT TO PUBLIC
  WITH CHECK ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum])));
DROP POLICY IF EXISTS payment_plans_delete ON public.payment_plans;
CREATE POLICY payment_plans_delete ON public.payment_plans
  FOR DELETE TO PUBLIC
  USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])));
DROP POLICY IF EXISTS payment_plans_authenticated_read ON public.payment_plans;
CREATE POLICY payment_plans_authenticated_read ON public.payment_plans
  FOR SELECT TO authenticated
  USING (is_active_employee());
DROP POLICY IF EXISTS payment_plans_select ON public.payment_plans;
CREATE POLICY payment_plans_select ON public.payment_plans
  FOR SELECT TO PUBLIC
  USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum])));
DROP POLICY IF EXISTS payment_plans_update ON public.payment_plans;
CREATE POLICY payment_plans_update ON public.payment_plans
  FOR UPDATE TO PUBLIC
  USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])));
DROP POLICY IF EXISTS schedules_insert ON public.schedules;
CREATE POLICY schedules_insert ON public.schedules
  FOR INSERT TO PUBLIC
  WITH CHECK ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])));
DROP POLICY IF EXISTS schedules_delete ON public.schedules;
CREATE POLICY schedules_delete ON public.schedules
  FOR DELETE TO PUBLIC
  USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])));
DROP POLICY IF EXISTS schedules_select ON public.schedules;
CREATE POLICY schedules_select ON public.schedules
  FOR SELECT TO PUBLIC
  USING (((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])) OR (employee_id = get_current_employee_id())));
DROP POLICY IF EXISTS schedules_update ON public.schedules;
CREATE POLICY schedules_update ON public.schedules
  FOR UPDATE TO PUBLIC
  USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])));
DROP POLICY IF EXISTS work_tasks_service_role_all ON public.work_tasks;
CREATE POLICY work_tasks_service_role_all ON public.work_tasks
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS work_tasks_insert ON public.work_tasks;
CREATE POLICY work_tasks_insert ON public.work_tasks
  FOR INSERT TO PUBLIC
  WITH CHECK ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum])));
DROP POLICY IF EXISTS work_tasks_delete ON public.work_tasks;
CREATE POLICY work_tasks_delete ON public.work_tasks
  FOR DELETE TO PUBLIC
  USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])));
DROP POLICY IF EXISTS work_tasks_authenticated_read ON public.work_tasks;
CREATE POLICY work_tasks_authenticated_read ON public.work_tasks
  FOR SELECT TO authenticated
  USING (is_active_employee());
DROP POLICY IF EXISTS work_tasks_select ON public.work_tasks;
CREATE POLICY work_tasks_select ON public.work_tasks
  FOR SELECT TO PUBLIC
  USING (((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])) OR (assigned_to = get_current_employee_id()) OR (created_by = get_current_employee_id())));
DROP POLICY IF EXISTS work_tasks_update ON public.work_tasks;
CREATE POLICY work_tasks_update ON public.work_tasks
  FOR UPDATE TO PUBLIC
  USING (((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])) OR (assigned_to = get_current_employee_id())));

-- 3. Trả lại grant cho authenticated đúng như đã sống
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contract_checklists TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contract_events TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contract_notes TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contracts TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.customers TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.payment_plan_allocations TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.payment_plans TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.schedules TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.work_tasks TO authenticated;

-- 4. Hàm lịch về chữ ký cũ (p_month, p_year)
DROP FUNCTION IF EXISTS public.calendar_month_events(integer, integer, uuid);
CREATE OR REPLACE FUNCTION public.calendar_month_events(p_month integer, p_year integer)
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
-- ACL sống của hàm = {postgres, service_role}; CREATE mới sẽ nhận default ACL public (anon/authenticated EXECUTE) nếu không thu hồi
REVOKE ALL ON FUNCTION public.calendar_month_events(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calendar_month_events(integer, integer) TO service_role;
