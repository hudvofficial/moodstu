// Verify E2E migration 20260610130000 (realtime_signals — pattern Signal ≠ Data):
// mutate 8 bảng nguồn → trigger emit signal → subscriber AUTHENTICATED (role thấp
// nhất: ctv) nhận INSERT event trên realtime_signals; subscriber ANON nhận 0.
// Quy tắc A15 (event thật end-to-end) + A12 (verify bằng request authenticated thật).
//
// Cách chạy: node scripts/verify-realtime-signals.mjs
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SOURCE_TABLES = [
  "dresses",
  "dress_rentals",
  "inventory_items",
  "inventory_transactions",
  "services",
  "service_categories",
  "studio_info",
  "employees",
  // Finance (migration 20260610140000 — FinanceRealtimeRefresh)
  "expenses",
  "debts",
  "fixed_costs",
  "financial_goals",
  "budgets",
  "investments",
  "vendor_payments",
  "monthly_salaries",
  "transaction_categories",
];

// Bảng có row-trigger side effect (audit log...) → chỉ phantom touch (UPDATE
// khớp 0 row): statement trigger vẫn fire, row trigger KHÔNG fire → 0 noise.
const PHANTOM_ONLY = new Set([
  "expenses",
  "debts",
  "fixed_costs",
  "financial_goals",
  "budgets",
  "investments",
  "vendor_payments",
  "monthly_salaries",
  "transaction_categories",
]);
const marker = `verify-signals-${Date.now()}`;
const EVENT_WAIT_MS = 15_000;

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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(check, label, waitMs = 20_000) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < waitMs) {
    try {
      const result = await check();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(`${label} timed out${lastError ? `: ${lastError.message}` : ""}`);
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const serviceClient = createClient(url, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const state = { userId: null, employeeId: null, channels: [] };

// Role THẤP NHẤT (ctv): signals chỉ cần is_active_employee() — mọi staff active
// đều phải nhận tín hiệu, không phụ thuộc role.
async function createTempCtv() {
  const email = `${marker}@example.invalid`;
  const password = `VerifySignals-${Date.now()}!`;
  const { data: userData, error: userError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "viewer" },
    user_metadata: { full_name: "Verify Signals QA" },
  });
  if (userError || !userData.user) {
    throw new Error(`Cannot create temp auth user: ${userError?.message || "missing user"}`);
  }
  state.userId = userData.user.id;

  const employee = await waitFor(async () => {
    const { data } = await serviceClient
      .from("employees")
      .select("id")
      .eq("auth_user_id", state.userId)
      .maybeSingle();
    return data;
  }, "trigger-provisioned employees row", 8_000).catch(() => null);

  if (employee) {
    state.employeeId = employee.id;
    const { error } = await serviceClient
      .from("employees")
      .update({ role: "ctv", status: "active" })
      .eq("id", employee.id);
    if (error) throw new Error(`Cannot set temp employee role: ${error.message}`);
  } else {
    const { data: code, error: codeError } = await serviceClient.rpc("next_employee_code");
    if (codeError) throw new Error(`next_employee_code failed: ${codeError.message}`);
    const { data: inserted, error: insertError } = await serviceClient
      .from("employees")
      .insert({
        auth_user_id: state.userId,
        employee_code: code,
        full_name: "Verify Signals QA",
        email,
        department: "QA",
        position: "Verify Signals",
        role: "ctv",
        status: "active",
        start_date: new Date().toISOString().slice(0, 10),
        salary_info: { base_salary: 1, bank_name: "QA Bank" },
      })
      .select("id")
      .single();
    if (insertError || !inserted) {
      throw new Error(`Cannot insert temp employee: ${insertError?.message || "missing row"}`);
    }
    state.employeeId = inserted.id;
  }
  return { email, password };
}

// Subscribe ĐÚNG HỆT cách app subscribe (useRealtimeSignal: 1 channel/bảng filter
// table_name=eq.X; inventory: 1 channel filter in.(...) như useRealtimeMulti).
// filters = undefined → 1 channel không filter (dùng cho anon, phủ rộng nhất).
function subscribeSignals(client, label, sink, filters) {
  const channelFilters = filters ?? [undefined];
  const promises = channelFilters.map((filter, index) => {
    const channel = client.channel(`${marker}-${label}-${index}`);
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "realtime_signals", filter },
      (payload) => {
        const tableName = payload.new?.table_name;
        if (tableName) {
          sink.add(tableName);
          console.log(`  [${label}] signal: ${tableName} (op=${payload.new?.op})`);
        }
      },
    );
    state.channels.push({ client, channel });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`${label} subscribe timed out (filter=${filter})`)),
        15_000,
      );
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timer);
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timer);
          reject(new Error(`${label} channel status=${status} (filter=${filter})`));
        }
      });
    });
  });
  return Promise.all(promises);
}

