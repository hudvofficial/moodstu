-- =====================================================
-- Migration: Vendor Payment Tracking System
-- Date: 2026-05-27
-- Description: Create tables for tracking payments to external vendors
-- Pattern: Based on lab_payments system
-- =====================================================

-- Create vendor_payments table
CREATE TABLE IF NOT EXISTS public.vendor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method TEXT DEFAULT 'chuyen_khoan',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

-- Create vendor_payment_allocations table (links payments to work_tasks)
CREATE TABLE IF NOT EXISTS public.vendor_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.vendor_payments(id) ON DELETE CASCADE,
  work_task_id UUID NOT NULL REFERENCES public.work_tasks(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT vendor_payment_allocations_payment_task_key UNIQUE(payment_id, work_task_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor
  ON public.vendor_payments(vendor_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_payments_payment_date
  ON public.vendor_payments(payment_date DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_payments_created_by
  ON public.vendor_payments(created_by);

CREATE INDEX IF NOT EXISTS idx_vendor_payment_allocations_task
  ON public.vendor_payment_allocations(work_task_id);

CREATE INDEX IF NOT EXISTS idx_vendor_payment_allocations_payment
  ON public.vendor_payment_allocations(payment_id);

-- RLS policies for vendor_payments
ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all vendor payments
CREATE POLICY "Enable read access for authenticated users on vendor_payments"
  ON public.vendor_payments FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert vendor payments
CREATE POLICY "Enable insert access for authenticated users on vendor_payments"
  ON public.vendor_payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update vendor payments (soft delete only, no amount changes)
CREATE POLICY "Enable update access for authenticated users on vendor_payments"
  ON public.vendor_payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS policies for vendor_payment_allocations
ALTER TABLE public.vendor_payment_allocations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all allocations
CREATE POLICY "Enable read access for authenticated users on vendor_payment_allocations"
  ON public.vendor_payment_allocations FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert allocations
CREATE POLICY "Enable insert access for authenticated users on vendor_payment_allocations"
  ON public.vendor_payment_allocations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create updated_at trigger for vendor_payments
CREATE OR REPLACE FUNCTION public.update_vendor_payments_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_vendor_payments_updated_at
  BEFORE UPDATE ON public.vendor_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vendor_payments_updated_at();

-- Comments
COMMENT ON TABLE public.vendor_payments IS 'Payment records for external vendors (thợ ngoài)';
COMMENT ON TABLE public.vendor_payment_allocations IS 'Allocation of vendor payments to specific work_tasks';
COMMENT ON COLUMN public.vendor_payments.payment_method IS 'Payment method: tien_mat, chuyen_khoan, the, khac';
COMMENT ON COLUMN public.vendor_payments.payment_date IS 'Date when payment was made (can be backdated)';
