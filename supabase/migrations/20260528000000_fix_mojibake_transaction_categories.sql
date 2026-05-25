-- Fix mojibake in transaction_categories
UPDATE public.transaction_categories
SET name = 'Hoàn tiền hợp đồng', updated_at = now()
WHERE name LIKE 'Ho%n ti%n h%p %%ng' OR name = 'Hoàn tiền hợp đồng';

-- Fix corrupted column comment in order_payments (if it exists)
COMMENT ON COLUMN public.order_payments.payment_type IS 'Type: deposit (đặt cọc), final (tất toán), refund (hoàn tiền), adjustment (điều chỉnh)';
