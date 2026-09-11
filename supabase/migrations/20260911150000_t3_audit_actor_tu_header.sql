-- #19 T3 · log_audit_action lấy người thao tác từ header x-actor-id — agent/HANDOFFS/T-20260911-audit-co-danh-tinh.spec.md
-- (migrate-direct.mjs tự bọc BEGIN/COMMIT). Revert: agent/HANDOFFS/T-20260911-audit-co-danh-tinh.revert.sql
--
-- VÌ SAO: 5 trigger này (contracts, expenses, payments, dresses, employee_salaries) sinh 64% dòng nhật ký
-- nhưng luôn vô danh: chúng đọc get_current_employee_id() -> auth.uid(), trong khi mọi đường ghi của app
-- dùng service role nên auth.uid() rỗng. Đo 11/09: 30 ngày có 883 dòng, chỉ 2 dòng biết ai làm.
--
-- CÁCH: lib/supabase/server.ts gắn header `x-actor-id` (auth.users.id) vào client admin khi biết người dùng;
-- PostgREST đưa header vào GUC `request.headers`. Đã thăm dò trên prod 11/09 trước khi áp: header xuống tới DB.
-- Đường ghi KHÔNG có header (cron, script, 110 nơi gọi createAdminClient() không tham số) vẫn chạy y như cũ,
-- chỉ là performed_by để NULL — không có lỗi, không mất dòng log.
--
-- Đổi đúng 3 điểm so với bản sống: thêm biến actor_id (đọc header, bọc EXCEPTION vì header có thể không phải uuid),
-- thêm cột performed_by + source='trigger' vào 3 lệnh INSERT. Phần còn lại giữ nguyên.

CREATE OR REPLACE FUNCTION public.log_audit_action()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  emp_id UUID;
  actor_id UUID;
BEGIN
  -- Try to get employee from auth, fallback to NULL (service_role case)
  BEGIN
    emp_id := get_current_employee_id();
  EXCEPTION WHEN OTHERS THEN
    emp_id := NULL;
  END;

  -- #19: danh tính do app gửi kèm request (header x-actor-id). Header lạ/không phải uuid -> NULL, không nổ.
  BEGIN
    actor_id := (nullif(current_setting('request.headers', true), '')::json ->> 'x-actor-id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    actor_id := NULL;
  END;

  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs (employee_id, performed_by, source, action, table_name, record_id, old_data)
    VALUES (emp_id, actor_id, 'trigger', 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs (employee_id, performed_by, source, action, table_name, record_id, old_data, new_data)
    VALUES (emp_id, actor_id, 'trigger', 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs (employee_id, performed_by, source, action, table_name, record_id, new_data)
    VALUES (emp_id, actor_id, 'trigger', 'CREATE', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$;
