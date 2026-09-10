-- #27 T4 · một normalize_phone cho mọi đường ghi customers.phone / crm_leads.phone + báo cáo khách trùng — agent/HANDOFFS/T-20260910-t4-normalize-phone.spec.md
-- (migrate-direct.mjs tự bọc BEGIN/COMMIT). Revert: agent/HANDOFFS/T-20260910-t4-normalize-phone.revert.sql
-- KHÔNG backfill dữ liệu cũ (quyết định riêng) — chỉ chuẩn hoá từ lần ghi kế tiếp; báo cáo cho biết còn bao nhiêu dòng chưa chuẩn.

-- A. Hàm chuẩn (IMMUTABLE → dùng được trong index)
CREATE OR REPLACE FUNCTION public.normalize_phone(p_phone text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT PARALLEL SAFE
AS $function$
  -- Chuẩn SĐT Việt Nam (#27): chỉ giữ chữ số; +84/84 (11 số) hoặc 0084 (13 số) → 0; rỗng → NULL.
  -- KHÔNG sửa độ dài (thiếu/thừa số là lỗi nhập, báo cáo chứ không đoán).
  SELECT CASE
    WHEN d = '' THEN NULL
    WHEN d ~ '^84[0-9]{9}$' THEN '0' || substr(d, 3)
    WHEN d ~ '^0084[0-9]{9}$' THEN '0' || substr(d, 5)
    ELSE d
  END
  FROM (SELECT regexp_replace(p_phone, '[^0-9]', '', 'g') AS d) s;
$function$;
COMMENT ON FUNCTION public.normalize_phone(text) IS '#27 T4: một luật chuẩn SĐT cho mọi đường ghi customers.phone / crm_leads.phone (trigger + RPC convert + lib/phone.ts gương nhau)';
GRANT EXECUTE ON FUNCTION public.normalize_phone(text) TO anon, authenticated, service_role;

-- B. Trigger BEFORE INSERT/UPDATE OF phone trên 2 bảng + index biểu thức
CREATE OR REPLACE FUNCTION public.trg_normalize_phone()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.phone := public.normalize_phone(NEW.phone);
  RETURN NEW;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.trg_normalize_phone() TO anon, authenticated, service_role;

DROP TRIGGER IF EXISTS normalize_phone_before_write ON public.customers;
CREATE TRIGGER normalize_phone_before_write
  BEFORE INSERT OR UPDATE OF phone ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.trg_normalize_phone();

DROP TRIGGER IF EXISTS normalize_phone_before_write ON public.crm_leads;
CREATE TRIGGER normalize_phone_before_write
  BEFORE INSERT OR UPDATE OF phone ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.trg_normalize_phone();

CREATE INDEX IF NOT EXISTS idx_customers_active_normalized_phone
  ON public.customers (public.normalize_phone(phone)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_active_normalized_phone
  ON public.crm_leads (public.normalize_phone(phone)) WHERE deleted_at IS NULL;

-- C. RPC convert_lead_to_customer: so khớp + ghi theo SĐT chuẩn (thân hàm sống 10/09, đổi 2 dòng có đánh dấu #27)
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
  WHERE public.normalize_phone(phone) = public.normalize_phone(v_lead.phone)   -- #27: so theo SĐT chuẩn (lead +84… vẫn khớp khách 0…)
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
      public.normalize_phone(v_lead.phone),   -- #27
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

-- D. Báo cáo khách trùng (chỉ đọc, service_role)
CREATE OR REPLACE FUNCTION public.customer_phone_report()
 RETURNS TABLE(loai text, sdt_chuan text, so_dong integer, chi_tiet text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  -- Báo cáo khách trùng / SĐT lệch (#27). CHỈ ĐỌC. Gọi bằng service_role (scripts/verify-customers-phone.mjs).
  -- khach_trung      : ≥2 khách sống cùng SĐT chuẩn
  -- lead_trung_khach : lead sống (chưa chốt/huỷ) có SĐT chuẩn trùng khách sống → convert sẽ nối vào khách cũ
  -- sdt_khong_hop_le : khách sống mà SĐT chuẩn không phải 10 số bắt đầu 0 (thiếu/thừa số)
  -- chua_chuan       : dòng đang lưu khác bản chuẩn (ứng viên backfill — quyết định riêng, #27 không sửa)
  WITH c AS (
    SELECT id, customer_code, full_name, phone, public.normalize_phone(phone) AS chuan
    FROM public.customers WHERE deleted_at IS NULL
  ), l AS (
    SELECT id, contact_name, phone, status, public.normalize_phone(phone) AS chuan
    FROM public.crm_leads WHERE deleted_at IS NULL
  )
  SELECT 'khach_trung', chuan, count(*)::int, string_agg(customer_code || ' ' || full_name || ' (' || coalesce(phone,'') || ')', ' | ' ORDER BY customer_code)
  FROM c WHERE chuan IS NOT NULL GROUP BY chuan HAVING count(*) > 1
  UNION ALL
  SELECT 'lead_trung_khach', l.chuan, count(*)::int, string_agg('lead ' || l.contact_name || ' [' || l.status || '] → ' || c.customer_code || ' ' || c.full_name, ' | ')
  FROM l JOIN c ON c.chuan = l.chuan WHERE l.chuan IS NOT NULL AND l.status NOT IN ('da_chot', 'huy') GROUP BY l.chuan
  UNION ALL
  SELECT 'sdt_khong_hop_le', chuan, 1, customer_code || ' ' || full_name || ' (' || coalesce(phone,'') || ')'
  FROM c WHERE chuan IS NOT NULL AND chuan !~ '^0[0-9]{9}$'
  UNION ALL
  SELECT 'chua_chuan', chuan, 1, 'customers ' || customer_code || ' (' || coalesce(phone,'') || ' → ' || coalesce(chuan,'NULL') || ')'
  FROM c WHERE phone IS DISTINCT FROM chuan
  UNION ALL
  SELECT 'chua_chuan', chuan, 1, 'crm_leads ' || contact_name || ' (' || coalesce(phone,'') || ' → ' || coalesce(chuan,'NULL') || ')'
  FROM l WHERE phone IS DISTINCT FROM chuan
  ORDER BY 1, 2;
$function$;
REVOKE ALL ON FUNCTION public.customer_phone_report() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_phone_report() TO service_role;
