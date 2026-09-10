-- Quét rác test trên prod (CHỈ ĐỌC). Chạy sau MỖI lần e2e/jest live/probe: node scripts/db-q.mjs "$(cat scripts/sweep-e2e-residue.sql)"  → mọi n phải = 0 (trừ realtime_signals = ring buffer tín hiệu thật).
-- 10/09/2026: chủ bắt rác sót 2 tuần vì sweep cũ chỉ quét department=E2E. Sửa cả tests/e2e/e2e-sweep.ts.
SELECT 'auth.users' b, count(*) n FROM auth.users WHERE email ILIKE '%@test.local' OR email ILIKE '%e2e%' OR email ILIKE '%probe%'
UNION ALL SELECT 'employees', count(*) FROM employees WHERE department IN ('E2E','PERF') OR employee_code ILIKE 'E2E%' OR employee_code ILIKE 'PERF%' OR full_name ILIKE 'E2E%' OR full_name ILIKE '%probe%' OR full_name ILIKE 'TMP %'
UNION ALL SELECT 'customers', count(*) FROM customers WHERE full_name ILIKE 'E2E%' OR customer_code ILIKE 'E2E%' OR full_name ILIKE '%bulk%'
UNION ALL SELECT 'contracts', count(*) FROM contracts WHERE contract_code ILIKE 'E2E%' OR contract_code ILIKE 'R1-%' OR contract_code ILIKE 'R2-%' OR contract_code ILIKE '%TEST%' OR contract_code ILIKE '%BULK%'
UNION ALL SELECT 'contract_events(mo coi)', count(*) FROM contract_events WHERE contract_id NOT IN (SELECT id FROM contracts)
UNION ALL SELECT 'work_tasks(mo coi)', count(*) FROM work_tasks WHERE contract_id NOT IN (SELECT id FROM contracts)
UNION ALL SELECT 'printing_orders', count(*) FROM printing_orders WHERE order_code ILIKE 'E2E%' OR order_code ILIKE 'R1-%' OR contract_id NOT IN (SELECT id FROM contracts)
UNION ALL SELECT 'expenses', count(*) FROM expenses WHERE description ILIKE 'E2E%' OR description ILIKE 'R2 TEST%'
UNION ALL SELECT 'expense_allocations(mo coi)', count(*) FROM expense_allocations a WHERE NOT EXISTS (SELECT 1 FROM expenses e WHERE e.id=a.expense_id)
UNION ALL SELECT 'payments(mo coi)', count(*) FROM payments WHERE contract_id NOT IN (SELECT id FROM contracts)
UNION ALL SELECT 'receipts', count(*) FROM receipts WHERE notes ILIKE 'E2E%' OR customer_name ILIKE 'E2E%' OR contract_code ILIKE 'E2E%'
UNION ALL SELECT 'labs', count(*) FROM labs WHERE lab_name ILIKE 'E2E%'
UNION ALL SELECT 'vendors', count(*) FROM vendors WHERE full_name ILIKE 'E2E%'
UNION ALL SELECT 'inventory_items', count(*) FROM inventory_items WHERE item_code ILIKE 'E2E%' OR name ILIKE 'E2E%'
UNION ALL SELECT 'inventory_transactions(mo coi)', count(*) FROM inventory_transactions WHERE item_id NOT IN (SELECT id FROM inventory_items)
UNION ALL SELECT 'dresses', count(*) FROM dresses WHERE name ILIKE 'E2E%'
UNION ALL SELECT 'dress_reservations(mo coi)', count(*) FROM dress_reservations WHERE contract_id NOT IN (SELECT id FROM contracts)
UNION ALL SELECT 'schedules', count(*) FROM schedules WHERE notes ILIKE 'E2E%' OR location ILIKE 'E2E%'
UNION ALL SELECT 'crm_leads', count(*) FROM crm_leads WHERE contact_name ILIKE 'E2E%'
UNION ALL SELECT 'galleries(mo coi)', count(*) FROM galleries WHERE contract_id NOT IN (SELECT id FROM contracts)
UNION ALL SELECT 'services', count(*) FROM services WHERE name ILIKE 'E2E%'
-- 10/09 (lần 2): 13.622 dòng audit của seed E2E có description NULL → phải nhìn vào new_data/old_data (mã HĐ/khách/tên E2E%), không chỉ description.
UNION ALL SELECT 'audit_logs(E2E)', count(*) FROM audit_logs WHERE description ILIKE '%E2E%'
  OR coalesce(new_data->>'contract_code', old_data->>'contract_code', new_data->>'customer_code', old_data->>'customer_code', new_data->>'full_name', old_data->>'full_name', new_data->>'contact_name', old_data->>'contact_name', new_data->>'employee_code', old_data->>'employee_code', new_data->>'name', old_data->>'name', '') ILIKE 'E2E%'
UNION ALL SELECT 'realtime_signals', count(*) FROM realtime_signals
ORDER BY 2 DESC, 1
