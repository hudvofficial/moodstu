import { readFileSync } from "node:fs";

const migrationFiles = [
  "supabase/migrations/20260505100000_contract_payment_stage_key_vietnamese.sql",
  "supabase/migrations/20260505101000_contract_payment_adjustment_stage_key.sql",
  "supabase/migrations/20260711160000_repair_payment_stage_key_unicode.sql",
];

const expectedSource = "áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ";
const expectedTarget = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeStage(value) {
  const key = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replaceAll("đ", "d")
    .replace(/[^a-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "");

  if (["dat_coc", "coc", "tien_coc", "deposit", "contract_deposit"].includes(key) || key.includes("coc")) return "deposit";
  if (["thanh_toan_dot_1", "dot_1", "lan_1", "first", "installment_1", "stage_1"].includes(key) || key.includes("dot_1") || key.includes("lan_1")) return "installment_1";
  if (["thanh_toan_dot_2", "dot_2", "lan_2", "second", "installment_2", "stage_2"].includes(key) || key.includes("dot_2") || key.includes("lan_2")) return "installment_2";
  if (["tat_toan", "final", "remaining", "thanh_toan_het", "thanh_toan_con_lai", "con_lai"].includes(key) || key.includes("tat_toan") || key.includes("thanh_toan_het") || key.includes("con_lai")) return "final";
  if (["outside", "thu_ngoai_dot", "ngoai_dot", "thu_khong_theo_dot", "thanh_toan_khac", "custom"].includes(key) || key.includes("ngoai_dot") || key.includes("khong_theo_dot")) return "outside";
  if (["phat_sinh", "adjustment", "contract_adjustment"].includes(key) || key.includes("phat_sinh") || key.includes("adjustment")) return "adjustment";
  return key || null;
}

assert([...expectedSource].length === [...expectedTarget].length, "translate() source and target lengths must match");

for (const file of migrationFiles) {
  const sql = readFileSync(file, "utf8");
  assert(sql.includes(expectedSource), `${file} is missing the canonical Vietnamese translate source`);
  assert(sql.includes(expectedTarget), `${file} is missing the canonical ASCII translate target`);
  assert(sql.includes("CREATE OR REPLACE FUNCTION public.payment_stage_key_v2"), `${file} must replace payment_stage_key_v2`);
  assert(sql.includes("REVOKE ALL ON FUNCTION public.payment_stage_key_v2(text)"), `${file} must preserve function revocation`);
  assert(sql.includes("GRANT EXECUTE ON FUNCTION public.payment_stage_key_v2(text) TO service_role"), `${file} must preserve service-role grant`);
}

const repairSql = readFileSync(migrationFiles[2], "utf8");
assert(repairSql.includes("UPDATE public.payment_plans"), "repair migration must backfill payment_plans");
assert(repairSql.includes("<> 'cancelled'"), "repair migration must not rewrite cancelled plans");

const cases = new Map([
  ["Đặt cọc", "deposit"],
  ["Thanh toán đợt 1", "installment_1"],
  ["Thanh toán lần 1", "installment_1"],
  ["Thanh toán đợt 2", "installment_2"],
  ["Tất toán", "final"],
  ["Thanh toán còn lại", "final"],
  ["Thu ngoài đợt", "outside"],
  ["Thu không theo đợt", "outside"],
  ["Phát sinh hợp đồng", "adjustment"],
  ["contract_adjustment", "adjustment"],
  ["deposit", "deposit"],
]);

for (const [input, expected] of cases) {
  const actual = normalizeStage(input);
  assert(actual === expected, `${JSON.stringify(input)} normalized to ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
}

console.log(`Payment stage verification passed for ${migrationFiles.length} migration(s) and ${cases.size} normalization case(s).`);
