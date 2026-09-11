-- REVERT #19 (lớp B) — thân hàm log_audit_action SỐNG trên prod trước khi áp (dump pg_get_functiondef 11/09/2026).
-- Chạy: ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs <file>  (runner tự bọc BEGIN/COMMIT)
-- Quay lui chỉ trả thân hàm; KHÔNG cần gỡ gì ở app: header x-actor-id thừa ra là vô hại (DB bỏ qua).
CREATE OR REPLACE FUNCTION public.log_audit_action()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  emp_id UUID;
BEGIN
  -- Try to get employee from auth, fallback to NULL (service_role case)
  BEGIN
    emp_id := get_current_employee_id();
  EXCEPTION WHEN OTHERS THEN
    emp_id := NULL;
  END;

  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs (employee_id, action, table_name, record_id, old_data)
    VALUES (emp_id, 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs (employee_id, action, table_name, record_id, old_data, new_data)
    VALUES (emp_id, 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs (employee_id, action, table_name, record_id, new_data)
    VALUES (emp_id, 'CREATE', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$;
