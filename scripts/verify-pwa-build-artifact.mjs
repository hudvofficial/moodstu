import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const workerPath = path.join(root, "public", "sw.js");
const failures = [];

if (!existsSync(workerPath)) {
  failures.push("public/sw.js was not generated");
} else {
  const worker = readFileSync(workerPath, "utf8");
  const size = statSync(workerPath).size;

  if (size < 5_000) failures.push(`public/sw.js is too small for a production Workbox worker (${size} bytes)`);
  if (worker.includes("Dev-only cleanup worker")) failures.push("public/sw.js is still the development cleanup worker");
  if (!worker.includes("push-sw.js")) failures.push("public/sw.js does not import push-sw.js");
  if (!worker.includes("NetworkOnly")) failures.push("public/sw.js is missing NetworkOnly policies");
  if (!worker.includes("rpc-api-cache")) failures.push("public/sw.js is missing the RPC cache policy");
  if (!worker.includes("supabase-images")) failures.push("public/sw.js is missing the Supabase image cache policy");
  if (!worker.includes("next-static")) failures.push("public/sw.js is missing the Next static asset cache policy");
  if (!worker.includes("/offline")) failures.push("public/sw.js is missing the offline fallback");
  if (!worker.includes("skipWaiting")) failures.push("public/sw.js is missing skipWaiting");
  if (!worker.includes("clientsClaim")) failures.push("public/sw.js is missing clientsClaim");

  const hasSupabaseRestPolicy =
    /supabase(?:\\+\.|\.)co(?:\\+\/|\/)rest/i.test(worker) && worker.includes("NetworkOnly");
  if (!hasSupabaseRestPolicy) failures.push("public/sw.js is missing the Supabase REST NetworkOnly policy");
}

if (failures.length > 0) {
  console.error("PWA build artifact verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`PWA build artifact verification passed: ${path.relative(root, workerPath)}`);
