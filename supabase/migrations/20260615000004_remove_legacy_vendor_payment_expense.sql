-- =====================================================
-- Migration: Remove legacy vendor payment-time expense (Phase 2 cleanup, now safe)
-- Date: 2026-06-15
-- =====================================================
-- Bối cảnh: trước Phase 1, recordVendorPayment tạo 1 expense lúc TRẢ tiền (cash-basis).
--   Giờ accrual đã được fix + backfill (20260615000003) → chi phí vendor đã được ghi
--   nhận đầy đủ qua expense accrual (theo task.cost). Các dòng payment-time còn lại là
--   TRÙNG → soft-delete để hết over-count.
-- An toàn: chỉ xóa dòng payment-time (work_task_id IS NULL + category_id IS NULL +
--   description '[Auto-Vendor] Thanh toán công nợ%'). Mọi task hoàn thành đều đã có
--   accrual nên cost không bị mất. Reversible: set deleted_at = NULL.
-- =====================================================

UPDATE public.expenses
SET deleted_at = NOW(),
    updated_at = NOW()
WHERE deleted_at IS NULL
  AND description LIKE '[Auto-Vendor] Thanh toán công nợ%'
  AND work_task_id IS NULL
  AND category_id IS NULL;
