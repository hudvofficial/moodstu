-- Employees audit hardening: fail-closed grants plus atomic employee code.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
DECLARE
  v_max_code int := 0;
BEGIN
  SELECT COALESCE(MAX((regexp_match(employee_code, '^NV-([0-9]+)$'))[1]::int), 0)
  INTO v_max_code
  FROM public.employees
  WHERE employee_code ~ '^NV-[0-9]+$';

  CREATE SEQUENCE IF NOT EXISTS public.employee_code_seq;
  PERFORM setval('public.employee_code_seq', GREATEST(v_max_code, 0), true);
END $$;

CREATE OR REPLACE FUNCTION public.next_employee_code()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT 'NV-' || lpad(nextval('public.employee_code_seq')::text, 3, '0');
$$;

CREATE OR REPLACE FUNCTION public.employee_stats()
RETURNS TABLE (
  total BIGINT,
  active BIGINT,
  inactive BIGINT,
  departments JSONB
) AS $$
  WITH active_rows AS (
    SELECT coalesce(nullif(department, ''), 'Khac') AS department, status
    FROM public.employees
    WHERE deleted_at IS NULL
  ),
  inactive_rows AS (
    SELECT COUNT(*)::BIGINT AS inactive
    FROM public.employees
    WHERE deleted_at IS NOT NULL
  ),
  department_counts AS (
    SELECT department, COUNT(*)::BIGINT AS count
    FROM active_rows
    GROUP BY department
  )
  SELECT
    (SELECT COUNT(*)::BIGINT FROM active_rows) + (SELECT inactive FROM inactive_rows) AS total,
    (SELECT COUNT(*)::BIGINT FROM active_rows WHERE status = 'active') AS active,
    (SELECT inactive FROM inactive_rows) AS inactive,
    COALESCE((SELECT jsonb_object_agg(department, count) FROM department_counts), '{}'::JSONB) AS departments;
$$ LANGUAGE sql STABLE SET search_path = public;

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'employees',
    'employee_salaries',
    'monthly_salaries',
    'attendance',
    'evaluations'
  ] LOOP
    IF to_regclass('public.' || v_table) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', v_table);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', v_table);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', v_table);
    END IF;
  END LOOP;
END $$;

REVOKE ALL ON SEQUENCE public.employee_code_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.employee_code_seq TO service_role;

REVOKE ALL ON FUNCTION public.next_employee_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.employee_stats() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.next_employee_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.employee_stats() TO service_role;

CREATE INDEX IF NOT EXISTS idx_employees_active_created_desc
  ON public.employees(created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_employees_active_updated_desc
  ON public.employees(updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_employees_active_department
  ON public.employees(department)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_employees_active_role
  ON public.employees(role)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_employees_active_status
  ON public.employees(status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_employees_full_name_trgm
  ON public.employees USING gin(full_name gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_employees_employee_code_trgm
  ON public.employees USING gin(employee_code gin_trgm_ops)
  WHERE deleted_at IS NULL;
