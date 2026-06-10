-- ═══════════════════════════════════════════════════════════
-- Thêm trigger emit_realtime_signal cho các bảng FINANCE — 2026-06-10
-- ═══════════════════════════════════════════════════════════
-- Phục vụ FinanceRealtimeRefresh (chuông báo "màn hình cũ rồi" cho 2 admin
-- cùng thao tác): client nhận tín hiệu → router.refresh() → RSC re-render
-- với số từ server. revalidatePath GIỮ NGUYÊN — đây là tầng bổ sung cho
-- READ freshness, không đụng cơ chế WRITE (xem LESSONS A16 + checklist §B).
--
-- KHÔNG grant gì, KHÔNG thêm bảng finance vào publication — chỉ trigger ghi
-- vào realtime_signals (migration 20260610130000). Số tiền không bao giờ
-- chảy qua realtime payload.
-- receipts/payments/payment_plans đã ở publication trực tiếp (20260610010000
-- + 20260610120000) → không cần trigger ở đây.
-- Idempotent.
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'expenses',
    'debts',
    'fixed_costs',
    'financial_goals',
    'budgets',
    'investments',
    'vendor_payments',
    'monthly_salaries',
    'transaction_categories'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS emit_realtime_signal ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER emit_realtime_signal AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.emit_realtime_signal()',
      t
    );
  END LOOP;
END $$;
