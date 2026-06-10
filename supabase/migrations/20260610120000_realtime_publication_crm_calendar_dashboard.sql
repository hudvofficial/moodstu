-- ═══════════════════════════════════════════════════════════
-- Add CRM/Calendar/Dashboard/Approvals tables to supabase_realtime — 2026-06-10
-- ═══════════════════════════════════════════════════════════
-- Tiếp nối 20260610010000 (contract module). Audit RLS từng bảng app đang
-- subscribe (LESSONS A15) trước khi thêm vào publication:
--
-- THÊM (5 bảng — RLS on + SELECT policy + authenticated CÓ grant SELECT):
--   crm_leads          policy crm_leads_select: role sale/manager/admin
--   customers          policy customers_select: role sale/manager/admin
--   schedules          policy schedules_select: admin/manager HOẶC employee_id = mình
--   approval_requests  policy authenticated read (qual true)
--   receipts           policy authenticated_receipts (qual true) — chỉ phục vụ
--                      dashboard-realtime-refresh; finance module GIỮ revalidatePath
-- Helper trong qual (get_current_employee_role/get_current_employee_id) đã verify
-- SECURITY DEFINER (tránh lỗi A12 policy đọc employees bị REVOKE).
-- anon: có grant thừa trên 5 bảng này nhưng policy chặn (roles={authenticated}
-- hoặc qual employee-role → null) → không nhận event.
--
-- KHÔNG THÊM (8 bảng — authenticated bị REVOKE SELECT, hardening 20260605000000):
--   dresses, dress_rentals, inventory_items, inventory_transactions,
--   services, service_categories, studio_info, employees.
-- Realtime enforce quyền per-subscriber: không grant SELECT = không nhận event
-- (fail-closed) → thêm vào publication chỉ tốn WAL. Muốn bật cần GRANT SELECT
-- + review policy từng bảng (đổi posture bảo mật — dự án riêng, xem A9).
-- Idempotent: check pg_publication_tables trước khi ADD.
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'crm_leads',
    'customers',
    'schedules',
    'approval_requests',
    'receipts'
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
