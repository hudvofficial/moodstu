#!/usr/bin/env node
/**
 * #17 (T-20260910-goals-doc-ledger) — kiểm tĩnh: dòng tiền của Mục tiêu đọc SỔ KỲ, không tự cộng bảng, không trừ lương/cố định lần 2.
 * Chạy: npm run verify:goals   (không chạm DB)
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const findings = [];
const read = (rel) => readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n"); // CRLF trên Windows
const fail = (msg) => findings.push(msg);

const queries = read("app/actions/finance-operations-queries.ts");
const start = queries.indexOf("export async function fetchGoalsCashflow");
const end = queries.indexOf("\n}\n", start);
if (start === -1 || end === -1) {
  fail("không tìm thấy fetchGoalsCashflow trong finance-operations-queries.ts");
} else {
  const body = queries.slice(start, end);
  if (!body.includes('rpc("finance_month_summary"')) fail("fetchGoalsCashflow phải đọc rpc finance_month_summary (sổ kỳ)");
  for (const table of ["payments", "receipts", "expenses", "monthly_salaries", "fixed_costs"]) {
    if (body.includes(`from("${table}")`)) fail(`fetchGoalsCashflow còn tự đọc bảng ${table} (R10)`);
  }
  if (/salaryComponent|fixedCostComponent/.test(body)) fail("fetchGoalsCashflow còn trả salaryComponent/fixedCostComponent (C7)");
}

const typeStart = queries.indexOf("export interface GoalsCashflowData");
const typeEnd = queries.indexOf("}", typeStart);
const typeBody = typeStart === -1 ? "" : queries.slice(typeStart, typeEnd);
if (!typeBody) fail("không tìm thấy GoalsCashflowData");
if (/salaryComponent|fixedCostComponent/.test(typeBody)) fail("GoalsCashflowData còn salaryComponent/fixedCostComponent (C7)");

for (const rel of [
  "components/finance/goals/goals-overview.tsx",
  "components/finance/goals/goal-form-modal.tsx",
  "components/finance/goals/goal-detail-drawer.tsx",
  "components/finance/goals/goal-contribution-modal.tsx",
  "components/finance/goals/goals-client.tsx",
]) {
  const src = read(rel);
  if (/salaryComponent|fixedCostComponent/.test(src)) fail(`${rel} còn tham chiếu salaryComponent/fixedCostComponent (C7)`);
}

if (findings.length) {
  console.error("Goals verification failed:");
  for (const f of findings) console.error(` - ${f}`);
  process.exit(1);
}
console.log("Goals verification passed.");
