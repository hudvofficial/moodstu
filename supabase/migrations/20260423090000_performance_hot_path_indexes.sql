-- Supplemental performance indexes for hot operational paths.
-- Safe to run repeatedly and resilient to partially deployed schemas.

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
  -- Contracts: list filters, customer drilldowns, assignment, and financial status.
  IF pg_temp.has_columns('contracts', 'deleted_at', 'customer_id', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contracts_active_customer_created_desc ON public.contracts(customer_id, created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('contracts', 'deleted_at', 'assigned_to', 'work_date') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contracts_active_assigned_work_date ON public.contracts(assigned_to, work_date ASC) WHERE deleted_at IS NULL AND assigned_to IS NOT NULL';
  END IF;

  IF pg_temp.has_columns('contracts', 'deleted_at', 'payment_status', 'contract_date') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contracts_active_payment_status_date_desc ON public.contracts(payment_status, contract_date DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('contracts', 'deleted_at', 'service_type', 'contract_date') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contracts_active_service_type_date_desc ON public.contracts(service_type, contract_date DESC) WHERE deleted_at IS NULL';
  END IF;

  -- CRM: list filters, Kanban moves, assignment filters, and text search.
  IF pg_temp.has_columns('crm_leads', 'deleted_at', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_crm_leads_active_created_desc ON public.crm_leads(created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('crm_leads', 'deleted_at', 'status', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_crm_leads_active_status_created_desc ON public.crm_leads(status, created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('crm_leads', 'deleted_at', 'source', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_crm_leads_active_source_created_desc ON public.crm_leads(source, created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('crm_leads', 'deleted_at', 'assigned_to', 'status') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_crm_leads_active_assigned_status ON public.crm_leads(assigned_to, status) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('crm_leads', 'deleted_at', 'next_contact_date') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_crm_leads_active_next_contact_date ON public.crm_leads(next_contact_date ASC) WHERE deleted_at IS NULL AND next_contact_date IS NOT NULL';
  END IF;

  IF pg_temp.has_columns('crm_leads', 'deleted_at', 'contact_name') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_crm_leads_contact_name_trgm ON public.crm_leads USING gin(contact_name gin_trgm_ops) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('crm_leads', 'deleted_at', 'phone') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_crm_leads_phone_trgm ON public.crm_leads USING gin(phone gin_trgm_ops) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('customers', 'deleted_at', 'phone') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_customers_active_phone_trgm ON public.customers USING gin(phone gin_trgm_ops) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('customers', 'deleted_at', 'email') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_customers_active_email_trgm ON public.customers USING gin(email gin_trgm_ops) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('customers', 'deleted_at', 'customer_code') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_customers_active_customer_code_trgm ON public.customers USING gin(customer_code gin_trgm_ops) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('customers', 'deleted_at', 'source', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_customers_active_source_created_desc ON public.customers(source, created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  -- Work/task and payment paths used by contract detail, productivity, and dashboards.
  IF pg_temp.has_columns('work_tasks', 'assigned_to', 'status', 'deadline') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_work_tasks_assigned_status_deadline ON public.work_tasks(assigned_to, status, deadline ASC) WHERE assigned_to IS NOT NULL';
  END IF;

  IF pg_temp.has_columns('work_tasks', 'status', 'deadline') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_work_tasks_status_deadline ON public.work_tasks(status, deadline ASC)';
  END IF;

  IF pg_temp.has_columns('payment_plans', 'status', 'due_date') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_payment_plans_status_due_date ON public.payment_plans(status, due_date ASC) WHERE due_date IS NOT NULL';
  END IF;

  IF pg_temp.has_columns('payment_plans', 'contract_id', 'status', 'due_date') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_payment_plans_contract_status_due_date ON public.payment_plans(contract_id, status, due_date ASC)';
  END IF;

  -- Printing operations and lab debt views.
  IF pg_temp.has_columns('printing_orders', 'deleted_at', 'status', 'order_date') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_printing_orders_active_status_order_date ON public.printing_orders(status, order_date DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('printing_orders', 'deleted_at', 'payment_status', 'order_date') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_printing_orders_active_payment_status_order_date ON public.printing_orders(payment_status, order_date DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('printing_orders', 'deleted_at', 'lab_id', 'payment_status') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_printing_orders_active_lab_payment_status ON public.printing_orders(lab_id, payment_status) WHERE deleted_at IS NULL AND lab_id IS NOT NULL';
  END IF;

  -- Dress reservations/rentals for contract sync and inventory availability.
  IF pg_temp.has_columns('dress_reservations', 'dress_id', 'status', 'start_date', 'end_date') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_dress_reservations_dress_status_dates ON public.dress_reservations(dress_id, status, start_date ASC, end_date ASC)';
  END IF;

  IF pg_temp.has_columns('dress_reservations', 'customer_id', 'start_date') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_dress_reservations_customer_start_date ON public.dress_reservations(customer_id, start_date DESC) WHERE customer_id IS NOT NULL';
  END IF;

  IF pg_temp.has_columns('dress_rentals', 'item_id', 'status', 'pickup_date', 'return_date') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_dress_rentals_item_status_dates ON public.dress_rentals(item_id, status, pickup_date ASC, return_date ASC)';
  END IF;

  IF pg_temp.has_columns('dress_rentals', 'contract_id', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_dress_rentals_contract_created_desc ON public.dress_rentals(contract_id, created_at DESC) WHERE contract_id IS NOT NULL';
  END IF;
END $$;
