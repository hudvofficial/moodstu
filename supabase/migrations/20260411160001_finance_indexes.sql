-- ═══════════════════════════════════════════
-- Finance Indexes (bảng hiện có + bảng mới)
-- ═══════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_receipts_date
  ON public.receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_receipts_contract
  ON public.receipts(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_date
  ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category
  ON public.expenses(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_active
  ON public.expenses(expense_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_contract
  ON public.payments(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_date
  ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_debts_status
  ON public.debts(status) WHERE status IS DISTINCT FROM 'da_thanh_toan';
CREATE INDEX IF NOT EXISTS idx_close_tasks_close_id
  ON public.finance_close_tasks(close_id);
