-- Migration: Add index on employees.auth_user_id for contract access checks
-- Used by: requireContractAccess → getEmployeeByAuthUserId
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id 
  ON public.employees(auth_user_id) 
  WHERE deleted_at IS NULL;
