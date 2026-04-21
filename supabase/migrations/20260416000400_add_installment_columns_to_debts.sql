
-- ═══════════════════════════════════════════════════════════
-- DEBT V2 UPGRADE: Add Installment + Link Columns
-- Applied: 2026-04-16
-- ═══════════════════════════════════════════════════════════

-- 1. Add installment columns
ALTER TABLE debts
  ADD COLUMN IF NOT EXISTS installment_total INT,
  ADD COLUMN IF NOT EXISTS installment_paid INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installment_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS debt_date DATE,
  ADD COLUMN IF NOT EXISTS payment_date DATE;

-- 2. Create partial indexes for FK columns (performance)
CREATE INDEX IF NOT EXISTS idx_debts_card_id ON debts(card_id) WHERE card_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_debts_contract_id ON debts(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_debts_platform ON debts(platform) WHERE platform IS NOT NULL;
;