// Bộ filter app đang dùng thật (useRealtimeSignal + useRealtimeMulti inventory)
const APP_FILTERS = [
  "table_name=eq.dresses",
  "table_name=eq.dress_rentals",
  "table_name=eq.services",
  "table_name=eq.service_categories",
  "table_name=eq.studio_info",
  "table_name=eq.employees",
  "table_name=in.(inventory_items,inventory_transactions)",
  // FinanceRealtimeRefresh (finance-realtime-refresh.tsx)
  "table_name=in.(expenses,debts,fixed_costs,financial_goals,budgets,investments,vendor_payments,monthly_salaries,transaction_categories)",
];

async function touchOneRow(table) {
  let row = null;
  if (!PHANTOM_ONLY.has(table)) {
    const { data, error: pickError } = await serviceClient
      .from(table)
      .select("id")
      .limit(1)
      .maybeSingle();
    if (pickError) throw new Error(`pick row ${table}: ${pickError.message}`);
    row = data;
  }
  // Bảng rỗng / PHANTOM_ONLY: UPDATE khớp 0 row — statement trigger VẪN fire
  // (signal "ma"), đủ verify chuỗi trigger → publication → subscriber,
  // row trigger (audit...) không fire → không side effect.
  const targetId = row?.id ?? "00000000-0000-0000-0000-000000000000";
  const { error: touchError } = await serviceClient
    .from(table)
    .update({ id: targetId })
    .eq("id", targetId);
  if (touchError) throw new Error(`touch ${table}: ${touchError.message}`);
  return true;
}

async function cleanup() {
  for (const { client, channel } of state.channels) {
    try {
      await client.removeChannel(channel);
    } catch {
      // best-effort
    }
  }
  if (state.employeeId) {
    await serviceClient.from("notification_preferences").delete().eq("employee_id", state.employeeId);
    await serviceClient.from("employees").delete().eq("id", state.employeeId);
  }
  if (state.userId) {
    await serviceClient.auth.admin.deleteUser(state.userId);
  }
}

async function main() {
  console.log("1/5 Tạo temp user role ctv (thấp nhất)...");
  const creds = await createTempCtv();

  console.log("2/5 Đăng nhập authenticated client + subscribe realtime_signals...");
  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signIn, error: signInError } = await authClient.auth.signInWithPassword(creds);
  if (signInError || !signIn.session) {
    throw new Error(`Sign-in failed: ${signInError?.message || "no session"}`);
  }
  await authClient.realtime.setAuth(signIn.session.access_token);

  const authEvents = new Set();
  const anonEvents = new Set();
  await subscribeSignals(authClient, "authenticated-ctv", authEvents, APP_FILTERS);

  console.log("3/5 Subscribe anon client (kỳ vọng 0 event)...");
  const anonClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await subscribeSignals(anonClient, "anon", anonEvents);

  await delay(2_000);

  console.log("4/5 UPDATE no-op từng bảng nguồn qua service role...");
  const touched = [];
  const empty = [];
  for (const table of SOURCE_TABLES) {
    if (await touchOneRow(table)) touched.push(table);
    else empty.push(table);
  }
  if (empty.length > 0) {
    console.log(`  SKIP (bảng rỗng): ${empty.join(", ")}`);
  }

  console.log(`5/5 Chờ signal (tối đa ${EVENT_WAIT_MS / 1000}s)...`);
  const deadline = Date.now() + EVENT_WAIT_MS;
  while (Date.now() < deadline && !touched.every((t) => authEvents.has(t))) {
    await delay(300);
  }

  const missing = touched.filter((t) => !authEvents.has(t));
  console.log("");
  console.log(`ctv nhận signal:  [${[...authEvents].join(", ") || "—"}]`);
  console.log(`anon nhận signal: [${[...anonEvents].join(", ") || "—"}]`);

  if (missing.length > 0) {
    throw new Error(`FAIL: ctv KHÔNG nhận signal cho: ${missing.join(", ")}`);
  }
  if (anonEvents.size > 0) {
    throw new Error(`FAIL: anon NHẬN ĐƯỢC signal: ${[...anonEvents].join(", ")}`);
  }
  console.log("");
  console.log(`PASS: ${touched.length}/${SOURCE_TABLES.length} bảng emit signal tới role thấp nhất, anon 0 event.`);
  if (empty.length > 0) {
    console.log(`Lưu ý: ${empty.join(", ")} rỗng — chưa verify bằng event thật.`);
  }
}

let exitCode = 0;
try {
  await main();
} catch (error) {
  console.error(error.message);
  exitCode = 1;
} finally {
  console.log("Cleanup temp user...");
  await cleanup();
}
process.exit(exitCode);
