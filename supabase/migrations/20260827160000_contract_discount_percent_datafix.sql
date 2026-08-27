-- T-20260827-contract-discount-percent: form từng gửi discount_amount = giá trị ô nhập ("50" khi chọn 50%)
-- thay vì số tiền đã quy đổi; total_amount vẫn đúng. Sửa 2 HĐ dính: discount_amount = Σ hạng mục active
-- (không addon) − total_amount. Dừng nếu không đúng 2 dòng.

DO $$
DECLARE v_n bigint;
BEGIN
  SELECT count(*) INTO v_n FROM public.contracts
   WHERE deleted_at IS NULL AND contract_code IN ('HĐ-2026-0060', 'HĐ-2026-0062') AND discount_amount = 50;
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'Pre-check that bai: % HD co discount_amount = 50 (mong 2) — DUNG', v_n;
  END IF;
END $$;

UPDATE public.contracts c
   SET discount_amount = x.items_sum - c.total_amount,
       updated_at = now()
  FROM (
    SELECT i.contract_id, SUM(i.total_amount) AS items_sum
      FROM public.contract_items i
     WHERE i.deleted_at IS NULL AND NOT i.is_addon
     GROUP BY i.contract_id
  ) x
 WHERE x.contract_id = c.id
   AND c.deleted_at IS NULL AND c.contract_code IN ('HĐ-2026-0060', 'HĐ-2026-0062') AND c.discount_amount = 50;

DO $$
DECLARE v_left bigint; v_a numeric; v_b numeric;
BEGIN
  SELECT count(*) INTO v_left FROM public.contracts WHERE deleted_at IS NULL AND discount_amount BETWEEN 1 AND 100;
  SELECT discount_amount INTO v_a FROM public.contracts WHERE contract_code = 'HĐ-2026-0060';
  SELECT discount_amount INTO v_b FROM public.contracts WHERE contract_code = 'HĐ-2026-0062';
  IF v_a <> 475000 OR v_b <> 850000 OR v_left <> 0 THEN
    RAISE EXCEPTION 'Sau fix lech: 0060=% (mong 475000) 0062=% (mong 850000) con_1..100=% — ROLLBACK', v_a, v_b, v_left;
  END IF;
  RAISE NOTICE 'OK: 0060 giam 475.000, 0062 giam 850.000, khong con discount 1..100';
END $$;
