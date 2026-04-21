-- Phase 01 Step 1: Add audit columns + partial indexes on receipts
-- Idempotent: ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS

-- Audit columns
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS created_by uuid NULL;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS updated_by uuid NULL;

-- Partial indexes for active receipt queries
CREATE INDEX IF NOT EXISTS idx_receipts_active_date
  ON public.receipts(receipt_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_receipts_active_contract
  ON public.receipts(contract_id) WHERE deleted_at IS NULL AND contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_receipts_active_type
  ON public.receipts(receipt_type) WHERE deleted_at IS NULL;;
