import { readFileSync } from "node:fs";

const source = readFileSync("next.config.ts", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const buildScript = packageJson.scripts?.build || "";
const failures = [];

if (!buildScript.includes("next build --webpack")) {
  failures.push("production build does not force Webpack, so next-pwa GenerateSW can be skipped by Turbopack");
}
if (!buildScript.includes("verify-pwa-build-artifact.mjs")) {
  failures.push("production build does not verify the generated service worker artifact");
}

if (source.includes('source: "/_next/static/:path*"')) {
  failures.push("custom Cache-Control header still overrides Next static assets");
}
if (source.includes('cacheName: "supabase-api"')) {
  failures.push("generic Supabase REST cache still shadows NetworkOnly/RPC rules");
}
if (source.includes('cacheName: "supabase-storage"')) {
  failures.push("generic Supabase storage cache still shadows the image policy");
}
const authIndex = source.indexOf('handler: "NetworkOnly"');
const rpcIndex = source.indexOf('cacheName: "rpc-api-cache"');
const restNetworkOnlyIndex = source.lastIndexOf('handler: "NetworkOnly"');
if (authIndex < 0 || rpcIndex < 0 || restNetworkOnlyIndex < rpcIndex) {
  failures.push("PWA auth/RPC/REST rule ordering is invalid");
}
if (!source.includes('source: "/sw.js"') || !source.includes("must-revalidate")) {
  failures.push("service worker update policy is missing must-revalidate");
}

if (failures.length) {
  console.error("PWA cache policy verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("PWA cache policy verification passed.");
