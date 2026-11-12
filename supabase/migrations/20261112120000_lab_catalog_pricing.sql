-- ═══════════════════════════════════════════════════════════
-- T-20261112-lab-catalog-pricing-mobile — ADDITIVE ONLY
-- ═══════════════════════════════════════════════════════════
-- Spec: agent/HANDOFFS/T-20261112-lab-catalog-pricing-mobile.spec.md (§4, §9)
-- Phạm vi: thêm catalog SKU chung (print_products) + nối lab_services vào SKU.
-- KHÔNG đụng printing_orders, contract_items, expenses, receipts, sổ tài chính.
-- KHÔNG backfill, KHÔNG map tự động, KHÔNG xóa dữ liệu cũ.
--
-- Rollback: supabase/rollback/20261112120000_lab_catalog_pricing_down.sql
--           (mặc định giữ dữ liệu catalog đã nhập — chỉ gỡ code, xem spec §9.6)
-- ═══════════════════════════════════════════════════════════

-- ─── 1. Catalog sản phẩm in dùng chung ─────────────────────

CREATE TABLE IF NOT EXISTS public.print_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  name text NOT NULL,
  category text NULL,
  specification text NULL,
  unit text NULL,
  default_selling_price numeric(15,2) NOT NULL DEFAULT 0
    CHECK (default_selling_price >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  deleted_at timestamptz NULL
);

COMMENT ON TABLE public.print_products IS
  'Catalog SKU in ảnh dùng chung. Giá bán mặc định toàn studio; Lab có thể override riêng ở lab_services.selling_price_override.';
COMMENT ON COLUMN public.print_products.default_selling_price IS
  'Giá bán mặc định (VND). Lab không override sẽ dùng giá này.';
COMMENT ON COLUMN public.print_products.active IS
  'Cờ ngừng bán — KHÔNG phải phạm vi unique SKU (dùng deleted_at cho xóa mềm).';

-- Unique SKU (spec §9.1): không phân biệt hoa/thường, bỏ khoảng trắng, bỏ qua bản xóa mềm.
CREATE UNIQUE INDEX IF NOT EXISTS idx_print_products_sku_unique
  ON public.print_products (lower(btrim(sku)))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_print_products_active
  ON public.print_products (active)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_print_products_name_trgm
  ON public.print_products (lower(name))
  WHERE deleted_at IS NULL;

-- audit + updated_at (spec §9.2): cùng mẫu log_audit_action() như lab_services
DROP TRIGGER IF EXISTS update_print_products_modtime ON public.print_products;
CREATE TRIGGER update_print_products_modtime
  BEFORE UPDATE ON public.print_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_print_products ON public.print_products;
CREATE TRIGGER audit_print_products
  AFTER INSERT OR UPDATE OR DELETE ON public.print_products
  FOR EACH ROW EXECUTE FUNCTION log_audit_action();

-- RLS: mirror hiện trạng `labs` / `lab_services` trong DB thật (không dùng USING(true)
-- cho write). Đọc mở cho authenticated; ghi chỉ admin/manager qua
-- get_current_employee_role() — đây mới là "quyền quản lý Lab" thực tế (spec §9.4).
ALTER TABLE public.print_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "print_products_select" ON public.print_products;
CREATE POLICY "print_products_select"
  ON public.print_products FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "print_products_insert" ON public.print_products;
CREATE POLICY "print_products_insert"
  ON public.print_products FOR INSERT TO public
  WITH CHECK (
    get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])
  );

DROP POLICY IF EXISTS "print_products_update" ON public.print_products;
CREATE POLICY "print_products_update"
  ON public.print_products FOR UPDATE TO public
  USING (
    get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])
  );

DROP POLICY IF EXISTS "print_products_delete" ON public.print_products;
CREATE POLICY "print_products_delete"
  ON public.print_products FOR DELETE TO public
  USING (
    get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])
  );

-- ─── 2. Nối bảng giá Lab vào SKU ───────────────────────────

ALTER TABLE public.lab_services
  ADD COLUMN IF NOT EXISTS product_id uuid NULL;

ALTER TABLE public.lab_services
  ADD COLUMN IF NOT EXISTS selling_price_override numeric(15,2) NULL;

-- Constraint riêng: override NULL (= dùng giá mặc định) khác 0 (= bán 0đ).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lab_services_selling_price_override_nonneg'
  ) THEN
    ALTER TABLE public.lab_services
      ADD CONSTRAINT lab_services_selling_price_override_nonneg
      CHECK (selling_price_override IS NULL OR selling_price_override >= 0);
  END IF;
END $$;

-- FK ON DELETE SET NULL: xóa SKU không được kéo mất dòng giá của Lab (spec §9.1).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lab_services_product_id_fkey'
  ) THEN
    ALTER TABLE public.lab_services
      ADD CONSTRAINT lab_services_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.print_products(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Chống map trùng: 1 Lab chỉ có 1 dòng giá cho 1 SKU (spec §5).
CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_services_lab_product_unique
  ON public.lab_services (lab_id, product_id)
  WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lab_services_product
  ON public.lab_services (product_id)
  WHERE product_id IS NOT NULL;
