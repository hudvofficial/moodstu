-- ═══════════════════════════════════════════════════════════
-- ROLLBACK cho 20261112120000_lab_catalog_pricing.sql
-- ═══════════════════════════════════════════════════════════
-- Spec §9.6: MẶC ĐỊNH GIỮ DỮ LIỆU. Rollback hạ tầng chỉ gỡ code UI/API sau flag;
-- script này dùng khi PO xác nhận KHÔNG cần giữ catalog đã nhập.
--
-- ⚠️ DESTRUCTIVE: xóa vĩnh viễn print_products + mapping/override của Lab.
-- ⚠️ Chỉ chạy trên DB clone cô lập đã restore thử. Không chạy trên dev/prod dùng chung.
--
--   Giai đoạn A (an toàn, giữ dữ liệu) — chỉ gỡ phụ thuộc, catalog vẫn còn:
--     1. Deploy code cũ, tắt flag UI.
--     2. Không cần SQL.
--
--   Giai đoạn B (xóa hẳn) — chạy phần dưới.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- 1. Gỡ ràng buộc + cột mới trên lab_services (giữ nguyên item_name, cost_price)
DROP INDEX IF EXISTS public.idx_lab_services_lab_product_unique;
DROP INDEX IF EXISTS public.idx_lab_services_product;

ALTER TABLE public.lab_services
  DROP CONSTRAINT IF EXISTS lab_services_product_id_fkey;

ALTER TABLE public.lab_services
  DROP CONSTRAINT IF EXISTS lab_services_selling_price_override_nonneg;

ALTER TABLE public.lab_services
  DROP COLUMN IF EXISTS selling_price_override;

ALTER TABLE public.lab_services
  DROP COLUMN IF EXISTS product_id;

-- 2. Gỡ catalog SKU
DROP POLICY IF EXISTS "print_products_select" ON public.print_products;
DROP POLICY IF EXISTS "print_products_insert" ON public.print_products;
DROP POLICY IF EXISTS "print_products_update" ON public.print_products;
DROP POLICY IF EXISTS "print_products_delete" ON public.print_products;

DROP TRIGGER IF EXISTS audit_print_products ON public.print_products;
DROP TRIGGER IF EXISTS update_print_products_modtime ON public.print_products;

DROP TABLE IF EXISTS public.print_products;

COMMIT;

-- Sau rollback: bắt buộc `npm run db:types` để types/database.types.ts khớp schema.
