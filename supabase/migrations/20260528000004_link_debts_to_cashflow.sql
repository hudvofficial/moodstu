-- Migration: Link Debts to Cashflow
-- Adds debt_id to receipts and expenses to track payment history for debts

ALTER TABLE public.receipts 
ADD COLUMN IF NOT EXISTS debt_id UUID REFERENCES public.debts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_receipts_debt_id ON public.receipts(debt_id);

ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS debt_id UUID REFERENCES public.debts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_debt_id ON public.expenses(debt_id);
