-- Read-only: đếm + tổng tiền các phiếu chi trùng (tạo lúc thanh toán, trước Phase 1)
-- Dấu hiệu nhận diện CHÍNH XÁC dòng thừa: description '[Auto-Vendor] Thanh toán công nợ%'
-- + work_task_id IS NULL + category_id IS NULL (dòng accrual luôn có 2 cột này).
SELECT date_trunc('month', expense_date)::date AS thang,
       COUNT(*)        AS so_dong_thua,
       SUM(amount)     AS tong_tien_thua
FROM public.expenses
WHERE deleted_at IS NULL
  AND description LIKE '[Auto-Vendor] Thanh toán công nợ%'
  AND work_task_id IS NULL
  AND category_id IS NULL
GROUP BY 1
ORDER BY 1;
