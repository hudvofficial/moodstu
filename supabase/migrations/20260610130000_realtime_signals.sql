-- ═══════════════════════════════════════════════════════════
-- realtime_signals — kênh tín hiệu thay cho postgres_changes trực tiếp — 2026-06-10
-- ═══════════════════════════════════════════════════════════
-- Pattern "Signal ≠ Data" (chuẩn SaaS: Linear/Notion/Stripe webhook):
-- 8 bảng dưới đây bị REVOKE SELECT khỏi authenticated (hardening 20260605000000)
-- → postgres_changes trực tiếp fail-closed (xem LESSONS A15 follow-up).
-- Thay vì GRANT lại (lộ nguyên row, kể cả cột nhạy cảm như dresses.purchase_price,
-- employees.salary_info — RLS không lọc được CỘT), client chỉ subscribe bảng tín
-- hiệu mỏng này: {table_name, op} — không mang dữ liệu. Nhận tín hiệu → refetch
-- qua server action (lớp kiểm quyền duy nhất, lọc role + cột như hiện tại).
--
-- Thiết kế:
-- - Trigger AFTER ... FOR EACH STATEMENT (1 signal/câu lệnh, không phình theo số
--   row; chấp nhận signal "ma" khi UPDATE 0 row — chỉ gây 1 refetch thừa).
-- - KHÔNG có row_id: list page chỉ cần biết "bảng X đổi"; riêng employees đây là
--   chủ đích (signal không lộ ai/lương gì).
-- - Dọn rác ngay trong trigger fn (xóa signal >1h tuổi) — không cần pg_cron.
-- - emit fn SECURITY DEFINER + pin search_path: role nào ghi bảng nguồn cũng
--   emit được signal mà không cần grant INSERT cho role đó.
-- - RLS theo A11/A12: REVOKE ALL trước, GRANT SELECT sau; policy
--   is_active_employee() (SECURITY DEFINER, đã verify 2026-06-10).
-- Idempotent toàn bộ.
-- ═══════════════════════════════════════════════════════════

-- 1. Bảng tín hiệu
CREATE TABLE IF NOT EXISTS public.realtime_signals (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name text NOT NULL,
  op text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- 2. RLS + grants (REVOKE trước — default privileges grant ALL cho object mới, A11)
ALTER TABLE public.realtime_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS realtime_signals_select ON public.realtime_signals;
CREATE POLICY realtime_signals_select ON public.realtime_signals
  FOR SELECT TO authenticated
  USING (public.is_active_employee());
REVOKE ALL ON public.realtime_signals FROM anon, authenticated;
GRANT SELECT ON public.realtime_signals TO authenticated;

-- 3. Trigger function: emit signal + dọn signal cũ
CREATE OR REPLACE FUNCTION public.emit_realtime_signal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.realtime_signals WHERE changed_at < now() - interval '1 hour';
  INSERT INTO public.realtime_signals (table_name, op) VALUES (TG_TABLE_NAME, TG_OP);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.emit_realtime_signal() FROM anon, authenticated;

-- 4. Trigger trên 8 bảng nguồn
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'dresses',
    'dress_rentals',
    'inventory_items',
    'inventory_transactions',
    'services',
    'service_categories',
    'studio_info',
    'employees'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS emit_realtime_signal ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER emit_realtime_signal AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.emit_realtime_signal()',
      t
    );
  END LOOP;
END $$;

-- 5. Thêm vào publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'realtime_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_signals;
  END IF;
END $$;
