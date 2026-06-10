-- ═══════════════════════════════════════════════════════════
-- Add contract-module tables to supabase_realtime publication — 2026-06-10
-- ═══════════════════════════════════════════════════════════
-- Phát hiện khi verify fix useRealtimeMulti: publication supabase_realtime
-- RỖNG (0 bảng) → postgres_changes KHÔNG BAO GIỜ fire cho bất kỳ bảng nào.
-- Mọi useRealtimeMulti/useRealtime trong app subscribe thành công nhưng không
-- bao giờ nhận event — auto-refresh đa-user thực chất chưa từng chạy.
--
-- Migration này chỉ thêm các bảng CONTRACT MODULE (list + detail subscribe):
-- contracts, payments, contract_checklists, contract_notes, contract_events,
-- work_tasks, payment_plans, dress_reservations, printing_orders.
-- Các module khác (dresses, crm_leads, calendar...) cần audit RLS riêng trước
-- khi thêm — KHÔNG thêm ở đây.
--
-- An toàn: cả 9 bảng đã bật RLS + policies (20260605000000 + 20260605030000,
-- verify 2026-06-10: relrowsecurity=true, policy_count 4-6/bảng). Realtime
-- enforce RLS per-subscriber → anon không nhận event, authenticated nhận theo
-- is_active_employee().
-- Idempotent: check pg_publication_tables trước khi ADD.
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'contracts',
    'payments',
    'contract_checklists',
    'contract_notes',
    'contract_events',
    'work_tasks',
    'payment_plans',
    'dress_reservations',
    'printing_orders'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
