-- CRM RPC hardening:
-- - Capture executable definitions for CRM RPCs used by server actions.
-- - Restrict direct RPC execution to service_role; app-level RBAC lives in server actions.

BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.customer_code_seq START 1;

DO $$
DECLARE
  v_next bigint;
BEGIN
  SELECT COALESCE(
    MAX(((regexp_match(customer_code, '([0-9]+)$'))[1])::bigint),
    0
  ) + 1
  INTO v_next
  FROM public.customers
  WHERE customer_code ~ '[0-9]+$';

  IF v_next <= 1 THEN
    PERFORM setval('public.customer_code_seq', 1, false);
  ELSE
    PERFORM setval('public.customer_code_seq', v_next - 1, true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.nextval_customer_code()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT nextval('public.customer_code_seq');
$$;

CREATE OR REPLACE FUNCTION public.append_care_log(
  p_lead_id uuid,
  p_content text,
  p_type text DEFAULT 'Ghi chu'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_entry jsonb;
  v_rows integer;
BEGIN
  IF p_lead_id IS NULL THEN
    RAISE EXCEPTION 'Lead id is required';
  END IF;

  IF NULLIF(BTRIM(p_content), '') IS NULL THEN
    RAISE EXCEPTION 'Care log content is required';
  END IF;

  v_entry := jsonb_build_object(
    'type', COALESCE(NULLIF(BTRIM(p_type), ''), 'Ghi chu'),
    'content', BTRIM(p_content),
    'timestamp', NOW()
  );

  UPDATE public.crm_leads
  SET care_history = COALESCE(care_history, '') || E'\n---\n' ||
      '[' || (v_entry->>'type') || '] ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI') || E'\n' || (v_entry->>'content'),
      care_type = v_entry->>'type',
      updated_at = NOW()
  WHERE id = p_lead_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  RETURN jsonb_build_object('log', v_entry);
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_lead_to_customer(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_lead public.crm_leads%ROWTYPE;
  v_customer_id uuid;
  v_existing_customer_id uuid;
BEGIN
  IF p_lead_id IS NULL THEN
    RAISE EXCEPTION 'Lead id is required';
  END IF;

  SELECT *
  INTO v_lead
  FROM public.crm_leads
  WHERE id = p_lead_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  IF v_lead.phone IS NULL OR BTRIM(v_lead.phone) = '' THEN
    RAISE EXCEPTION 'phone is required';
  END IF;

  IF v_lead.status = 'da_chot' THEN
    RAISE EXCEPTION 'Lead already converted';
  END IF;

  SELECT id
  INTO v_existing_customer_id
  FROM public.customers
  WHERE phone = BTRIM(v_lead.phone)
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_existing_customer_id IS NOT NULL THEN
    v_customer_id := v_existing_customer_id;

    UPDATE public.customers
    SET lead_id = p_lead_id,
        updated_at = NOW()
    WHERE id = v_customer_id
      AND lead_id IS NULL;
  ELSE
    INSERT INTO public.customers (
      customer_code,
      full_name,
      phone,
      email,
      address,
      source,
      notes,
      lead_id,
      created_by
    )
    VALUES (
      'KH-' || LPAD(public.nextval_customer_code()::text, 3, '0'),
      COALESCE(NULLIF(BTRIM(v_lead.contact_name), ''), 'Khach hang moi'),
      BTRIM(v_lead.phone),
      NULLIF(BTRIM(v_lead.email), ''),
      NULLIF(BTRIM(v_lead.address), ''),
      v_lead.source,
      v_lead.needs,
      p_lead_id,
      v_lead.created_by
    )
    RETURNING id INTO v_customer_id;
  END IF;

  UPDATE public.crm_leads
  SET status = 'da_chot',
      status_changed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'customer_id', v_customer_id,
    'lead', row_to_json(v_lead)
  );
END;
$$;

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
  SELECT json_object_agg(COALESCE(status::text, 'unknown'), lead_count)
  INTO v_by_status
  FROM (
    SELECT status, COUNT(*) AS lead_count
    FROM public.crm_leads
    WHERE deleted_at IS NULL
    GROUP BY status
  ) sub;

  IF v_by_status IS NULL THEN
    v_by_status := '{}'::json;
  END IF;

  SELECT json_object_agg(source_key, lead_count)
  INTO v_by_source
  FROM (
    SELECT COALESCE(NULLIF(source, ''), 'Khac') AS source_key,
           COUNT(*) AS lead_count
    FROM public.crm_leads
    WHERE deleted_at IS NULL
    GROUP BY COALESCE(NULLIF(source, ''), 'Khac')
  ) sub;

  IF v_by_source IS NULL THEN
    v_by_source := '{}'::json;
  END IF;

  SELECT COUNT(*)
  INTO v_total
  FROM public.crm_leads
  WHERE deleted_at IS NULL;

  v_closed := COALESCE((v_by_status->>'da_chot')::integer, 0);
  v_cancelled := COALESCE((v_by_status->>'huy')::integer, 0);
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
    SELECT customer_id, SUM(COALESCE(total_value, 0)) AS customer_total
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

REVOKE ALL ON FUNCTION public.nextval_customer_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.append_care_log(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.convert_lead_to_customer(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_crm_lead_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_crm_customer_stats() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.nextval_customer_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.append_care_log(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_customer(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_crm_lead_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_crm_customer_stats() TO service_role;

COMMIT;
