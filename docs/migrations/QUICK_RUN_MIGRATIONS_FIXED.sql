-- =====================================================
-- VENDOR EXPENSE TRACKING - FIXED VERSION
-- =====================================================

DO $$
BEGIN
  -- Add work_task_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'work_task_id'
  ) THEN
    ALTER TABLE public.expenses ADD COLUMN work_task_id uuid NULL;
    RAISE NOTICE '✅ Added work_task_id column';
  END IF;

  -- Add FK constraint
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_work_task_id_fkey') THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_work_task_id_fkey
      FOREIGN KEY (work_task_id) REFERENCES public.work_tasks(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added FK constraint';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expenses_active_work_task
  ON public.expenses(work_task_id)
  WHERE deleted_at IS NULL AND work_task_id IS NOT NULL;

-- Create vendor category (FIXED: no deleted_at check)
DO $$
DECLARE v_category_id uuid;
BEGIN
  SELECT id INTO v_category_id
  FROM public.transaction_categories
  WHERE type = 'chi' AND category_code IN ('vendor', 'freelancer')
  LIMIT 1;

  IF v_category_id IS NULL THEN
    INSERT INTO public.transaction_categories(category_code, name, type, is_default, created_at, updated_at)
    VALUES ('vendor', 'Chi phí thợ ngoài', 'chi', false, NOW(), NOW())
    RETURNING id INTO v_category_id;
    RAISE NOTICE '✅ Created vendor category';
  END IF;

  INSERT INTO public.system_settings(key, value, description, updated_at)
  VALUES ('vendor_expense_category_id', v_category_id::text, 'Vendor expense category', NOW())
  ON CONFLICT (key) DO UPDATE SET value = v_category_id::text, updated_at = NOW();

  RAISE NOTICE '✅ Set system_settings';
END $$;

-- Category resolver (FIXED)
CREATE OR REPLACE FUNCTION public.resolve_vendor_expense_category_id()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_category_id uuid;
BEGIN
  SELECT value::uuid INTO v_category_id FROM public.system_settings WHERE key = 'vendor_expense_category_id' LIMIT 1;
  IF v_category_id IS NOT NULL THEN RETURN v_category_id; END IF;

  SELECT id INTO v_category_id FROM public.transaction_categories
  WHERE type = 'chi' AND category_code IN ('vendor', 'freelancer')
  ORDER BY CASE WHEN category_code = 'vendor' THEN 0 ELSE 1 END, created_at LIMIT 1;

  RETURN v_category_id;
END; $$;

-- Main upsert function (FIXED: no deleted_at on vendors/contracts where not needed)
CREATE OR REPLACE FUNCTION public.upsert_vendor_expense(p_work_task_id uuid, p_actor_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_task public.work_tasks%ROWTYPE;
  v_vendor_name text := 'Vendor';
  v_expense_id uuid;
  v_expense_date date;
  v_category_id uuid;
  v_description text;
  v_contract_code text;
  v_work_type_display text;
BEGIN
  SELECT * INTO v_task FROM public.work_tasks WHERE id = p_work_task_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Work task không tồn tại'; END IF;
  IF v_task.vendor_id IS NULL THEN RAISE EXCEPTION 'Task không được giao cho vendor'; END IF;

  SELECT id, expense_date INTO v_expense_id, v_expense_date
  FROM public.expenses WHERE work_task_id = p_work_task_id AND deleted_at IS NULL
  ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  v_expense_date := COALESCE(v_expense_date, CURRENT_DATE);
  IF public.is_period_locked(v_expense_date) THEN RAISE EXCEPTION 'Kỳ kế toán đã khóa'; END IF;

  IF COALESCE(v_task.cost, 0) <= 0 OR v_task.status != 'hoan_thanh' OR v_task.status = 'da_huy' THEN
    IF v_expense_id IS NOT NULL THEN
      UPDATE public.expenses SET deleted_at = NOW(), updated_at = NOW() WHERE id = v_expense_id;
    END IF;
    RETURN v_expense_id;
  END IF;

  SELECT full_name INTO v_vendor_name FROM public.vendors WHERE id = v_task.vendor_id;
  v_vendor_name := COALESCE(v_vendor_name, 'Vendor');

  v_category_id := public.resolve_vendor_expense_category_id();
  IF v_category_id IS NULL THEN RAISE EXCEPTION 'Vendor expense category không được cấu hình'; END IF;

  IF v_task.contract_id IS NOT NULL THEN
    SELECT contract_code INTO v_contract_code FROM public.contracts WHERE id = v_task.contract_id;
  END IF;

  v_work_type_display := CASE v_task.work_type
    WHEN 'chup_anh' THEN 'Chụp ảnh' WHEN 'quay_phim' THEN 'Quay phim' WHEN 'makeup' THEN 'Trang điểm'
    WHEN 'hau_ky_anh' THEN 'Hậu kỳ ảnh' WHEN 'hau_ky_phim' THEN 'Hậu kỳ phim'
    ELSE COALESCE(v_task.work_type::text, 'Công việc') END;

  v_description := '[Auto-Vendor] ' || v_work_type_display || ' - ' || v_vendor_name;
  IF v_contract_code IS NOT NULL THEN v_description := v_description || ' (HD: ' || v_contract_code || ')'; END IF;

  IF v_expense_id IS NULL THEN
    INSERT INTO public.expenses(expense_date, payment_method, category_id, amount, description, recipient, contract_id, work_task_id, created_by, created_at, updated_at)
    VALUES (COALESCE(v_task.completion_date::date, CURRENT_DATE), 'chuyen_khoan'::public.payment_method_enum, v_category_id, COALESCE(v_task.cost, 0), v_description, v_vendor_name, v_task.contract_id, p_work_task_id, p_actor_id, NOW(), NOW())
    RETURNING id INTO v_expense_id;
  ELSE
    UPDATE public.expenses SET category_id = v_category_id, amount = COALESCE(v_task.cost, 0), description = v_description, recipient = v_vendor_name, contract_id = v_task.contract_id, expense_date = COALESCE(v_task.completion_date::date, expense_date), updated_at = NOW()
    WHERE id = v_expense_id;
  END IF;

  RETURN v_expense_id;
END; $$;

REVOKE ALL ON FUNCTION public.resolve_vendor_expense_category_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_vendor_expense(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_vendor_expense_category_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_vendor_expense(uuid, uuid) TO service_role;

-- Profit Report Fix
CREATE OR REPLACE FUNCTION public.finance_contract_profit_report(
  p_status TEXT DEFAULT 'all', p_from DATE DEFAULT NULL, p_to DATE DEFAULT NULL,
  p_page INT DEFAULT 1, p_page_size INT DEFAULT 10
) RETURNS TABLE (
  id UUID, contract_code TEXT, customer_name TEXT, contract_date DATE, status TEXT,
  total_amount NUMERIC, paid_amount NUMERIC, remaining_amount NUMERIC,
  package_revenue NUMERIC, addon_revenue NUMERIC, discount NUMERIC,
  task_cost NUMERIC, print_cost NUMERIC, expense_cost NUMERIC, total_cost NUMERIC,
  profit NUMERIC, profit_margin NUMERIC, total_count INT
) AS $$
DECLARE v_total_count INT;
BEGIN
  SELECT COUNT(*) INTO v_total_count FROM public.contracts c
  WHERE c.deleted_at IS NULL
    AND (p_status IS NULL OR p_status = 'all' OR c.status = p_status)
    AND (p_from IS NULL OR c.contract_date >= p_from)
    AND (p_to IS NULL OR c.contract_date <= p_to);

  RETURN QUERY
  WITH paginated AS (
    SELECT c.id, c.contract_code, cu.full_name AS customer_name, c.contract_date, c.status,
      c.total_amount, COALESCE(c.paid_amount, 0) AS paid_amount, COALESCE(c.remaining_amount, 0) AS remaining_amount,
      COALESCE(c.discount_amount, 0) AS discount
    FROM public.contracts c
    LEFT JOIN public.customers cu ON cu.id = c.customer_id
    WHERE c.deleted_at IS NULL
      AND (p_status IS NULL OR p_status = 'all' OR c.status = p_status)
      AND (p_from IS NULL OR c.contract_date >= p_from)
      AND (p_to IS NULL OR c.contract_date <= p_to)
    ORDER BY c.contract_date DESC, c.contract_code DESC
    LIMIT p_page_size OFFSET GREATEST(p_page - 1, 0) * p_page_size
  )
  SELECT p.id, p.contract_code::TEXT, COALESCE(p.customer_name, 'Khach vang lai')::TEXT, p.contract_date, p.status::TEXT,
    p.total_amount, p.paid_amount, p.remaining_amount,
    COALESCE(items.package_revenue, 0)::NUMERIC, COALESCE(items.addon_revenue, 0)::NUMERIC, p.discount,
    COALESCE(tasks.amount, 0)::NUMERIC, COALESCE(prints.amount, 0)::NUMERIC, COALESCE(expenses.amount, 0)::NUMERIC,
    (COALESCE(tasks.amount, 0) + COALESCE(prints.amount, 0) + COALESCE(expenses.amount, 0))::NUMERIC AS total_cost,
    (p.total_amount - (COALESCE(tasks.amount, 0) + COALESCE(prints.amount, 0) + COALESCE(expenses.amount, 0)))::NUMERIC AS profit,
    CASE WHEN p.total_amount = 0 THEN 0::NUMERIC
    ELSE ROUND(((p.total_amount - (COALESCE(tasks.amount, 0) + COALESCE(prints.amount, 0) + COALESCE(expenses.amount, 0))) / p.total_amount) * 100, 1)::NUMERIC END AS profit_margin,
    v_total_count
  FROM paginated p
  LEFT JOIN LATERAL (SELECT SUM(CASE WHEN COALESCE(ci.is_addon, FALSE) THEN COALESCE(ci.total_amount, 0) ELSE 0 END) AS addon_revenue, SUM(CASE WHEN COALESCE(ci.is_addon, FALSE) THEN 0 ELSE COALESCE(ci.total_amount, 0) END) AS package_revenue FROM public.contract_items ci WHERE ci.contract_id = p.id AND ci.deleted_at IS NULL) items ON TRUE
  LEFT JOIN LATERAL (SELECT SUM(COALESCE(wt.cost, 0)) AS amount FROM public.work_tasks wt WHERE wt.contract_id = p.id AND wt.vendor_id IS NULL) tasks ON TRUE
  LEFT JOIN LATERAL (SELECT SUM(COALESCE(po.total_amount, 0)) AS amount FROM public.printing_orders po WHERE po.contract_id = p.id AND po.deleted_at IS NULL) prints ON TRUE
  LEFT JOIN LATERAL (SELECT SUM(COALESCE(ex.amount, 0)) AS amount FROM public.expenses ex WHERE ex.contract_id = p.id AND ex.deleted_at IS NULL AND (ex.description IS NULL OR ex.description NOT LIKE '[Auto-Print]%')) expenses ON TRUE;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

SELECT '✅ Migration completed!' AS status,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'work_task_id') AS has_work_task_id,
  EXISTS(SELECT 1 FROM transaction_categories WHERE category_code = 'vendor') AS has_vendor_category,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'upsert_vendor_expense') AS has_function;
