-- T-20260825-printing-drawer-fixes — phát hiện qua gate `npm run verify:printing`:
-- migration 20260824120000_printing_workflow_redesign.sql (ADR-014) đã
-- `DROP FUNCTION public.printing_stats()` rồi `CREATE FUNCTION` lại (bắt buộc vì
-- đổi OUT parameters) nhưng KHÔNG áp lại REVOKE/GRANT của 20260428130000 → hàm
-- SECURITY DEFINER này mở lại cho PUBLIC/anon/authenticated (anon gọi được → lộ
-- số liệu tổng hợp đơn in). Khôi phục đúng quyền như 20260428:789/802.
REVOKE ALL ON FUNCTION public.printing_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.printing_stats() TO service_role;
