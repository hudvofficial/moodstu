-- Add parent_transaction_id to link fulfillment transactions (Đợt phát sinh)
ALTER TABLE public.inventory_transactions 
ADD COLUMN parent_transaction_id uuid REFERENCES public.inventory_transactions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_parent_id 
ON public.inventory_transactions(parent_transaction_id);
