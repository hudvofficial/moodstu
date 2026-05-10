-- Reduce statement-timeout risk on server-rendered hot paths reported by Sentry.
-- Targets:
-- - auth employee context lookup
-- - dresses list/stat page
-- - inventory list/stat page

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION pg_temp.has_columns(p_table text, VARIADIC p_columns text[])
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT to_regclass('public.' || p_table) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(p_columns) AS requested(column_name)
      WHERE NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = p_table
          AND column_name = requested.column_name
      )
    );
$$;

DO $$
BEGIN
  IF pg_temp.has_columns('employees', 'auth_user_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id ON public.employees(auth_user_id) WHERE auth_user_id IS NOT NULL';
  END IF;

  IF pg_temp.has_columns('employees', 'auth_user_id', 'deleted_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id_active ON public.employees(auth_user_id) WHERE auth_user_id IS NOT NULL AND deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('dresses', 'deleted_at', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_dresses_active_created_desc ON public.dresses(created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('dresses', 'deleted_at', 'status', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_dresses_active_status_created_desc ON public.dresses(status, created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('dresses', 'deleted_at', 'category', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_dresses_active_category_created_desc ON public.dresses(category, created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('dresses', 'deleted_at', 'rental_price', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_dresses_active_rental_price_created_desc ON public.dresses(rental_price, created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('dresses', 'deleted_at', 'name', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_dresses_active_name_created_desc ON public.dresses(name, created_at DESC) WHERE deleted_at IS NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_dresses_name_trgm ON public.dresses USING gin(name gin_trgm_ops) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('dresses', 'deleted_at', 'item_code') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_dresses_item_code_trgm ON public.dresses USING gin(item_code gin_trgm_ops) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('inventory_items', 'deleted_at', 'status', 'current_stock', 'min_stock') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_inventory_items_active_status_stock ON public.inventory_items(status, current_stock, min_stock) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('inventory_items', 'deleted_at', 'average_unit_price', 'current_stock') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_inventory_items_active_value_scan ON public.inventory_items(current_stock, average_unit_price) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('inventory_transactions', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_desc ON public.inventory_transactions(created_at DESC)';
  END IF;
END $$;
