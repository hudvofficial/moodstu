// Verify E2E migration 20260610120000: 5 bảng mới trong supabase_realtime
// thực sự fire event tới subscriber AUTHENTICATED (quy tắc A15: subscribe OK ≠ có event)
// + subscriber ANON không nhận gì (RLS gate qua realtime — quy tắc A12).
//
// Cách chạy: node scripts/verify-realtime-publication.mjs
// Cơ chế: tạo auth user tạm (admin) → 2 realtime client (authenticated + anon)
// subscribe 5 bảng → UPDATE no-op (id = id) 1 row/bảng qua service role →
// assert authenticated nhận UPDATE event cho mỗi bảng có row, anon nhận 0 → dọn user tạm.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const TABLES = ["crm_leads", "customers", "schedules", "approval_requests", "receipts"];
const marker = `verify-realtime-${Date.now()}`;
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

async function createTempAdmin() {
  const email = `${marker}@example.invalid`;
  const password = `VerifyRealtime-${Date.now()}!`;
  const { data: userData, error: userError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: "Verify Realtime QA" },
  });
  if (userError || !userData.user) {
    throw new Error(`Cannot create temp auth user: ${userError?.message || "missing user"}`);
  }
  state.userId = userData.user.id;

  // Trigger on_auth_user_created tự provision employees row → chờ rồi UPDATE (không INSERT)
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
      .update({ role: "admin", status: "active" })
      .eq("id", employee.id);
    if (error) throw new Error(`Cannot promote temp employee: ${error.message}`);
  } else {
    const { data: code, error: codeError } = await serviceClient.rpc("next_employee_code");
    if (codeError) throw new Error(`next_employee_code failed: ${codeError.message}`);
    const { data: inserted, error: insertError } = await serviceClient
      .from("employees")
      .insert({
        auth_user_id: state.userId,
        employee_code: code,
        full_name: "Verify Realtime QA",
        email,
        department: "QA",
        position: "Verify Realtime",
        role: "admin",
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

function subscribeAll(client, label, sink) {
  const channel = client.channel(`${marker}-${label}`);
  for (const table of TABLES) {
    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table },
      (payload) => {
        sink.add(payload.table);
        console.log(`  [${label}] event: UPDATE ${payload.table}`);
      },
    );
  }
  state.channels.push({ client, channel });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} subscribe timed out`)), 15_000);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timer);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timer);
        reject(new Error(`${label} channel status=${status}`));
      }
    });
  });
}

async function touchOneRow(table) {
  const { data: row, error: pickError } = await serviceClient
    .from(table)
    .select("id")
    .limit(1)
    .maybeSingle();
  if (pickError) throw new Error(`pick row ${table}: ${pickError.message}`);
  if (!row) return false;
  // UPDATE no-op (id = id): sinh WAL/realtime event, không đổi dữ liệu
  const { error: touchError } = await serviceClient
    .from(table)
    .update({ id: row.id })
    .eq("id", row.id);
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
  console.log("1/5 Tạo temp admin user...");
  const creds = await createTempAdmin();

  console.log("2/5 Đăng nhập authenticated client + subscribe 5 bảng...");
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
  await subscribeAll(authClient, "authenticated", authEvents);

  console.log("3/5 Subscribe anon client (kỳ vọng 0 event)...");
  const anonClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await subscribeAll(anonClient, "anon", anonEvents);

  // Walrus poll ~100ms; chờ subscription ổn định trước khi bắn UPDATE
  await delay(2_000);

  console.log("4/5 UPDATE no-op từng bảng qua service role...");
  const touched = [];
  const empty = [];
  for (const table of TABLES) {
    if (await touchOneRow(table)) touched.push(table);
    else empty.push(table);
  }
  if (empty.length > 0) {
    console.log(`  SKIP (bảng rỗng, không thể bắn event): ${empty.join(", ")}`);
  }

  console.log(`5/5 Chờ event (tối đa ${EVENT_WAIT_MS / 1000}s)...`);
  const deadline = Date.now() + EVENT_WAIT_MS;
  while (Date.now() < deadline && authEvents.size < touched.length) {
    await delay(300);
  }

  const missing = touched.filter((t) => !authEvents.has(t));
  console.log("");
  console.log(`Authenticated nhận event: [${[...authEvents].join(", ") || "—"}]`);
  console.log(`Anon nhận event:          [${[...anonEvents].join(", ") || "—"}]`);

  if (missing.length > 0) {
    throw new Error(`FAIL: authenticated KHÔNG nhận event cho: ${missing.join(", ")}`);
  }
  if (anonEvents.size > 0) {
    throw new Error(`FAIL: anon NHẬN ĐƯỢC event (lộ data!): ${[...anonEvents].join(", ")}`);
  }
  console.log("");
  console.log(`PASS: ${touched.length}/${TABLES.length} bảng fire event tới authenticated, anon 0 event.`);
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
