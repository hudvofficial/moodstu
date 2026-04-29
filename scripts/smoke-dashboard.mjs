import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const timestamp = Date.now();
const marker = `smoke-dashboard-${timestamp}`;

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function cleanup(client, ids) {
  if (ids.taskId) await client.from("work_tasks").delete().eq("id", ids.taskId);
  if (ids.scheduleId) await client.from("schedules").delete().eq("id", ids.scheduleId);
  if (ids.paymentPlanId) await client.from("payment_plans").delete().eq("id", ids.paymentPlanId);
  if (ids.eventId) await client.from("contract_events").delete().eq("id", ids.eventId);
  if (ids.receiptId) await client.from("receipts").delete().eq("id", ids.receiptId);
  if (ids.paymentId) await client.from("payments").delete().eq("id", ids.paymentId);
  if (ids.contractId) await client.from("contracts").delete().eq("id", ids.contractId);
  if (ids.customerId) await client.from("customers").delete().eq("id", ids.customerId);
}

loadEnvFile(path.join(root, ".env.local"));

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const serviceClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const today = new Date().toISOString().slice(0, 10);
const future = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
const ids = {};

try {
  console.log("Seeding dashboard smoke records...");

  const { data: employee, error: employeeError } = await serviceClient
    .from("employees")
    .select("id")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (employeeError) throw new Error(`Cannot query active employee: ${employeeError.message}`);
  assert(employee?.id, "No active employee available for dashboard smoke");

  const { data: customer, error: customerError } = await serviceClient
    .from("customers")
    .insert({
      customer_code: `SMK-DASH-CUS-${timestamp}`,
      full_name: `Dashboard Smoke ${marker}`,
      phone: "0901234567",
      bride_name: `Bride ${marker}`,
      groom_name: `Groom ${marker}`,
      status: "active",
      notes: marker,
    })
    .select("id")
    .single();
  if (customerError || !customer) {
    throw new Error(`Cannot create smoke customer: ${customerError?.message || "missing row"}`);
  }
  ids.customerId = customer.id;

  const { data: contract, error: contractError } = await serviceClient
    .from("contracts")
    .insert({
      contract_code: `SMK-DASH-HD-${timestamp}`,
      customer_id: ids.customerId,
      contract_date: today,
      work_date: future,
      delivery_date: future,
      service_type: "studio",
      transaction_type: "hop_dong",
      status: "hoan_thanh",
      payment_status: "thanh_toan_mot_phan",
      total_amount: 2000000,
      paid_amount: 500000,
      remaining_amount: 1500000,
      updated_at: new Date().toISOString(),
      notes: marker,
    })
    .select("id, contract_code")
    .single();
  if (contractError || !contract) {
    throw new Error(`Cannot create smoke contract: ${contractError?.message || "missing row"}`);
  }
  ids.contractId = contract.id;

  const { data: payment, error: paymentError } = await serviceClient
    .from("payments")
    .insert({
      contract_id: ids.contractId,
      customer_id: ids.customerId,
      amount: 500000,
      payment_date: today,
      payment_method: "tien_mat",
      payment_stage: "dashboard-smoke",
      notes: marker,
    })
    .select("id")
    .single();
  if (paymentError || !payment) {
    throw new Error(`Cannot create smoke payment: ${paymentError?.message || "missing row"}`);
  }
  ids.paymentId = payment.id;

  const { data: receipt, error: receiptError } = await serviceClient
    .from("receipts")
    .insert({
      receipt_date: today,
      receipt_type: "standalone",
      payment_type: "tien_mat",
      receipt_amount: 300000,
      contract_id: null,
      customer_name: `Dashboard Smoke ${marker}`,
      status: "confirmed",
      notes: marker,
    })
    .select("id")
    .single();
  if (receiptError || !receipt) {
    throw new Error(`Cannot create smoke receipt: ${receiptError?.message || "missing row"}`);
  }
  ids.receiptId = receipt.id;

  const { data: event, error: eventError } = await serviceClient
    .from("contract_events")
    .insert({
      contract_id: ids.contractId,
      event_type: "ngay_chup",
      event_date: future,
      status: "chua_lam",
      title: "Dashboard smoke shoot",
    })
    .select("id")
    .single();
  if (eventError || !event) {
    throw new Error(`Cannot create smoke event: ${eventError?.message || "missing row"}`);
  }
  ids.eventId = event.id;

  const { data: paymentPlan, error: paymentPlanError } = await serviceClient
    .from("payment_plans")
    .insert({
      contract_id: ids.contractId,
      stage_name: "Dashboard smoke due stage",
      amount: 700000,
      due_date: today,
      status: "pending",
    })
    .select("id")
    .single();
  if (paymentPlanError || !paymentPlan) {
    throw new Error(`Cannot create smoke payment plan: ${paymentPlanError?.message || "missing row"}`);
  }
  ids.paymentPlanId = paymentPlan.id;

  const { data: schedule, error: scheduleError } = await serviceClient
    .from("schedules")
    .insert({
      event_type: "dashboard-smoke-schedule",
      event_date: future,
      employee_id: employee.id,
      contract_id: ids.contractId,
      status: "scheduled",
      color_id: "blue",
    })
    .select("id")
    .single();
  if (scheduleError || !schedule) {
    throw new Error(`Cannot create smoke schedule: ${scheduleError?.message || "missing row"}`);
  }
  ids.scheduleId = schedule.id;

  const { data: task, error: taskError } = await serviceClient
    .from("work_tasks")
    .insert({
      contract_id: ids.contractId,
      assigned_to: employee.id,
      work_type: "concept",
      deadline: future,
      status: "chua_lam",
      notes: marker,
    })
    .select("id")
    .single();
  if (taskError || !task) {
    throw new Error(`Cannot create smoke work task: ${taskError?.message || "missing row"}`);
  }
  ids.taskId = task.id;

  console.log("Checking dashboard source queries...");

  const { data: payments, error: paymentsError } = await serviceClient
    .from("payments")
    .select("amount")
    .eq("notes", marker)
    .is("deleted_at", null);
  if (paymentsError) throw new Error(`Payment source query failed: ${paymentsError.message}`);
  assert(
    (payments || []).reduce((sum, row) => sum + Number(row.amount || 0), 0) === 500000,
    "Dashboard payment source did not return seeded payment",
  );

  const { data: receipts, error: receiptsError } = await serviceClient
    .from("receipts")
    .select("receipt_amount, contract_id")
    .eq("notes", marker)
    .is("deleted_at", null)
    .is("contract_id", null);
  if (receiptsError) throw new Error(`Receipt source query failed: ${receiptsError.message}`);
  assert(
    (receipts || []).reduce((sum, row) => sum + Number(row.receipt_amount || 0), 0) === 300000,
    "Dashboard standalone receipt source did not return seeded receipt",
  );

  const { data: debts, error: debtError } = await serviceClient
    .from("contracts")
    .select("remaining_amount")
    .eq("id", ids.contractId)
    .is("deleted_at", null)
    .neq("status", "da_huy")
    .gt("remaining_amount", 0);
  if (debtError) throw new Error(`Debt source query failed: ${debtError.message}`);
  assert(Number(debts?.[0]?.remaining_amount || 0) === 1500000, "Dashboard debt source missed seeded contract");

  const { data: events, error: eventsError } = await serviceClient
    .from("contract_events")
    .select("id, contracts!inner(id, deleted_at, status)")
    .eq("id", ids.eventId)
    .is("deleted_at", null)
    .is("contracts.deleted_at", null)
    .neq("contracts.status", "da_huy");
  if (eventsError) throw new Error(`Upcoming event source query failed: ${eventsError.message}`);
  assert(events?.length === 1, "Dashboard upcoming event source missed seeded event");

  const { data: schedules, error: schedulesError } = await serviceClient
    .from("schedules")
    .select("id, contract_id")
    .eq("id", ids.scheduleId)
    .gte("event_date", today)
    .lt("event_date", new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10));
  if (schedulesError) throw new Error(`Schedule source query failed: ${schedulesError.message}`);
  assert(schedules?.length === 1, "Dashboard schedule source missed seeded schedule");

  const { data: tasks, error: tasksError } = await serviceClient
    .from("work_tasks")
    .select("id, contract_id")
    .eq("id", ids.taskId)
    .neq("status", "da_huy")
    .or(`and(deadline.gte.${today},deadline.lt.${new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10)}),and(deadline.is.null,start_date.gte.${today},start_date.lt.${new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10)})`);
  if (tasksError) throw new Error(`Work task source query failed: ${tasksError.message}`);
  assert(tasks?.length === 1, "Dashboard work task source missed seeded task");

  const { data: plans, error: plansError } = await serviceClient
    .from("payment_plans")
    .select("id, amount, due_date, status, contracts!inner(id, deleted_at, status)")
    .eq("id", ids.paymentPlanId)
    .not("due_date", "is", null)
    .is("contracts.deleted_at", null)
    .neq("contracts.status", "da_huy");
  if (plansError) throw new Error(`Payment plan reminder query failed: ${plansError.message}`);
  assert(plans?.length === 1 && Number(plans[0].amount || 0) === 700000, "Dashboard payment plan reminder missed seeded plan");

  console.log("Dashboard seeded smoke passed.");
} finally {
  await cleanup(serviceClient, ids);
}
