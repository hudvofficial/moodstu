---
title: "Thân hàm DB — nha-cung-cap"
tags: [sinh-tu-dong, db, ham, nha-cung-cap]
cap-nhat: 2026-09-10
trang-thai: sinh-tu-dong
nguon: pg_proc · pg_policies · information_schema.role_table_grants
---

> ⚙️ **File này do `scripts/vault-gen-db-truth.mjs` sinh ra từ database production. ĐỪNG sửa tay** — chạy lại script để cập nhật.

# Thân hàm DB — nha-cung-cap

2 hàm. `SECURITY DEFINER` = chạy bằng quyền chủ hàm, **bỏ qua RLS** → hàm loại này phải tự kiểm quyền bên trong.

| Hàm | Tham số | Trả về | Quyền | Ngôn ngữ |
|---|---|---|---|---|
| [`finance_payable_summary`](#finance_payable_summary) | `—` | `TABLE(payee_type text, payee_id uuid, payee_name text, item_count bigint, total_committed numeric, total_paid numeric, remaining numeric, last_item_date date, last_payment_date date)` | **DEFINER** | sql |
| [`finance_vendor_debt_summary`](#finance_vendor_debt_summary) | `—` | `TABLE(vendor_id uuid, vendor_name text, vendor_phone text, service_type text, task_count bigint, total_cost numeric, total_paid numeric, remaining numeric, last_task_date date, last_payment_date date)` | **DEFINER** | sql |

---

## finance_payable_summary

`finance_payable_summary()` → `TABLE(payee_type text, payee_id uuid, payee_name text, item_count bigint, total_committed numeric, total_paid numeric, remaining numeric, last_item_date date, last_payment_date date)` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
WITH payees AS (
    SELECT 'lab'::text AS payee_type, id AS payee_id, lab_name::text AS payee_name FROM public.labs WHERE deleted_at IS NULL
    UNION ALL SELECT 'vendor', id, full_name FROM public.vendors WHERE deleted_at IS NULL AND status = 'active' AND vendor_type = 'tho_ngoai'
    UNION ALL SELECT 'supplier', id, full_name FROM public.vendors WHERE deleted_at IS NULL AND vendor_type = 'nha_cung_cap'
    UNION ALL SELECT 'employee', id, full_name::text FROM public.employees WHERE deleted_at IS NULL AND status = 'active'
  )
  SELECT p.payee_type, p.payee_id, p.payee_name,
         COUNT(i.target_id) FILTER (WHERE i.remaining > 0)::bigint,
         COALESCE(SUM(i.committed),0)::numeric, COALESCE(SUM(i.allocated),0)::numeric, COALESCE(SUM(i.remaining),0)::numeric,
         MAX(i.item_date) FILTER (WHERE i.remaining > 0),
         (SELECT MAX(e.expense_date) FROM public.expenses e WHERE e.payee_type = p.payee_type AND e.payee_id = p.payee_id AND e.deleted_at IS NULL)
  FROM payees p LEFT JOIN LATERAL public.payable_items(p.payee_type, p.payee_id) i ON TRUE
  GROUP BY p.payee_type, p.payee_id, p.payee_name
  HAVING COALESCE(SUM(i.remaining),0) > 0
  ORDER BY 7 DESC;
```

---

## finance_vendor_debt_summary

`finance_vendor_debt_summary()` → `TABLE(vendor_id uuid, vendor_name text, vendor_phone text, service_type text, task_count bigint, total_cost numeric, total_paid numeric, remaining numeric, last_task_date date, last_payment_date date)` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
SELECT s.payee_id, s.payee_name, v.phone::text, v.service_type::text, s.item_count, s.total_committed, s.total_paid, s.remaining, s.last_item_date, s.last_payment_date
  FROM public.finance_payable_summary() s JOIN public.vendors v ON v.id = s.payee_id
  WHERE s.payee_type = 'vendor' ORDER BY s.remaining DESC, s.last_item_date ASC;
```
