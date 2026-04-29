import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const root = process.cwd();
const marker = `smoke-settings-${Date.now()}`;
const timeoutMs = 45_000;

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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitFor(check, label, waitMs = timeoutMs) {
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

  throw new Error(
    `${label} timed out${lastError ? `: ${lastError.message}` : ""}`,
  );
}

function cookieHeader(cookies) {
  return cookies
    .filter((cookie) => cookie.value)
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

async function getNextCode(client) {
  const { data, error } = await client.rpc("next_employee_code");
  if (error) throw new Error(`next_employee_code failed: ${error.message}`);
  assert(typeof data === "string" && /^NV-\d+$/.test(data), "Invalid employee code");
  return data;
}

async function createSmokeIdentity(client, role) {
  const email = `${marker}-${role}@example.invalid`;
  const password = `SettingsSmoke-${Date.now()}-${role}!`;
  const employeeRole = role === "viewer" ? "ctv" : role;

  const { data: userData, error: userError } =
    await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: { full_name: `Settings Smoke ${role}` },
    });

  if (userError || !userData.user) {
    throw new Error(`Cannot create ${role} auth user: ${userError?.message || "missing user"}`);
  }

  const employeeCode = await getNextCode(client);
  const { data: employee, error: employeeError } = await client
    .from("employees")
    .insert({
      auth_user_id: userData.user.id,
      employee_code: employeeCode,
      full_name: `Settings Smoke ${role}`,
      email,
      department: "QA",
      position: "Settings Smoke",
      role: employeeRole,
      status: "active",
      start_date: new Date().toISOString().slice(0, 10),
      salary_info: { base_salary: 1, bank_name: "Smoke Bank" },
    })
    .select("id")
    .single();

  if (employeeError || !employee) {
    throw new Error(`Cannot create ${role} employee: ${employeeError?.message || "missing row"}`);
  }

  return {
    role,
    email,
    password,
    userId: userData.user.id,
    employeeId: employee.id,
  };
}

async function createAuthCookies(identity) {
  const captured = [];
  const supabase = createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll(cookiesToSet) {
          captured.push(...cookiesToSet);
        },
      },
    },
  );

  const { error } = await supabase.auth.signInWithPassword({
    email: identity.email,
    password: identity.password,
  });

  if (error) throw new Error(`Cannot sign in ${identity.role}: ${error.message}`);
  captured.push({
    name: "session_type",
    value: "temporary",
    options: { path: "/", sameSite: "lax" },
  });
  return captured;
}

function findChromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error("Chrome or Edge was not found for browser smoke QA");
  return found;
}

