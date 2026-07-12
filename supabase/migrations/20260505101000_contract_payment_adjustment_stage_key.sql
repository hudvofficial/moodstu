-- Accept full Vietnamese display text "Phát sinh hợp đồng" as the adjustment stage.

CREATE OR REPLACE FUNCTION public.payment_stage_key_v2(p_stage text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO public
AS $$
DECLARE
  v_raw text := btrim(COALESCE(p_stage, ''));
  v_key text;
BEGIN
  IF v_raw = '' THEN
    RETURN NULL;
  END IF;

  -- Preserve support for two common legacy encodings of đ/Đ without storing
  -- mojibake literals in the migration source.
  v_raw := replace(v_raw, chr(196) || chr(8216), 'đ');
  v_raw := replace(v_raw, chr(196) || chr(144), 'Đ');
  v_raw := lower(v_raw);

  v_key := translate(
    v_raw,
    'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ',
    'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
  );
  v_key := regexp_replace(v_key, '[^a-z0-9]+', '_', 'g');
  v_key := regexp_replace(v_key, '^_+|_+$', '', 'g');

  IF v_key IN ('dat_coc', 'coc', 'tien_coc', 'deposit', 'contract_deposit')
     OR v_key LIKE '%coc%' THEN
    RETURN 'deposit';
  END IF;

  IF v_key IN ('thanh_toan_dot_1', 'dot_1', 'lan_1', 'first', 'installment_1', 'stage_1')
     OR v_key LIKE '%dot_1%'
     OR v_key LIKE '%lan_1%' THEN
    RETURN 'installment_1';
  END IF;

  IF v_key IN ('thanh_toan_dot_2', 'dot_2', 'lan_2', 'second', 'installment_2', 'stage_2')
     OR v_key LIKE '%dot_2%'
     OR v_key LIKE '%lan_2%' THEN
    RETURN 'installment_2';
  END IF;

  IF v_key IN ('tat_toan', 'final', 'remaining', 'thanh_toan_het', 'thanh_toan_con_lai', 'con_lai')
     OR v_key LIKE '%tat_toan%'
     OR v_key LIKE '%thanh_toan_het%'
     OR v_key LIKE '%con_lai%' THEN
    RETURN 'final';
  END IF;

  IF v_key IN ('outside', 'thu_ngoai_dot', 'ngoai_dot', 'thu_khong_theo_dot', 'thanh_toan_khac', 'custom')
     OR v_key LIKE '%ngoai_dot%'
     OR v_key LIKE '%khong_theo_dot%' THEN
    RETURN 'outside';
  END IF;

  IF v_key IN ('phat_sinh', 'adjustment', 'contract_adjustment')
     OR v_key LIKE '%phat_sinh%'
     OR v_key LIKE '%adjustment%' THEN
    RETURN 'adjustment';
  END IF;

  RETURN v_key;
END;
$$;

REVOKE ALL ON FUNCTION public.payment_stage_key_v2(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payment_stage_key_v2(text) TO service_role;
