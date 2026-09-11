---
title: "Thân hàm DB — nhan-su"
tags: [sinh-tu-dong, db, ham, nhan-su]
cap-nhat: 2026-09-11
trang-thai: sinh-tu-dong
nguon: pg_proc · pg_policies · information_schema.role_table_grants
---

> ⚙️ **File này do `scripts/vault-gen-db-truth.mjs` sinh ra từ database production. ĐỪNG sửa tay** — chạy lại script để cập nhật.

# Thân hàm DB — nhan-su

8 hàm. `SECURITY DEFINER` = chạy bằng quyền chủ hàm, **bỏ qua RLS** → hàm loại này phải tự kiểm quyền bên trong.

| Hàm | Tham số | Trả về | Quyền | Ngôn ngữ |
|---|---|---|---|---|
| [`employee_stats`](#employee_stats) | `—` | `TABLE(total bigint, active bigint, inactive bigint, departments jsonb)` | invoker | sql |
| [`get_current_employee_id`](#get_current_employee_id) | `—` | `uuid` | **DEFINER** | sql |
| [`get_current_employee_role`](#get_current_employee_role) | `—` | `employee_role_enum` | **DEFINER** | sql |
| [`get_my_employee_job_details`](#get_my_employee_job_details) | `p_start_date date, p_end_date date` | `TABLE(contract_id uuid, contract_code text, client_name text, service_type text, event_date date, work_type text, status text, deadline date, cost numeric)` | **DEFINER** | plpgsql |
| [`get_my_employee_productivity`](#get_my_employee_productivity) | `p_start_date date, p_end_date date` | `TABLE(employee_id uuid, full_name text, role employee_role_enum, onsite_hours numeric, active_tasks integer, completed_tasks integer, post_production_active integer, overdue_tasks integer, total_cost numeric)` | **DEFINER** | plpgsql |
| [`handle_new_user`](#handle_new_user) | `—` | `trigger` | **DEFINER** | plpgsql |
| [`is_active_employee`](#is_active_employee) | `—` | `boolean` | **DEFINER** | sql |
| [`next_employee_code`](#next_employee_code) | `—` | `text` | invoker | sql |

---

## employee_stats

`employee_stats()` → `TABLE(total bigint, active bigint, inactive bigint, departments jsonb)` · SECURITY INVOKER · sql · STABLE

```sql
WITH active_rows AS (
    SELECT coalesce(nullif(department, ''), 'Khac') AS department, status
    FROM public.employees
    WHERE deleted_at IS NULL
  ),
  inactive_rows AS (
    SELECT COUNT(*)::BIGINT AS inactive
    FROM public.employees
    WHERE deleted_at IS NOT NULL
  ),
  department_counts AS (
    SELECT department, COUNT(*)::BIGINT AS count
    FROM active_rows
    GROUP BY department
  )
  SELECT
    (SELECT COUNT(*)::BIGINT FROM active_rows) + (SELECT inactive FROM inactive_rows) AS total,
    (SELECT COUNT(*)::BIGINT FROM active_rows WHERE status = 'active') AS active,
    (SELECT inactive FROM inactive_rows) AS inactive,
    COALESCE((SELECT jsonb_object_agg(department, count) FROM department_counts), '{}'::JSONB) AS departments;
```

---

## get_current_employee_id

`get_current_employee_id()` → `uuid` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
SELECT id FROM employees WHERE auth_user_id = (SELECT auth.uid()) AND deleted_at IS NULL LIMIT 1;
```

---

## get_current_employee_role

`get_current_employee_role()` → `employee_role_enum` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
SELECT role FROM employees WHERE auth_user_id = (SELECT auth.uid()) AND deleted_at IS NULL LIMIT 1;
```

---

## get_my_employee_job_details

`get_my_employee_job_details(p_start_date date, p_end_date date)` → `TABLE(contract_id uuid, contract_code text, client_name text, service_type text, event_date date, work_type text, status text, deadline date, cost numeric)` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · STABLE

```sql
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT e.id
    INTO v_employee_id
  FROM public.employees e
  WHERE e.auth_user_id = auth.uid()
    AND e.deleted_at IS NULL
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    d.contract_id,
    d.contract_code,
    d.client_name,
    d.service_type,
    d.event_date,
    d.work_type,
    d.status,
    d.deadline,
    NULL::numeric AS cost
  FROM public.get_employee_job_details(v_employee_id, p_start_date, p_end_date) d;
END;
```

---

## get_my_employee_productivity

`get_my_employee_productivity(p_start_date date, p_end_date date)` → `TABLE(employee_id uuid, full_name text, role employee_role_enum, onsite_hours numeric, active_tasks integer, completed_tasks integer, post_production_active integer, overdue_tasks integer, total_cost numeric)` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · STABLE

```sql
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT e.id
    INTO v_employee_id
  FROM public.employees e
  WHERE e.auth_user_id = auth.uid()
    AND e.deleted_at IS NULL
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.employee_id,
    p.full_name,
    p.role,
    p.onsite_hours,
    p.active_tasks,
    p.completed_tasks,
    p.post_production_active,
    p.overdue_tasks,
    NULL::numeric AS total_cost
  FROM public.get_employee_productivity(p_start_date, p_end_date) p
  WHERE p.employee_id = v_employee_id;
END;
```

---

## handle_new_user

`handle_new_user()` → `trigger` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_full_name text;
  v_employee_code text;
BEGIN
  -- Extract full_name from auth.users raw_user_meta_data, or fallback to email prefix
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Generate a random employee_code to satisfy schema requirement (e.g., NV-A1B2C3)
  v_employee_code := 'NV-' || upper(substr(md5(random()::text), 1, 6));

  -- Insert into employees if the email doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE email = NEW.email) THEN
    INSERT INTO public.employees (
      id,
      auth_user_id,
      email,
      full_name,
      employee_code,
      role,
      status,
      department
    ) VALUES (
      NEW.id,           -- Using the auth.users UUID for the employees ID
      NEW.id,           -- Linking auth_user_id
      NEW.email,
      v_full_name,
      v_employee_code,
      'ctv',            -- Default role for safety
      'active',
      'Chưa phân bổ'
    );
  END IF;

  RETURN NEW;
END;
```

---

## is_active_employee

`is_active_employee()` → `boolean` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND e.deleted_at IS NULL
      AND e.status = 'active'
  );
```

---

## next_employee_code

`next_employee_code()` → `text` · SECURITY INVOKER · sql · VOLATILE

```sql
SELECT 'NV-' || lpad(nextval('public.employee_code_seq')::text, 3, '0');
```
