-- =====================================================
-- Migration: Vendor Payment Performance Indexes
-- Date: 2026-05-27
-- Description: Add indexes to optimize vendor payment queries
-- Related: VENDOR_DEBTS_AUDIT_20260525.md
-- =====================================================

-- =====================================================
-- Index 1: vendor_payment_allocations.work_task_id
-- Purpose: Optimize allocation lookups in record_vendor_payment_atomic RPC
-- Query pattern: WHERE work_task_id = ? (in loop)
-- Note: This table has no deleted_at column
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_vendor_payment_allocations_work_task
ON public.vendor_payment_allocations(work_task_id);

-- =====================================================
-- Index 2: work_tasks vendor cost queries
-- Purpose: Optimize fetchVendorCosts monthly reports
-- Query pattern: WHERE vendor_id IS NOT NULL AND status = 'hoan_thanh' AND deadline BETWEEN ? AND ?
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_work_tasks_vendor_month
ON public.work_tasks(vendor_id, status, deadline)
WHERE vendor_id IS NOT NULL;

-- =====================================================
-- Index 3: vendor_payments.vendor_id with payment_date
-- Purpose: Optimize vendor payment history queries
-- Query pattern: WHERE vendor_id = ? ORDER BY payment_date DESC
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor_date
ON public.vendor_payments(vendor_id, payment_date DESC)
WHERE deleted_at IS NULL;

-- Comments
COMMENT ON INDEX idx_vendor_payment_allocations_work_task IS 'Optimize allocation sum lookups in payment RPC';
COMMENT ON INDEX idx_work_tasks_vendor_month IS 'Optimize vendor cost monthly report queries';
COMMENT ON INDEX idx_vendor_payments_vendor_date IS 'Optimize vendor payment history queries';

-- Analyze tables to update query planner statistics
ANALYZE public.vendor_payment_allocations;
ANALYZE public.work_tasks;
ANALYZE public.vendor_payments;
