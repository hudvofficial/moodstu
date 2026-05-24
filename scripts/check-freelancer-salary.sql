-- ═══════════════════════════════════════════════════════════
-- Script kiểm tra và fix Freelancer Salary Issue
-- ═══════════════════════════════════════════════════════════

-- 1. Kiểm tra CTV có trong employees table không
SELECT
  id,
  employee_code,
  full_name,
  role,
  status,
  salary_info,
  deleted_at,
  created_at
FROM employees
WHERE role = 'ctv'
  AND deleted_at IS NULL
ORDER BY created_at DESC;

-- 2. Kiểm tra CTV có status = 'active' không
SELECT
  COUNT(*) as total_ctv,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_ctv,
  COUNT(CASE WHEN status != 'active' OR status IS NULL THEN 1 END) as inactive_ctv
FROM employees
WHERE role = 'ctv'
  AND deleted_at IS NULL;

-- 3. Kiểm tra CTV có base_salary trong salary_info không
SELECT
  employee_code,
  full_name,
  role,
  status,
  (salary_info->>'base_salary')::numeric as base_salary,
  salary_info
FROM employees
WHERE role = 'ctv'
  AND deleted_at IS NULL;

-- 4. Kiểm tra employee_salaries table có CTV không (tháng hiện tại)
SELECT
  es.id,
  es.month,
  es.year,
  e.employee_code,
  e.full_name,
  e.role,
  es.base_salary,
  es.product_salary,
  es.total_salary
FROM employee_salaries es
JOIN employees e ON e.id = es.employee_id
WHERE e.role = 'ctv'
  AND es.month = EXTRACT(MONTH FROM CURRENT_DATE)
  AND es.year = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY e.full_name;

-- ═══════════════════════════════════════════════════════════
-- FIX QUERIES (Run these if issues found)
-- ═══════════════════════════════════════════════════════════

-- Fix 1: Update CTV status to 'active' nếu họ đang làm việc
-- UNCOMMENT AND RUN IF NEEDED:
-- UPDATE employees
-- SET status = 'active',
--     updated_at = NOW()
-- WHERE role = 'ctv'
--   AND deleted_at IS NULL
--   AND (status IS NULL OR status != 'active');

-- Fix 2: Update salary_info nếu chưa có base_salary
-- UNCOMMENT AND CUSTOMIZE, THEN RUN IF NEEDED:
-- UPDATE employees
-- SET salary_info = jsonb_set(
--       COALESCE(salary_info, '{}'::jsonb),
--       '{base_salary}',
--       '0'::jsonb
--     ),
--     updated_at = NOW()
-- WHERE role = 'ctv'
--   AND deleted_at IS NULL
--   AND (salary_info IS NULL OR salary_info->>'base_salary' IS NULL);

-- Fix 3: Verify active employees (both regular and CTV)
SELECT
  role,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
FROM employees
WHERE deleted_at IS NULL
GROUP BY role
ORDER BY role;
