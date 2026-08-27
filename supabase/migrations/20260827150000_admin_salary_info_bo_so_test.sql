-- T-20260827-luong-cung-m5 §1.5 (user "ok cho phép tiến hành" 27/08): bỏ số lương cơ bản TEST 100.000.000
-- trong employees.salary_info của tài khoản Admin (nguồn sinh dòng lương 100tr đã xoá ở M3). Chỉ bỏ khoá
-- base_salary — giữ bank_name / bank_account_no / bank_account_name. Dừng nếu không đúng 1 dòng khớp.

DO $$
DECLARE v_n bigint;
BEGIN
  SELECT count(*) INTO v_n FROM public.employees
   WHERE deleted_at IS NULL AND full_name = 'Admin' AND (salary_info->>'base_salary')::numeric = 100000000;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Pre-check that bai: % dong Admin co base_salary 100.000.000 (mong 1) — DUNG', v_n;
  END IF;
END $$;

UPDATE public.employees
   SET salary_info = salary_info - 'base_salary', updated_at = now()
 WHERE deleted_at IS NULL AND full_name = 'Admin' AND (salary_info->>'base_salary')::numeric = 100000000;

DO $$
DECLARE v_left bigint;
BEGIN
  SELECT count(*) INTO v_left FROM public.employees WHERE deleted_at IS NULL AND COALESCE((salary_info->>'base_salary')::numeric, 0) > 0;
  RAISE NOTICE 'Xong: nhan vien con base_salary > 0 = % (mong 0)', v_left;
END $$;
