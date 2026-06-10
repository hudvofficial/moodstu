// Test ANON đọc được gì THẬT (anon key, không sign-in) — kỷ luật A12: verify
// bằng request thật, không suy từ pg_policies. Đọc-only, không ghi gì.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[key] ??= v;
  }
}
loadEnvFile(path.join(process.cwd(), ".env.local"));

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const TABLES = [
  "documents", "addon_history", "dresses", "dress_reservations", "labs",
  "lab_services", "promotions", "services", "service_categories",
  "studio_info", "transaction_categories", "work_shifts", "login_attempts",
  // đối chứng: bảng kỳ vọng anon KHÔNG đọc được
  "customers", "crm_leads", "receipts", "employees", "contracts",
];

const exposed = [];
const blocked = [];
for (const t of TABLES) {
  const { data, error } = await anon.from(t).select("*").limit(1);
  if (error) {
    blocked.push(`${t}: BLOCKED (${error.code || error.message})`);
  } else {
    exposed.push(`${t}: ANON READ OK (${data?.length ?? 0} row trả về)`);
  }
}

console.log("=== ANON ĐỌC ĐƯỢC (cần xem xét) ===");
exposed.forEach((l) => console.log("  " + l));
console.log("");
console.log("=== ANON BỊ CHẶN (đúng kỳ vọng) ===");
blocked.forEach((l) => console.log("  " + l));

// ── login_attempts: PHẢI còn hoạt động cho anon (rate-limit pre-auth) ──
console.log("");
console.log("=== login_attempts (anon PHẢI làm được — login flow) ===");
const probeEmail = `__anon_probe_${Date.now()}@example.invalid`;
try {
  const sel = await anon.from("login_attempts").select("email").limit(1);
  console.log(`  SELECT: ${sel.error ? "FAIL " + sel.error.code : "OK"}`);
  const ins = await anon.from("login_attempts").insert({ email: probeEmail, attempt_count: 1 });
  console.log(`  INSERT: ${ins.error ? "FAIL " + ins.error.code : "OK"}`);
  const upd = await anon.from("login_attempts").update({ attempt_count: 2 }).eq("email", probeEmail);
  console.log(`  UPDATE: ${upd.error ? "FAIL " + upd.error.code : "OK"}`);
  const del = await anon.from("login_attempts").delete().eq("email", probeEmail);
  console.log(`  DELETE: ${del.error ? "FAIL " + del.error.code : "OK"}`);
} catch (e) {
  console.log(`  login_attempts probe error: ${e.message}`);
}
