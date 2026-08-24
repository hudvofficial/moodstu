-- T-20260824-printing-workflow-redesign (ADR-014)
-- Bỏ "đặt cọc"/"giao khách"/kho vật tư khỏi trạng thái đơn in — nghiệp vụ thật là
-- Mood gửi Lab đối tác, không có cọc, không có kho. Công nợ Lab đã đúng sẵn qua
-- record_lab_payment_atomic/lab_payment_allocations, không đụng.

-- 1. Gộp trạng thái legacy 'da_nhan' vào 'hoan_thanh' (cùng nghĩa: Mood đã nhận hình từ lab).
UPDATE public.printing_orders
SET status = 'hoan_thanh', updated_at = now()
WHERE status = 'da_nhan' AND deleted_at IS NULL;

-- 2. 2 đơn 'dat_coc' không có tiền thật đứng sau (deposit_amount=0, 0 dòng order_payments/
--    lab_payment_allocations) và hợp đồng gốc đã hoan_thanh từ lâu → chuyển thẳng sang
--    hoan_thanh (Trục A xong). KHÔNG tạo payment giả — công nợ Lab (805.000đ, lab Hồng Bảo)
--    sẽ tự lộ ra qua finance_lab_debt_summary() sau migration, xử lý bằng "Thanh toán lab" thật.
UPDATE public.printing_orders
SET status = 'hoan_thanh', updated_at = now()
WHERE id IN ('78b0dc36-7e26-41bb-94c4-13e21ae8fda1', '2ea52890-3f34-4d7e-8bfd-f470f530e471')
  AND deleted_at IS NULL;

-- 3. Khoá vocabulary — chỉ áp cho dòng active (deleted_at IS NULL), không đụng dữ liệu
--    lịch sử đã xoá mềm (1 dòng da_nhan + 1 dòng huy_don soft-deleted, giữ nguyên).
ALTER TABLE public.printing_orders
  ADD CONSTRAINT printing_orders_status_check
  CHECK (deleted_at IS NOT NULL OR status IN
    ('cho_xu_ly','dang_in','da_in','hoan_thanh','huy_don','gap_su_co'));

ALTER TABLE public.printing_orders
  ADD CONSTRAINT printing_orders_payment_status_check
  CHECK (deleted_at IS NOT NULL OR payment_status IN
    ('chua_thanh_toan','da_thanh_toan'));

-- 4. printing_stats() — bỏ cột dat_coc/da_giao/da_nhan/da_huy (không còn ý nghĩa), sửa
--    unpaid_cost đọc đúng từ vựng thật (bug gốc: đang hỏi 'unpaid'/'partial' — 0 dòng khớp).
--    Đổi OUT parameters (bớt cột) → Postgres không cho CREATE OR REPLACE, phải DROP trước.
DROP FUNCTION public.printing_stats();

CREATE FUNCTION public.printing_stats()
 RETURNS TABLE(total bigint, cho_xu_ly bigint, dang_in bigint, da_in bigint, hoan_thanh bigint, huy_don bigint, total_cost numeric, unpaid_cost numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE status = 'cho_xu_ly')::bigint AS cho_xu_ly,
    COUNT(*) FILTER (WHERE status = 'dang_in')::bigint AS dang_in,
    COUNT(*) FILTER (WHERE status = 'da_in')::bigint AS da_in,
    COUNT(*) FILTER (WHERE status = 'hoan_thanh')::bigint AS hoan_thanh,
    COUNT(*) FILTER (WHERE status = 'huy_don')::bigint AS huy_don,
    COALESCE(SUM(total_amount) FILTER (WHERE status <> 'huy_don'), 0)::numeric AS total_cost,
    COALESCE(SUM(total_amount) FILTER (
      WHERE payment_status = 'chua_thanh_toan' AND status <> 'huy_don'
    ), 0)::numeric AS unpaid_cost
  FROM public.printing_orders
  WHERE deleted_at IS NULL;
$function$;
