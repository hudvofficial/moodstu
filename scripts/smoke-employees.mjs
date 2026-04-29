import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const marker = `smoke-employees-${Date.now()}`;
const email = `${marker}@example.invalid`;

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

async function getNextCode(client) {
  const { data, error } = await client.rpc("next_employee_code");
  if (error) throw new Error(`next_employee_code failed: ${error.message}`);
  assert(typeof data === "string" && /^NV-\d+$/.test(data), "next_employee_code returned invalid code");
  return data;
}

async function getUserRole(client, userId) {
  const {
    data: { user },
    error,
  } = await client.auth.admin.getUserById(userId);
  if (error || !user) throw new Error(`Cannot load auth user: ${error?.message || "missing"}`);
  return user.app_metadata?.role || null;
}

async function cleanup(client, employeeId, userId) {
  if (employeeId) {
    await client.from("employees").delete().eq("id", employeeId);
  }
  if (userId) {
    await client.auth.admin.deleteUser(userId);
  }
}

loadEnvFile(path.join(root, ".env.local"));

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const serviceClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let userId = null;
let employeeId = null;

try {
  console.log("Seeding employee smoke user...");
  const { data: userData, error: userError } = await serviceClient.auth.admin.createUser({
    email,
    password: `Smoke-${Date.now()}!`,
    email_confirm: true,
    app_metadata: { role: "manager" },
    user_metadata: { full_name: "Smoke Employees" },
  });
  if (userError || !userData.user) {
    throw new Error(`Cannot create smoke auth user: ${userError?.message || "missing user"}`);
  }
  userId = userData.user.id;

  const employeeCode = await getNextCode(serviceClient);
  const { data: employee, error: employeeError } = await serviceClient
    .from("employees")
    .insert({
      auth_user_id: userId,
      employee_code: employeeCode,
      full_name: "Smoke Employees",
      email,
      department: "QA",
      position: "Smoke",
      role: "manager",
      status: "active",
      start_date: new Date().toISOString().slice(0, 10),
      salary_info: {
        base_salary: 123456,
        bank_name: "Smoke Bank",
      },
    })
    .select("id, updated_at, status, deleted_at, role")
    .single();
  if (employeeError || !employee) {
    throw new Error(`Cannot create smoke employee: ${employeeError?.message || "missing row"}`);
  }
  employeeId = employee.id;

  console.log("Checking active auth context basis...");
  assert(employee.status === "active", "Seed employee must start active");
  assert(employee.deleted_at === null, "Seed employee must not be deleted");
  assert(await getUserRole(serviceClient, userId) === "manager", "Seed auth role must be manager");

  console.log("Checking stale update conflict basis...");
  const staleUpdatedAt = employee.updated_at;
  const changedAt = new Date().toISOString();
  const { error: touchError } = await serviceClient
    .from("employees")
    .update({ position: "Smoke touched", updated_at: changedAt })
    .eq("id", employeeId);
  if (touchError) throw new Error(`Cannot touch employee: ${touchError.message}`);

  const { data: staleRows, error: staleError } = await serviceClient
    .from("employees")
    .update({ position: "Stale write should not land", updated_at: new Date().toISOString() })
    .eq("id", employeeId)
    .eq("updated_at", staleUpdatedAt)
    .select("id");
  if (staleError) throw new Error(`Stale update probe failed: ${staleError.message}`);
  assert(Array.isArray(staleRows) && staleRows.length === 0, "Stale update unexpectedly matched a changed row");

  console.log("Checking soft-delete auth downgrade basis...");
  const deletedAt = new Date().toISOString();
  const { error: softDeleteError } = await serviceClient
    .from("employees")
    .update({ deleted_at: deletedAt, status: "inactive", updated_at: deletedAt })
    .eq("id", employeeId);
  if (softDeleteError) throw new Error(`Cannot soft-delete smoke employee: ${softDeleteError.message}`);

  const { error: downgradeError } = await serviceClient.auth.admin.updateUserById(userId, {
    app_metadata: { role: "viewer" },
  });
  if (downgradeError) throw new Error(`Cannot downgrade auth role: ${downgradeError.message}`);
  assert(await getUserRole(serviceClient, userId) === "viewer", "Soft-delete auth role downgrade did not persist");

  const { data: deletedRow, error: deletedRowError } = await serviceClient
    .from("employees")
    .select("status, deleted_at")
    .eq("id", employeeId)
    .single();
  if (deletedRowError || !deletedRow) {
    throw new Error(`Cannot reload deleted employee: ${deletedRowError?.message || "missing row"}`);
  }
  assert(deletedRow.status === "inactive" && deletedRow.deleted_at, "Soft-delete row state is invalid");

  console.log("Checking restore auth sync basis...");
  const restoredAt = new Date().toISOString();
  const { error: restoreError } = await serviceClient
    .from("employees")
    .update({ deleted_at: null, status: "active", updated_at: restoredAt })
    .eq("id", employeeId);
  if (restoreError) throw new Error(`Cannot restore smoke employee: ${restoreError.message}`);

  const { error: restoreRoleError } = await serviceClient.auth.admin.updateUserById(userId, {
    app_metadata: { role: "manager" },
  });
  if (restoreRoleError) throw new Error(`Cannot restore auth role: ${restoreRoleError.message}`);
  assert(await getUserRole(serviceClient, userId) === "manager", "Restore auth role sync did not persist");

  console.log("Checking directory picker redaction...");
  const { data: directoryRows, error: directoryError } = await serviceClient
    .from("employees")
    .select("id, full_name, avatar_url, department, position")
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(5);
  if (directoryError) throw new Error(`Directory redaction probe failed: ${directoryError.message}`);
  for (const row of directoryRows || []) {
    assert(!("email" in row), "Directory row exposes email");
    assert(!("phone" in row), "Directory row exposes phone");
    assert(!("salary_info" in row), "Directory row exposes salary_info");
  }

  console.log("Employees seeded smoke passed.");
} finally {
  await cleanup(serviceClient, employeeId, userId);
}
