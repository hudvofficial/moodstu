-- Flexible operational payment stages do not require a planned receivable amount.
-- amount = 0 means "collect manually/flexibly against contract remaining".

ALTER TABLE public.payment_plans
  DROP CONSTRAINT IF EXISTS payment_plans_amount_check;

ALTER TABLE public.payment_plans
  ADD CONSTRAINT payment_plans_amount_check CHECK (amount >= 0);
