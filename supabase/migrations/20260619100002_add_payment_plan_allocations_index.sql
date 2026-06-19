-- Migration: Add index for payment plan allocations N+1 query
-- Used by: get_contract_detail_v2 → payment_plans → allocations subquery
CREATE INDEX IF NOT EXISTS idx_payment_plan_allocations_plan_id
  ON public.payment_plan_allocations(payment_plan_id);
