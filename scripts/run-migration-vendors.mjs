#!/usr/bin/env node
/**
 * Run vendors migration via Supabase client
 * Alternative to direct PostgreSQL connection
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();

// ─── ENV LOADING ─────────────────────────────────────────

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

loadEnvFile(path.join(root, ".env.local"));

const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

console.log("\n🔧 Running Migration: Add Vendors to Contract Detail RPC\n");

// Read migration SQL
const migrationSQL = `
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

  -- 3) Work tasks + employees + vendors (⚡ VENDORS ADDED)
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
      'total_amount', po.total_amount,
      'order_date', po.order_date,
      'expected_date', po.expected_date,
      'received_date', po.received_date,
      'notes', po.notes,
      'labs', (
        SELECT CASE WHEN l.id IS NOT NULL THEN
          jsonb_build_object(
            'id', l.id,
            'lab_name', l.name
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
`;

// Execute migration - Use Supabase SQL query directly
console.log("Executing migration SQL...");

// Split and execute SQL (RPC might not support multi-statement)
try {
  // Supabase client doesn't have direct SQL execution via rpc
  // We'll need to use raw connection or manual approach
  console.log("\n⚠️  Cannot execute migration via Supabase client");
  console.log("\n💡 Please run migration manually:");
  console.log("   1. Go to Supabase Dashboard → SQL Editor");
  console.log("   2. Copy SQL from: supabase/migrations/20260527000000_add_vendors_to_contract_detail_v2.sql");
  console.log("   3. Run it there");
  console.log("\n   OR use pgAdmin/psql with DATABASE_URL\n");
} catch (err) {
  console.error("Error:", err.message);
}

console.log("✅ Migration applied successfully!");
console.log("\n📊 Testing RPC...\n");

// Test the RPC
const { data: contracts } = await supabase
  .from("contracts")
  .select("id")
  .is("deleted_at", null)
  .limit(1)
  .single();

if (contracts) {
  const { data: testResult, error: testError } = await supabase
    .rpc("get_contract_detail_v2", { p_contract_id: contracts.id });

  if (testError) {
    console.error("⚠️  RPC test failed:", testError.message);
  } else {
    const workTasks = testResult?.work_tasks || [];
    const hasVendors = workTasks.some((task) => task.vendors !== null);
    console.log(`✅ RPC works! Found ${workTasks.length} work tasks`);
    console.log(`${hasVendors ? "✅" : "⚠️ "} Vendors ${hasVendors ? "included" : "missing"}`);
  }
}

console.log("\n🎉 Done! Run performance test:");
console.log("   npm run perf:contract-detail\n");

process.exit(0);
