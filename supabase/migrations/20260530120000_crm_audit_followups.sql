-- CRM audit follow-ups (2026-05-30)
-- Safe to run repeatedly. No function-signature changes (all CREATE OR REPLACE on the
-- same signatures), so application code keeps working both before and after this runs.
--   1. Fix get_crm_customer_stats: contracts.total_value does not exist -> total_amount.
--   2. get_crm_lead_stats: collapse 3 table scans into a single pass (same 0-arg signature).
--   3. New get_customer_ltv(uuid[]) so the customer list can aggregate LTV in SQL.
--   4. Supplemental hot-path indexes (assigned+created, active-phone equality, LTV).

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1 + 2. CRM stat RPCs
-- ─────────────────────────────────────────────────────────────

-- get_crm_lead_stats: single MATERIALIZED pass instead of 3 separate scans.
CREATE OR REPLACE FUNCTION public.get_crm_lead_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_total integer;
  v_closed integer;
  v_cancelled integer;
  v_active integer;
  v_conversion_rate integer;
  v_by_status json;
  v_by_source json;
BEGIN
  WITH base AS MATERIALIZED (
    SELECT
      COALESCE(status::text, 'unknown')          AS status,
      COALESCE(NULLIF(source, ''), 'Khac')       AS source_key
    FROM public.crm_leads
    WHERE deleted_at IS NULL
  )
  SELECT
    (SELECT count(*) FROM base),
    (SELECT count(*) FROM base WHERE status = 'da_chot'),
    (SELECT count(*) FROM base WHERE status = 'huy'),
    COALESCE((SELECT json_object_agg(status, c)
              FROM (SELECT status, count(*) AS c FROM base GROUP BY status) s), '{}'::json),
    COALESCE((SELECT json_object_agg(source_key, c)
              FROM (SELECT source_key, count(*) AS c FROM base GROUP BY source_key) s), '{}'::json)
  INTO v_total, v_closed, v_cancelled, v_by_status, v_by_source;

  v_active := v_total - v_closed - v_cancelled;
  IF v_total > 0 THEN
    v_conversion_rate := ROUND((v_closed::numeric / v_total::numeric) * 100);
  ELSE
    v_conversion_rate := 0;
  END IF;

  RETURN json_build_object(
    'total', v_total,
    'active', v_active,
    'closed', v_closed,
    'conversionRate', v_conversion_rate,
    'byStatus', v_by_status,
    'bySource', v_by_source
  );
END;
$$;

-- get_crm_customer_stats: FIX broken column total_value -> total_amount.
CREATE OR REPLACE FUNCTION public.get_crm_customer_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_total integer;
  v_new_this_month integer;
  v_avg_lifetime_value numeric;
BEGIN
  SELECT COUNT(*)
  INTO v_total
  FROM public.customers
  WHERE deleted_at IS NULL;

  SELECT COUNT(*)
  INTO v_new_this_month
  FROM public.customers
  WHERE deleted_at IS NULL
    AND created_at >= date_trunc('month', NOW());

  SELECT COALESCE(ROUND(AVG(customer_total)), 0)
  INTO v_avg_lifetime_value
  FROM (
    SELECT customer_id, SUM(COALESCE(total_amount, 0)) AS customer_total
    FROM public.contracts
    WHERE customer_id IS NOT NULL
      AND deleted_at IS NULL
    GROUP BY customer_id
  ) totals;

  RETURN json_build_object(
    'total', v_total,
    'newThisMonth', v_new_this_month,
    'avgLifetimeValue', COALESCE(v_avg_lifetime_value, 0)
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. Batched customer LTV (replaces per-page contracts fetch + JS sum)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_customer_ltv(p_ids uuid[])
RETURNS TABLE(customer_id uuid, ltv numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT customer_id, SUM(COALESCE(total_amount, 0))::numeric AS ltv
  FROM public.contracts
  WHERE customer_id = ANY(p_ids)
    AND deleted_at IS NULL
  GROUP BY customer_id;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. Supplemental indexes (guarded; idempotent)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION pg_temp.has_columns(p_table text, VARIADIC p_columns text[])
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT to_regclass('public.' || p_table) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(p_columns) AS requested(column_name)
      WHERE NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = p_table
          AND column_name = requested.column_name
      )
    );
$$;

DO $$
BEGIN
  -- "Assigned to me" view sorts by created_at DESC; cover assigned + sort together.
  IF pg_temp.has_columns('crm_leads', 'deleted_at', 'assigned_to', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_crm_leads_active_assigned_created_desc ON public.crm_leads(assigned_to, created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  -- Exact-equality phone lookups for the create-time duplicate guard (trigram GIN can't serve =).
  IF pg_temp.has_columns('crm_leads', 'deleted_at', 'phone') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_crm_leads_active_phone ON public.crm_leads(phone) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('customers', 'deleted_at', 'phone') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_customers_active_phone ON public.customers(phone) WHERE deleted_at IS NULL';
  END IF;

  -- Covering index for customer LTV aggregation.
  IF pg_temp.has_columns('contracts', 'deleted_at', 'customer_id', 'total_amount') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contracts_active_customer_total ON public.contracts(customer_id) INCLUDE (total_amount) WHERE deleted_at IS NULL';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- Grants (service_role only; app uses the service-role admin client)
-- ─────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.get_crm_lead_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_crm_customer_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_customer_ltv(uuid[]) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_crm_lead_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_crm_customer_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_customer_ltv(uuid[]) TO service_role;

COMMIT;
