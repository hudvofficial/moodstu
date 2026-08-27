import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const findings = [];

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

function read(relPath) {
  return readFileSync(path.join(root, relPath), "utf8");
}

function fail(message) {
  findings.push(message);
}

function isDenied(error, status) {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    message.includes("permission denied") ||
    message.includes("not found") ||
    message.includes("row-level security")
  );
}

async function assertAnonRpcDenied(client, name, args) {
  const { error, status } = await client.rpc(name, args);
  if (!isDenied(error, status)) {
    fail(`${name} anon rpc was not denied; got ${error ? error.message : "success"}`);
  }
}

async function assertServiceRpcReachable(client, name, args, expectedMessage) {
  const { error } = await client.rpc(name, args);
  if (!error) return;

  const message = error.message.toLowerCase();
  if (message.includes("permission denied")) {
    fail(`${name} service-role rpc permission denied: ${error.message}`);
  }
  if (expectedMessage && !message.includes(expectedMessage)) {
    fail(`${name} returned unexpected error: ${error.message}`);
  }
}

const contractQueries = read("app/actions/contract-queries.ts");
// Gallery actions đã refactor khỏi gallery-actions.ts — markers bảo mật giờ nằm
// rải trong 3 file này (gộp lại để check như cũ).
const galleryActions = [
  read("app/actions/gallery-core.ts"),
  read("app/actions/gallery-public-actions.ts"),
  read("app/actions/gallery-selection-actions.ts"),
].join("\n");
const publicGalleryClient = read("components/gallery/public-gallery-client.tsx");
const passwordGate = read("components/gallery/password-gate.tsx");
const detailClient = read("components/contracts/detail/contract-detail-client.tsx");
const contractSchema = read("lib/validations/contract.schema.ts");
const workTaskActions = read("app/actions/work-task-actions.ts");
const contractEventActions = read("app/actions/contract-event-actions.ts");
const authUtils = read("lib/auth_utils.ts");

if (contractQueries.includes("customers.full_name.ilike")) {
  fail("contract search still uses embedded customers.full_name.ilike in PostgREST OR");
}
if (!contractQueries.includes("findMatchingCustomerIds")) {
  fail("contract search is missing the safe customer-id subquery");
}
if (!galleryActions.includes("requirePublicGalleryImageAccess")) {
  fail("public gallery image mutations are not bound to verified gallery access");
}
if (!galleryActions.includes("verify_gallery_password")) {
  fail("gallery password verification does not use hashed password RPC");
}
if (!publicGalleryClient.includes("accessToken") || !publicGalleryClient.includes("accessUrl")) {
  fail("public gallery client does not pass signed access context to mutations");
}
if (passwordGate.includes("gallery_pwd_") || passwordGate.includes("localStorage.setItem")) {
  fail("password gate still persists raw gallery passwords");
}
if (detailClient.includes('useRealtime("receipts"')) {
  fail("contract detail still subscribes to receipts instead of payments");
}
if (
  !detailClient.includes('useRealtime("payments"') &&
  !detailClient.includes('table: "payments"') &&
  !detailClient.includes('realtimeSignalConfig("payments")')
) {
  fail("contract detail is missing payments realtime subscription");
}
if (!contractSchema.includes("superRefine") || !contractSchema.includes("Ngay giao phai")) {
  fail("contract schema is missing server-side date-order validation");
}
if (!workTaskActions.includes("assertEventBelongsToContract")) {
  fail("work task actions do not verify event/contract ownership");
}
if (contractEventActions.includes("event_date: isOnSet ? (input.eventDate || today) : today")) {
  fail("manual off-set events still write fake event_date=today");
}
if (!authUtils.includes("requireContractDestructiveAccess")) {
  fail("contract destructive access gate is missing");
}

loadEnvFile(path.join(root, ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (url && serviceKey && anonKey) {
  const serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anonClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const fakeGallery = "00000000-0000-0000-0000-000000000001";
  await assertServiceRpcReachable(
    serviceClient,
    "verify_gallery_password",
    { p_gallery_id: fakeGallery, p_password: "verify" },
  );
  await assertServiceRpcReachable(
    serviceClient,
    "set_gallery_password",
    { p_gallery_id: fakeGallery, p_password: "verify" },
    "gallery not found",
  );
  await assertAnonRpcDenied(
    anonClient,
    "verify_gallery_password",
    { p_gallery_id: fakeGallery, p_password: "verify" },
  );
  await assertAnonRpcDenied(
    anonClient,
    "set_gallery_password",
    { p_gallery_id: fakeGallery, p_password: "verify" },
  );

  // M4 (T-20260827-tien-vao-payment-plans): lịch thu mặc định chỉ Cọc + Tất toán — không còn dòng
  // installment_* rỗng (0đ, không phân bổ); mọi check sức khoẻ thanh toán = 0.
  {
    const { data: plans, error: planErr } = await serviceClient
      .from("payment_plans")
      .select("id, payment_plan_allocations(id)")
      .in("stage_key", ["installment_1", "installment_2"]);
    if (planErr) fail(`payment_plans installment check failed: ${planErr.message}`);
    const orphans = (plans || []).filter((row) => !(row.payment_plan_allocations || []).length);
    if (orphans.length > 0) fail(`payment_plans still has ${orphans.length} installment rows without allocation (M4)`);

    const { data: health, error: healthErr } = await serviceClient.rpc("contract_payment_health_checks");
    if (healthErr) fail(`contract_payment_health_checks failed: ${healthErr.message}`);
    for (const row of health || []) {
      if (Number(row.issue_count) !== 0) fail(`contract_payment_health_checks: ${row.check_name} = ${row.issue_count}`);
    }
  }
} else {
  console.warn("Skipping remote Supabase checks; env vars are missing.");
}

if (findings.length > 0) {
  console.error("Contracts verification failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Contracts verification passed.");
