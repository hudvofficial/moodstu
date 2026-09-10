-- REVERT #27 (T4 normalize_phone) — trạng thái SỐNG trước khi áp (prod 2026-09-10): không có normalize_phone/trg_normalize_phone/customer_phone_report,
-- không trigger normalize trên customers/crm_leads, không index biểu thức; convert_lead_to_customer thân dưới (dump pg_get_functiondef 10/09).
-- Chạy: ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs <file>  (runner tự bọc BEGIN/COMMIT)
DROP TRIGGER IF EXISTS normalize_phone_before_write ON public.customers;
DROP TRIGGER IF EXISTS normalize_phone_before_write ON public.crm_leads;
DROP INDEX IF EXISTS public.idx_customers_active_normalized_phone;
DROP INDEX IF EXISTS public.idx_crm_leads_active_normalized_phone;
DROP FUNCTION IF EXISTS public.customer_phone_report();
DROP FUNCTION IF EXISTS public.trg_normalize_phone();

-- convert_lead_to_customer về thân sống (CREATE OR REPLACE giữ nguyên ACL {postgres, service_role})
CREATE OR REPLACE FUNCTION public.convert_lead_to_customer(p_lead_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- normalize_phone gỡ SAU CÙNG (index + trigger + RPC đã thôi tham chiếu)
DROP FUNCTION IF EXISTS public.normalize_phone(text);