async function startNextServer(baseUrl, port) {
  const command = process.execPath;
  const args = [
    path.join(root, "node_modules", "next", "dist", "bin", "next"),
    "start",
    "-p",
    String(port),
  ];
  const child = spawn(command, args, {
    cwd: root,
    env: {
      ...process.env,
      GOOGLE_REDIRECT_URI: `${baseUrl}/api/auth/google/callback`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let logs = "";
  child.stdout.on("data", (chunk) => {
    logs += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    logs += chunk.toString();
  });

  await waitFor(
    async () => {
      const response = await fetch(`${baseUrl}/login`, {
        redirect: "manual",
        signal: AbortSignal.timeout(2_000),
      });
      return response.status < 500;
    },
    "Next server",
  ).catch((error) => {
    child.kill();
    throw new Error(`${error.message}\n${logs}`);
  });

  return child;
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.once("open", resolve);
      this.ws.once("error", reject);
    });
    this.ws.on("message", (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result || {});
        return;
      }

      if (message.method && this.events.has(message.method)) {
        for (const resolve of this.events.get(message.method)) {
          resolve(message.params || {});
        }
        this.events.delete(message.method);
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  waitEvent(method) {
    return new Promise((resolve) => {
      const listeners = this.events.get(method) || [];
      listeners.push(resolve);
      this.events.set(method, listeners);
    });
  }

  close() {
    this.ws?.close();
  }
}

async function startChrome(debugPort) {
  const userDataDir = mkdtempSync(path.join(tmpdir(), "settings-smoke-chrome-"));
  const child = spawn(findChromePath(), [
    "--headless=new",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "about:blank",
  ], {
    stdio: "ignore",
  });

  await waitFor(
    async () => {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`, {
        signal: AbortSignal.timeout(2_000),
      });
      return response.ok;
    },
    "Chrome debugging endpoint",
  );

  return { child, userDataDir };
}

async function openCdpPage(debugPort) {
  const response = await fetch(
    `http://127.0.0.1:${debugPort}/json/new?about:blank`,
    { method: "PUT" },
  );
  if (!response.ok) throw new Error("Cannot create Chrome target");
  const target = await response.json();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Network.enable");
  return client;
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime evaluation failed");
  }

  return result.result?.value;
}

async function waitForExpression(client, expression, label, waitMs = timeoutMs) {
  return await waitFor(async () => {
    return await evaluate(client, `Boolean(${expression})`);
  }, label, waitMs);
}

async function goto(client, baseUrl, route) {
  const loaded = client.waitEvent("Page.loadEventFired");
  await client.send("Page.navigate", { url: `${baseUrl}${route}` });
  await Promise.race([loaded, delay(5_000)]);
  await waitForExpression(
    client,
    "document.readyState === 'complete' || document.readyState === 'interactive'",
    `page ${route}`,
  );
  await delay(700);
  return await evaluate(client, "location.pathname + location.search");
}

async function applyBrowserCookies(client, baseUrl, cookies) {
  await client.send("Network.clearBrowserCookies");
  for (const cookie of cookies) {
    if (!cookie.value) continue;
    const sameSite = String(cookie.options?.sameSite || "lax").toLowerCase();
    await client.send("Network.setCookie", {
      url: baseUrl,
      name: cookie.name,
      value: cookie.value,
      path: cookie.options?.path || "/",
      httpOnly: Boolean(cookie.options?.httpOnly),
      secure: false,
      sameSite:
        sameSite === "strict" ? "Strict" : sameSite === "none" ? "None" : "Lax",
    });
  }
}

function jsSetInput(selector, value) {
  return `
    (() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()
  `;
}

async function clickJs(client, expression, label) {
  const clicked = await evaluate(client, `
    (() => {
      const element = ${expression};
      if (!element) return false;
      element.click();
      return true;
    })()
  `);
  assert(clicked, `Could not click ${label}`);
  await delay(500);
}

async function request(baseUrl, route, cookies = []) {
  return await fetch(`${baseUrl}${route}`, {
    headers: cookies.length ? { cookie: cookieHeader(cookies) } : {},
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
}

async function waitForCreditCard(client, bankName) {
  await waitForExpression(
    client,
    `[...document.querySelectorAll("button")].some((button) => button.textContent.includes(${JSON.stringify(bankName)}))`,
    `credit card ${bankName}`,
  );
}

async function cleanup(serviceClient, state) {
  if (state.debtIds.length > 0) {
    await serviceClient.from("debts").delete().in("id", state.debtIds);
  }
  if (state.cardIds.length > 0) {
    await serviceClient.from("credit_cards").delete().in("id", state.cardIds);
  }
  if (state.employeeIds.length > 0) {
    await serviceClient
      .from("notification_preferences")
      .delete()
      .in("employee_id", state.employeeIds);
    await serviceClient.from("employees").delete().in("id", state.employeeIds);
  }
  for (const userId of state.userIds) {
    await serviceClient.auth.admin.deleteUser(userId);
  }
  if (state.studioSnapshot?.id) {
    await serviceClient
      .from("studio_info")
      .update({
        representative: state.studioSnapshot.representative,
        google_calendar_auth: state.studioSnapshot.google_calendar_auth,
        updated_at: state.studioSnapshot.updated_at || new Date().toISOString(),
      })
      .eq("id", state.studioSnapshot.id);
  }
}

loadEnvFile(path.join(root, ".env.local"));

const serviceClient = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const state = {
  userIds: [],
  employeeIds: [],
  cardIds: [],
  debtIds: [],
  studioSnapshot: null,
};

let nextServer;
let chrome;
let cdp;

try {
  assert(existsSync(path.join(root, ".next")), "Run npm run build before smoke:settings");

  const [port, debugPort] = await Promise.all([getFreePort(), getFreePort()]);
  const baseUrl = `http://127.0.0.1:${port}`;

  const admin = await createSmokeIdentity(serviceClient, "manager");
  const viewer = await createSmokeIdentity(serviceClient, "viewer");
  state.userIds.push(admin.userId, viewer.userId);
  state.employeeIds.push(admin.employeeId, viewer.employeeId);

  const [adminCookies, viewerCookies] = await Promise.all([
    createAuthCookies(admin),
    createAuthCookies(viewer),
  ]);

  nextServer = await startNextServer(baseUrl, port);
  chrome = await startChrome(debugPort);
  cdp = await openCdpPage(debugPort);

  console.log("Checking unauthenticated guards...");
  let response = await request(baseUrl, "/settings");
  assert(response.status >= 300 && response.status < 400, "/settings should redirect when logged out");
  response = await request(baseUrl, "/api/auth/google");
  assert(response.status >= 300 && response.status < 400, "Google OAuth should redirect when logged out");

  console.log("Checking normal user settings access and restrictions...");
  await applyBrowserCookies(cdp, baseUrl, viewerCookies);
  let location = await goto(cdp, baseUrl, "/settings");
  assert(location === "/settings", "viewer should open /settings");
  await waitForExpression(cdp, "document.querySelector('#pref-onsite_reminder')", "viewer notification prefs");
  assert(
    !(await evaluate(cdp, `Boolean(document.querySelector('a[href="/settings/studio"]'))`)),
    "viewer should not see studio admin link",
  );

  location = await goto(cdp, baseUrl, "/settings/studio");
  assert(
    location.startsWith("/settings") && location !== "/settings/studio",
    "viewer should be redirected from /settings/studio",
  );
  location = await goto(cdp, baseUrl, "/settings/credit-cards");
  assert(
    location.startsWith("/settings") && location !== "/settings/credit-cards",
    "viewer should be redirected from /settings/credit-cards",
  );
  location = await goto(cdp, baseUrl, "/settings");
  assert(location === "/settings", "viewer should return to /settings");
  response = await request(baseUrl, "/api/auth/google", viewerCookies);
  assert(
    response.status >= 300 && response.status < 400 &&
      response.headers.get("location")?.includes("google_error=forbidden"),
    "viewer should not start Google OAuth",
  );

  console.log("Checking profile and notification mutations...");
  const nextPhone = `09${String(Date.now()).slice(-8)}`;
  await clickJs(cdp, `document.querySelector("section button.icon-btn")`, "edit profile");
  await waitForExpression(cdp, `document.querySelector("#edit-phone")`, "edit profile modal");
  assert(await evaluate(cdp, jsSetInput("#edit-phone", nextPhone)), "set phone input");
  await clickJs(
    cdp,
    `document.querySelector('[role="dialog"] .modal-footer button.btn-primary')`,
    "save profile",
  );
  await waitFor(async () => {
    const { data } = await serviceClient
      .from("employees")
      .select("phone")
      .eq("id", viewer.employeeId)
      .single();
    return data?.phone === nextPhone;
  }, "profile phone update");

  const { data: prefsBefore } = await serviceClient
    .from("notification_preferences")
    .select("onsite_reminder")
    .eq("employee_id", viewer.employeeId)
    .maybeSingle();
  const expectedPref = !Boolean(prefsBefore?.onsite_reminder);
  await clickJs(cdp, `document.querySelector("#pref-onsite_reminder")`, "notification toggle");
  await waitFor(async () => {
    const { data } = await serviceClient
      .from("notification_preferences")
      .select("onsite_reminder")
      .eq("employee_id", viewer.employeeId)
      .maybeSingle();
    return Boolean(data?.onsite_reminder) === expectedPref;
  }, "notification preference update");

  console.log("Checking admin settings, members, studio, and OAuth flow...");
  await applyBrowserCookies(cdp, baseUrl, adminCookies);
  location = await goto(cdp, baseUrl, "/settings");
  assert(location === "/settings", "admin should open /settings");
  await waitForExpression(cdp, `document.querySelector('a[href="/settings/studio"]')`, "admin studio link");
  await waitForExpression(cdp, `document.body.innerText.includes(${JSON.stringify(admin.email)})`, "admin member row");
  await waitForExpression(cdp, `document.body.innerText.includes(${JSON.stringify(viewer.email)})`, "viewer member row");
  assert(await evaluate(cdp, `
    (() => {
      const cards = [...document.querySelectorAll(".detail-sidebar .rounded-lg")];
      const selfCard = cards.find((card) => card.textContent.includes(${JSON.stringify(admin.email)}));
      if (!selfCard) return false;
      const controls = [...selfCard.querySelectorAll("button")];
      return controls.some((control) => control.disabled);
    })()
  `), "current admin member actions should be disabled");
  assert(await evaluate(cdp, `
    (() => {
      const cards = [...document.querySelectorAll(".detail-sidebar .rounded-lg")];
      const targetCard = cards.find((card) => card.textContent.includes(${JSON.stringify(viewer.email)}));
      if (!targetCard) return false;
      const unlinkButton = [...targetCard.querySelectorAll("button.icon-btn")].at(-1);
      if (!unlinkButton || unlinkButton.disabled) return false;
      unlinkButton.click();
      return true;
    })()
  `), "unlink another member");
  await waitFor(async () => {
    const { data: employee } = await serviceClient
      .from("employees")
      .select("auth_user_id")
      .eq("id", viewer.employeeId)
      .single();
    const {
      data: { user },
    } = await serviceClient.auth.admin.getUserById(viewer.userId);
    return employee?.auth_user_id === null && user?.app_metadata?.role === "ctv";
  }, "member unlink revokes auth role");

  response = await request(baseUrl, "/audit-logs", adminCookies);
  assert(response.status === 200, "admin should open /audit-logs");

  const googleInit = await request(baseUrl, "/api/auth/google", adminCookies);
  assert(googleInit.status >= 300 && googleInit.status < 400, "admin Google OAuth should redirect");
  const googleLocation = googleInit.headers.get("location") || "";
  assert(googleLocation.startsWith("https://accounts.google.com/"), "Google OAuth redirect target is invalid");
  const oauthState = new URL(googleLocation).searchParams.get("state");
  assert(oauthState, "Google OAuth redirect must include state");
  const stateCookie = googleInit.headers.get("set-cookie") || "";
  assert(stateCookie.includes("mood_google_oauth_state"), "Google OAuth state cookie missing");

  response = await request(baseUrl, "/api/auth/google/callback?code=fake&state=wrong", adminCookies);
  assert(
    response.status >= 300 && response.status < 400 &&
      response.headers.get("location")?.includes("google_error=invalid_state"),
    "invalid Google OAuth state should be rejected",
  );

  const callbackCookies = [
    ...adminCookies,
    {
      name: "mood_google_oauth_state",
      value: oauthState,
      options: { path: "/api/auth/google", sameSite: "lax", httpOnly: true },
    },
  ];
  response = await request(
    baseUrl,
    `/api/auth/google/callback?state=${encodeURIComponent(oauthState)}`,
    callbackCookies,
  );
  assert(
    response.status >= 300 && response.status < 400 &&
      response.headers.get("location")?.includes("google_error=no_code"),
    "valid Google OAuth state without code should stop before token exchange",
  );

  const { data: studioInfo } = await serviceClient
    .from("studio_info")
    .select("id, representative, google_calendar_auth, updated_at")
    .limit(1)
    .maybeSingle();
  state.studioSnapshot = studioInfo;
  assert(state.studioSnapshot?.id, "studio_info row is required for studio smoke");

  const { error: calendarSeedError } = await serviceClient
    .from("studio_info")
    .update({
      google_calendar_auth: {
        access_token: "settings-smoke-access",
        refresh_token: "settings-smoke-refresh",
        updated_at: new Date().toISOString(),
      },
    })
    .eq("id", state.studioSnapshot.id);
  if (calendarSeedError) {
    throw new Error(`Cannot seed Google Calendar smoke auth: ${calendarSeedError.message}`);
  }

  location = await goto(cdp, baseUrl, "/settings/studio");
  assert(location === "/settings/studio", "admin should open /settings/studio");
  await waitForExpression(cdp, `document.querySelector("#studio-representative")`, "studio form");
  await clickJs(cdp, `document.querySelector("button.btn-danger")`, "disconnect Google Calendar");
  await waitFor(async () => {
    const { data } = await serviceClient
      .from("studio_info")
      .select("google_calendar_auth")
      .eq("id", state.studioSnapshot.id)
      .single();
    return data?.google_calendar_auth === null;
  }, "Google Calendar disconnect");
  location = await goto(cdp, baseUrl, "/settings/studio");
  assert(location === "/settings/studio", "admin should reopen /settings/studio after disconnect");
  await waitForExpression(cdp, `document.querySelector("#studio-representative")`, "studio form after disconnect");
  assert(
    !(await evaluate(cdp, `performance.getEntriesByType("resource").some((entry) => String(entry.name).includes("generativelanguage.googleapis.com"))`)),
    "studio page should not auto-call Gemini model API",
  );
  const representative = `Smoke Representative ${Date.now()}`;
  assert(
    await evaluate(cdp, jsSetInput("#studio-representative", representative)),
    "set studio representative",
  );
  await clickJs(cdp, `document.querySelector("button.btn-primary")`, "save studio");
  await waitFor(async () => {
    const { data } = await serviceClient
      .from("studio_info")
      .select("representative")
      .eq("id", state.studioSnapshot.id)
      .single();
    return data?.representative === representative;
  }, "studio representative update");

  console.log("Checking credit-card CRUD and linked-card guard...");
  location = await goto(cdp, baseUrl, "/settings/credit-cards");
  assert(location === "/settings/credit-cards", "admin should open /settings/credit-cards");
  const bankName = `Smoke Bank ${Date.now()}`;
  await clickJs(
    cdp,
    `document.querySelector(".space-y-6 > .flex button")`,
    "add credit card",
  );
  await waitForExpression(cdp, `document.querySelector('[role="dialog"] input')`, "credit-card modal");
  assert(await evaluate(cdp, `
    (() => {
      const inputs = [...document.querySelectorAll('[role="dialog"] input')];
      const values = [${JSON.stringify(bankName)}, "4242", "10", "25", "123456"];
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      inputs.slice(0, values.length).forEach((input, index) => {
        setter.call(input, values[index]);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
      return inputs.length >= 5;
    })()
  `), "fill credit-card create form");
  await clickJs(
    cdp,
    `document.querySelector('[role="dialog"] .modal-footer button.btn-primary')`,
    "save new credit card",
  );
  const createdCard = await waitFor(async () => {
    const { data } = await serviceClient
      .from("credit_cards")
      .select("id, credit_limit, updated_at, deleted_at")
      .eq("bank_name", bankName)
      .is("deleted_at", null)
      .maybeSingle();
    if (data?.id) return data;
    return null;
  }, "credit-card create");
  state.cardIds.push(createdCard.id);
  assert(Number(createdCard.credit_limit) === 123456, "credit limit should be saved on create");
  await waitForCreditCard(cdp, bankName);

  await clickJs(
    cdp,
    `[...document.querySelectorAll("button")].find((button) => button.textContent.includes(${JSON.stringify(bankName)}))`,
    "edit credit card",
  );
  await waitForExpression(cdp, `document.querySelector('[role="dialog"] input')`, "credit-card edit modal");
  assert(await evaluate(cdp, `
    (() => {
      const input = [...document.querySelectorAll('[role="dialog"] input')][4];
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, "");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()
  `), "clear credit limit");
  await clickJs(
    cdp,
    `document.querySelector('[role="dialog"] .modal-footer button.btn-primary')`,
    "save cleared limit",
  );
  await waitFor(async () => {
    const { data } = await serviceClient
      .from("credit_cards")
      .select("credit_limit")
      .eq("id", createdCard.id)
      .single();
    return data?.credit_limit === null;
  }, "credit limit clear");

  const { data: debt, error: debtError } = await serviceClient
    .from("debts")
    .insert({
      entity_name: "Settings Smoke Debt",
      entity_type: "khac",
      type: "payable",
      amount: 1000,
      due_date: new Date().toISOString().slice(0, 10),
      paid_amount: 0,
      remaining: 1000,
      status: "open",
      card_id: createdCard.id,
      installment_total: 1,
      installment_paid: 0,
      installment_amount: 1000,
      notes: marker,
      created_by: admin.userId,
    })
    .select("id")
    .single();
  if (debtError || !debt) {
    throw new Error(`Cannot create linked debt: ${debtError?.message || "missing row"}`);
  }
  state.debtIds.push(debt.id);

  await clickJs(
    cdp,
    `[...document.querySelectorAll("button")].find((button) => button.textContent.includes(${JSON.stringify(bankName)}))`,
    "edit linked credit card",
  );
  await waitForExpression(cdp, `document.querySelector('[role="dialog"] .modal-footer button')`, "linked card delete button");
  await evaluate(cdp, `window.confirm = () => true; true`);
  await clickJs(
    cdp,
    `document.querySelector('[role="dialog"] .modal-footer button')`,
    "delete linked credit card",
  );
  await delay(1_500);
  const { data: linkedCard } = await serviceClient
    .from("credit_cards")
    .select("deleted_at")
    .eq("id", createdCard.id)
    .single();
  assert(linkedCard?.deleted_at === null, "linked credit card should not be deleted");

  await serviceClient.from("debts").delete().eq("id", debt.id);
  state.debtIds = state.debtIds.filter((id) => id !== debt.id);
  await clickJs(
    cdp,
    `document.querySelector('[role="dialog"] .modal-footer button')`,
    "delete unlinked credit card",
  );
  await waitFor(async () => {
    const { data } = await serviceClient
      .from("credit_cards")
      .select("deleted_at")
      .eq("id", createdCard.id)
      .single();
    return Boolean(data?.deleted_at);
  }, "unlinked credit-card delete");

  console.log("Settings runtime smoke passed.");
} finally {
  cdp?.close();
  if (chrome?.child) chrome.child.kill();
  if (chrome?.userDataDir) {
    try {
      rmSync(chrome.userDataDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
  if (nextServer) nextServer.kill();
  await cleanup(serviceClient, state);
}
