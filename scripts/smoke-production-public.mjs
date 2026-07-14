import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

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

function resolveBaseUrl() {
  const raw =
    process.env.PRODUCTION_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://stu.moodwedding.com";

  return raw.replace(/\/+$/, "");
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function expectStatus(baseUrl, pathName, expected) {
  const response = await fetchWithTimeout(`${baseUrl}${pathName}`, {
    redirect: "manual",
    headers: { "User-Agent": "mood-studio-production-smoke/1.0" },
  });

  if (!expected.includes(response.status)) {
    throw new Error(
      `${pathName} expected ${expected.join("/")} but got ${response.status}`,
    );
  }

  console.log(`- ${pathName}: ${response.status}`);
  return response;
}

async function expectMonitoringEndpoint(baseUrl) {
  const response = await fetchWithTimeout(`${baseUrl}/api/monitoring/web-vitals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "mood-studio-production-smoke/1.0",
    },
    body: JSON.stringify({
      id: `production-smoke-${Date.now()}`,
      name: "LCP",
      label: "web-vital",
      value: 1,
      rating: "good",
      route: "/production-smoke",
      navigationType: "navigate",
      timestamp: Date.now(),
    }),
  });

  if (response.status !== 200) {
    throw new Error(`/api/monitoring/web-vitals expected 200 but got ${response.status}`);
  }

  const payload = await response.json().catch(() => null);
  if (!payload?.ok) {
    throw new Error("/api/monitoring/web-vitals did not return ok:true");
  }

  console.log("- /api/monitoring/web-vitals: 200");
}

loadEnvFile(path.join(root, ".env.local"));

const baseUrl = resolveBaseUrl();

console.log(`Production public smoke: ${baseUrl}`);

await expectStatus(baseUrl, "/login", [200]);
await expectStatus(baseUrl, "/offline", [200]);
await expectStatus(baseUrl, "/contracts", [302, 303, 307, 308]);

const swResponse = await expectStatus(baseUrl, "/sw.js", [200]);
const serviceWorker = await swResponse.text();
const contentType = swResponse.headers.get("content-type") || "";
const cacheControl = swResponse.headers.get("cache-control") || "";
const serviceWorkerAllowed = swResponse.headers.get("service-worker-allowed") || "";

if (!/javascript/i.test(contentType)) {
  throw new Error(`/sw.js expected a JavaScript content type but got ${contentType || "missing"}`);
}
if (!/(?:no-store|max-age=0|must-revalidate)/i.test(cacheControl)) {
  throw new Error(`/sw.js cache policy can retain stale workers: ${cacheControl || "missing"}`);
}
if (serviceWorkerAllowed && serviceWorkerAllowed !== "/") {
  throw new Error(`/sw.js has an invalid Service-Worker-Allowed scope: ${serviceWorkerAllowed}`);
}
if (serviceWorker.includes("Dev-only cleanup worker")) {
  throw new Error("/sw.js is the development cleanup worker, not the production Workbox worker");
}
if (!serviceWorker.includes("push-sw.js")) {
  throw new Error("/sw.js does not import push-sw.js");
}

const hasSupabaseRestNetworkOnly =
  /supabase\.co\/rest[\s\S]{0,200}?NetworkOnly/i.test(serviceWorker) ||
  /supabase\\\.co\\\/rest[\s\S]{0,200}?NetworkOnly/i.test(serviceWorker);

if (!hasSupabaseRestNetworkOnly) {
  throw new Error("/sw.js does not include the Supabase REST runtime cache rule");
}

await expectStatus(baseUrl, "/push-sw.js", [200]);
await expectMonitoringEndpoint(baseUrl);

console.log("Production public smoke passed.");
