import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const findings = [];

function read(relPath) {
  return readFileSync(path.join(root, relPath), "utf8");
}

function assert(condition, message) {
  if (!condition) findings.push(message);
}

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts || {};
const nextConfig = read("next.config.ts");
const perfAudit = read("scripts/perf-audit.mjs");
const plan = read("docs/plans/260423-0807-performance-ux-international-standard/plan.md");

const requiredScripts = [
  "perf:audit",
  "perf:chunks",
  "verify:contracts",
  "verify:reports",
  "verify:dashboard",
  "verify:services",
  "verify:inventory",
  "verify:dresses",
  "verify:printing",
  "verify:calendar",
  "verify:productivity",
  "verify:settings",
  "verify:employees",
  "smoke:contracts",
  "smoke:dashboard",
  "smoke:calendar",
  "smoke:employees",
  "smoke:settings",
  "smoke:production",
];

for (const script of requiredScripts) {
  assert(Boolean(scripts[script]), `package.json is missing ${script}`);
}

assert(
  nextConfig.includes("cacheOnFrontEndNav: false"),
  "PWA front-end navigation cache must stay disabled",
);
assert(
  nextConfig.includes("aggressiveFrontEndNavCaching: false"),
  "PWA aggressive front-end navigation cache must stay disabled",
);
assert(
  /supabase\\\.co\\\/rest[\s\S]*?handler:\s*"NetworkOnly"/.test(nextConfig),
  "Supabase REST business data must remain NetworkOnly",
);
assert(
  perfAudit.includes("html2pdf.js") &&
    perfAudit.includes("qr-scanner") &&
    perfAudit.includes("qr-code-styling"),
  "perf:audit must keep static heavy import guards",
);
assert(
  existsSync(path.join(root, "docs", "release", "performance-regression-checklist.md")),
  "performance regression release checklist is missing",
);
assert(
  plan.includes("| 01 | Cache/Refetch Contract | Complete | 100% |") &&
    plan.includes("| 02 | Realtime Strategy | Complete | 100% |") &&
    plan.includes("| 03 | Server Data & Database Performance | Complete | 100% |") &&
    plan.includes("| 04 | Bundle & Code Splitting | Complete | 100% |") &&
    plan.includes("| 05 | Route UX, Streaming & Skeletons | Complete | 100% |"),
  "Phase 01-05 must be explicitly closed in the master plan after local acceptance is met",
);

if (findings.length > 0) {
  console.error("Performance release verification failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Performance release verification passed.");
