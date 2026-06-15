-- Migration to add print_file_url, items, payment_status to RPC contract detail v3

CREATE OR REPLACE FUNCTION public.get_contract_detail_v3(p_contract_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  -- Single massive query to assemble the entire contract payload
  SELECT json_build_object(
    'contract', row_to_json(c),
    -- Expand nested arrays directly
    'events', COALESCE(events_agg.events, '[]'::json),
    'work_tasks', COALESCE(tasks_agg.tasks, '[]'::json),
    'checklists', COALESCE(checklists_agg.items, '[]'::json),
    'payments', COALESCE(payments_agg.payments, '[]'::json),
    'reservations', COALESCE(reservations_agg.reservations, '[]'::json),
    'print_orders', COALESCE(print_orders_agg.orders, '[]'::json),
    'payment_plans', COALESCE(payment_plans_agg.plans, '[]'::json)
  ) INTO result
  FROM (
    SELECT
      c.id, c.contract_code, c.customer_id, c.service_type,
      c.transaction_type, c.contract_date, c.work_date, c.delivery_date,
      c.total_amount, c.discount_amount, c.paid_amount,
      c.remaining_amount, c.status, c.payment_status,
      c.description, c.notes, c.cancel_reason, c.updated_at, c.created_at,
      -- Inline Customer
      (
        SELECT row_to_json(cust)
        FROM (
          SELECT
            cu.id, cu.customer_code, cu.full_name, cu.phone, cu.alt_phone,
            cu.email, cu.address, cu.wedding_date, cu.notes,
            cu.bride_name, cu.groom_name, cu.bride_phone, cu.groom_phone,
            cu.bride_height, cu.bride_weight, cu.bride_shoe_size,
            cu.groom_height, cu.groom_weight, cu.groom_shoe_size
          FROM customers cu
          WHERE cu.id = c.customer_id
        ) cust
      ) as customers,
      -- Inline Contract Items
      (
        SELECT COALESCE(json_agg(row_to_json(ci)), '[]'::json)
        FROM (
          SELECT
            ct.id, ct.type, ct.item_name, ct.service_id, ct.export_type,
            ct.quantity, ct.unit_price, ct.original_price,
            ct.discount_amount, ct.total_amount, ct.is_addon,
            ct.addon_category, ct.dress_id, ct.notes, ct.deleted_at
          FROM contract_items ct
          WHERE ct.contract_id = c.id AND ct.deleted_at IS NULL
        ) ci
      ) as contract_items
    FROM contracts c
    WHERE c.id = p_contract_id AND c.deleted_at IS NULL
  ) c

  -- LATERAL JOIN 2: Events
  LEFT JOIN LATERAL (
    SELECT json_agg(row_to_json(e)) as events
    FROM (
      SELECT
        ce.id, ce.contract_id, ce.event_type, ce.title, ce.event_date, ce.end_date,
        ce.location, ce.status, ce.notes, ce.sort_order, ce.deadline,
        ce.start_time, ce.end_time, ce.is_manual_date, ce.phase,
        ce.sync_to_google, ce.google_event_id, ce.google_sync_status,
        ce.google_sync_error, ce.google_synced_at, ce.deleted_at
      FROM contract_events ce
      WHERE ce.contract_id = c.id AND ce.deleted_at IS NULL
      ORDER BY ce.sort_order ASC
    ) e
  ) events_agg ON true

  -- LATERAL JOIN 3: Work Tasks
  LEFT JOIN LATERAL (
    SELECT json_agg(row_to_json(wt)) as tasks
    FROM (
      SELECT
        w.id, w.event_id, w.contract_id, w.work_type, w.assigned_to, w.vendor_id, w.status, w.deadline,
        w.start_date, w.start_time, w.end_time, w.completion_date, w.cost, w.notes,
        (
          SELECT json_build_object('id', emp.id, 'full_name', emp.full_name, 'avatar_url', emp.avatar_url, 'department', emp.department)
          FROM employees emp WHERE emp.id = w.assigned_to
        ) as employees,
        (
          SELECT json_build_object('id', vnd.id, 'full_name', vnd.full_name, 'phone', vnd.phone)
          FROM vendors vnd WHERE vnd.id = w.vendor_id
        ) as vendors
      FROM work_tasks w
      WHERE w.contract_id = c.id
      ORDER BY w.deadline ASC
    ) wt
  ) tasks_agg ON true

  -- LATERAL JOIN 4: Checklists
  LEFT JOIN LATERAL (
    SELECT json_agg(row_to_json(chk)) as items
    FROM (
      SELECT cc.id, cc.event_stage, cc.category, cc.item_name, cc.is_completed, cc.created_at, cc.updated_at
      FROM contract_checklists cc
      WHERE cc.contract_id = c.id
      ORDER BY cc.created_at ASC
    ) chk
  ) checklists_agg ON true

  -- LATERAL JOIN 5: Payments
  LEFT JOIN LATERAL (
    SELECT json_agg(row_to_json(p)) as payments
    FROM (
      SELECT py.id, py.receipt_code, py.amount, py.payment_method, py.payment_date, py.payment_stage, py.notes, py.created_by, py.created_at
      FROM payments py
      WHERE py.contract_id = c.id AND py.deleted_at IS NULL
      ORDER BY py.created_at DESC
      LIMIT 30
    ) p
  ) payments_agg ON true

  -- LATERAL JOIN 6: Dress Reservations
  LEFT JOIN LATERAL (
    SELECT json_agg(row_to_json(res)) as reservations
    FROM (
      SELECT
        dr.id, dr.status, dr.start_date, dr.end_date, dr.notes,
        (
          SELECT json_build_object('id', d.id, 'name', d.name, 'item_code', d.item_code, 'category', d.category, 'size', d.size, 'color', d.color, 'image_url', d.image_url)
          FROM dresses d WHERE d.id = dr.dress_id
        ) as dresses
      FROM dress_reservations dr
      WHERE dr.contract_id = c.id
      ORDER BY dr.created_at DESC
    ) res
  ) reservations_agg ON true

  -- LATERAL JOIN 7: Printing Orders
  LEFT JOIN LATERAL (
    SELECT json_agg(row_to_json(po_row)) as orders
    FROM (
      SELECT
        po.id, po.order_code, po.status, po.payment_status, po.total_amount, po.items, po.print_file_url, po.order_date, po.expected_date, po.received_date, po.notes,
        (
          SELECT json_build_object('id', l.id, 'name', l.lab_name)
          FROM labs l WHERE l.id = po.lab_id
        ) as labs
      FROM printing_orders po
      WHERE po.contract_id = c.id
      ORDER BY po.created_at DESC
    ) po_row
  ) print_orders_agg ON true

  -- LATERAL JOIN 8: Payment Plans
  LEFT JOIN LATERAL (
    SELECT json_agg(row_to_json(pp_row)) as plans
    FROM (
      SELECT
        pp.id, pp.contract_id, pp.stage_name, pp.stage_key, pp.sort_order, pp.amount, pp.due_date, pp.status, pp.receipt_id, pp.created_at,
        (
          SELECT COALESCE(json_agg(row_to_json(alloc)), '[]'::json)
          FROM (
            SELECT ppa.id, ppa.contract_id, ppa.payment_plan_id, ppa.payment_id, ppa.amount, ppa.created_at, ppa.created_by
            FROM payment_plan_allocations ppa
            WHERE ppa.payment_plan_id = pp.id
          ) alloc
        ) as payment_plan_allocations
      FROM payment_plans pp
      WHERE pp.contract_id = c.id
      ORDER BY pp.sort_order ASC, pp.created_at ASC
    ) pp_row
  ) payment_plans_agg ON true;

  RETURN result;
END;
$function$;


-- Keep default v2 RPC payload aligned with the contract detail printing UI.

-- Migration: Add vendors join to get_contract_detail_v2 RPC
-- Purpose: Eliminate extra vendor query (saves ~450ms)
-- Date: 2026-05-27

CREATE OR REPLACE FUNCTION get_contract_detail_v2(p_contract_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_contract jsonb;
  v_events jsonb;
  v_work_tasks jsonb;
  v_checklists jsonb;
  v_payments jsonb;
  v_reservations jsonb;
  v_print_orders jsonb;
  v_payment_plans jsonb;
BEGIN
  -- 1) Contract + customers + contract_items
  SELECT jsonb_build_object(
      'id', c.id,
      'contract_code', c.contract_code,
      'customer_id', c.customer_id,
      'service_type', c.service_type,
      'transaction_type', c.transaction_type,
      'contract_date', c.contract_date,
      'work_date', c.work_date,
      'delivery_date', c.delivery_date,
      'total_amount', c.total_amount,
      'discount_amount', c.discount_amount,
      'paid_amount', c.paid_amount,
      'remaining_amount', c.remaining_amount,
      'status', c.status,
      'payment_status', c.payment_status,
      'description', c.description,
      'notes', c.notes,
      'cancel_reason', c.cancel_reason,
      'updated_at', c.updated_at,
      'created_at', c.created_at,
      'customers', (
        SELECT jsonb_build_object(
          'id', cust.id,
          'customer_code', cust.customer_code,
          'full_name', cust.full_name,
          'phone', cust.phone,
          'alt_phone', cust.alt_phone,
          'email', cust.email,
          'address', cust.address,
          'wedding_date', cust.wedding_date,
          'notes', cust.notes,
          'bride_name', cust.bride_name,
          'groom_name', cust.groom_name,
          'bride_phone', cust.bride_phone,
          'groom_phone', cust.groom_phone,
          'bride_height', cust.bride_height,
          'bride_weight', cust.bride_weight,
          'bride_shoe_size', cust.bride_shoe_size,
          'groom_height', cust.groom_height,
          'groom_weight', cust.groom_weight,
          'groom_shoe_size', cust.groom_shoe_size
        )
        FROM customers cust
        WHERE cust.id = c.customer_id
      ),
      'contract_items', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', ci.id,
          'type', ci.type,
          'item_name', ci.item_name,
          'service_id', ci.service_id,
          'export_type', ci.export_type,
          'quantity', ci.quantity,
          'unit_price', ci.unit_price,
          'original_price', ci.original_price,
          'discount_amount', ci.discount_amount,
          'total_amount', ci.total_amount,
          'is_addon', ci.is_addon,
          'addon_category', ci.addon_category,
          'dress_id', ci.dress_id,
          'notes', ci.notes,
          'deleted_at', ci.deleted_at
        ))
        FROM contract_items ci
        WHERE ci.contract_id = c.id AND ci.deleted_at IS NULL
      ), '[]'::jsonb)
  ) INTO v_contract
  FROM contracts c
  WHERE c.id = p_contract_id AND c.deleted_at IS NULL;

  -- Nếu không tìm thấy hợp đồng, trả về null
  IF v_contract IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2) Events
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', e.id,
      'contract_id', e.contract_id,
      'event_type', e.event_type,
      'title', e.title,
      'event_date', e.event_date,
      'end_date', e.end_date,
      'location', e.location,
      'status', e.status,
      'notes', e.notes,
      'sort_order', e.sort_order,
      'deadline', e.deadline,
      'start_time', e.start_time,
      'end_time', e.end_time,
      'is_manual_date', e.is_manual_date,
      'phase', e.phase,
      'sync_to_google', e.sync_to_google,
      'google_event_id', e.google_event_id,
      'google_sync_status', e.google_sync_status,
      'google_sync_error', e.google_sync_error,
      'google_synced_at', e.google_synced_at,
      'deleted_at', e.deleted_at
  ) ORDER BY e.sort_order ASC), '[]'::jsonb)
  INTO v_events
  FROM contract_events e
  WHERE e.contract_id = p_contract_id AND e.deleted_at IS NULL;

  -- 3) Work tasks + employees + vendors (⚡ FIX: Added vendors join)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', wt.id,
      'event_id', wt.event_id,
      'contract_id', wt.contract_id,
      'work_type', wt.work_type,
      'assigned_to', wt.assigned_to,
      'vendor_id', wt.vendor_id,
      'status', wt.status,
      'deadline', wt.deadline,
      'start_date', wt.start_date,
      'start_time', wt.start_time,
      'end_time', wt.end_time,
      'completion_date', wt.completion_date,
      'cost', wt.cost,
      'notes', wt.notes,
      'employees', (
        SELECT CASE WHEN emp.id IS NOT NULL THEN
          jsonb_build_object(
            'id', emp.id,
            'full_name', emp.full_name,
            'avatar_url', emp.avatar_url,
            'department', emp.department
          )
        ELSE NULL END
        FROM employees emp
        WHERE emp.id = wt.assigned_to
      ),
      'vendors', (
        SELECT CASE WHEN v.id IS NOT NULL THEN
          jsonb_build_object(
            'id', v.id,
            'full_name', v.full_name,
            'phone', v.phone
          )
        ELSE NULL END
        FROM vendors v
        WHERE v.id = wt.vendor_id
      )
  ) ORDER BY wt.deadline ASC), '[]'::jsonb)
  INTO v_work_tasks
  FROM work_tasks wt
  WHERE wt.contract_id = p_contract_id;

  -- 4) Checklists
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', cl.id,
      'event_stage', cl.event_stage,
      'category', cl.category,
      'item_name', cl.item_name,
      'is_completed', cl.is_completed,
      'created_at', cl.created_at,
      'updated_at', cl.updated_at
  ) ORDER BY cl.created_at ASC), '[]'::jsonb)
  INTO v_checklists
  FROM contract_checklists cl
  WHERE cl.contract_id = p_contract_id;

  -- 5) Payments
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'receipt_code', p.receipt_code,
      'amount', p.amount,
      'payment_method', p.payment_method,
      'payment_date', p.payment_date,
      'payment_stage', p.payment_stage,
      'notes', p.notes,
      'created_by', p.created_by,
      'created_at', p.created_at
  )), '[]'::jsonb)
  INTO v_payments
  FROM (
      SELECT * FROM payments
      WHERE contract_id = p_contract_id AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 30
  ) p;

  -- 6) Dress reservations
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', dr.id,
      'status', dr.status,
      'start_date', dr.start_date,
      'end_date', dr.end_date,
      'notes', dr.notes,
      'dresses', (
        SELECT CASE WHEN d.id IS NOT NULL THEN
          jsonb_build_object(
            'id', d.id,
            'name', d.name,
            'item_code', d.item_code,
            'category', d.category,
            'size', d.size,
            'color', d.color,
            'image_url', d.image_url
          )
        ELSE NULL END
        FROM dresses d
        WHERE d.id = dr.dress_id
      )
  ) ORDER BY dr.created_at DESC), '[]'::jsonb)
  INTO v_reservations
  FROM dress_reservations dr
  WHERE dr.contract_id = p_contract_id;

  -- 7) Printing orders
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', po.id,
      'order_code', po.order_code,
      'status', po.status,
      'payment_status', po.payment_status,
      'total_amount', po.total_amount,
      'items', po.items,
      'print_file_url', po.print_file_url,
      'order_date', po.order_date,
      'expected_date', po.expected_date,
      'received_date', po.received_date,
      'notes', po.notes,
      'labs', (
        SELECT CASE WHEN l.id IS NOT NULL THEN
          jsonb_build_object(
            'id', l.id,
            'name', l.lab_name
          )
        ELSE NULL END
        FROM labs l
        WHERE l.id = po.lab_id
      )
  ) ORDER BY po.created_at DESC), '[]'::jsonb)
  INTO v_print_orders
  FROM printing_orders po
  WHERE po.contract_id = p_contract_id;

  -- 8) Payment plans
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', pp.id,
      'contract_id', pp.contract_id,
      'stage_name', pp.stage_name,
      'stage_key', pp.stage_key,
      'sort_order', pp.sort_order,
      'amount', pp.amount,
      'due_date', pp.due_date,
      'status', pp.status,
      'receipt_id', pp.receipt_id,
      'created_at', pp.created_at,
      'payment_plan_allocations', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', ppa.id,
          'contract_id', ppa.contract_id,
          'payment_plan_id', ppa.payment_plan_id,
          'payment_id', ppa.payment_id,
          'amount', ppa.amount,
          'created_at', ppa.created_at,
          'created_by', ppa.created_by
        ))
        FROM payment_plan_allocations ppa
        WHERE ppa.payment_plan_id = pp.id
      ), '[]'::jsonb)
  ) ORDER BY pp.sort_order ASC, pp.created_at ASC), '[]'::jsonb)
  INTO v_payment_plans
  FROM payment_plans pp
  WHERE pp.contract_id = p_contract_id;

  -- Assemble final object
  RETURN jsonb_build_object(
      'contract', v_contract,
      'events', v_events,
      'work_tasks', v_work_tasks,
      'checklists', v_checklists,
      'payments', v_payments,
      'reservations', v_reservations,
      'print_orders', v_print_orders,
      'payment_plans', v_payment_plans
  );
END;
$$;

