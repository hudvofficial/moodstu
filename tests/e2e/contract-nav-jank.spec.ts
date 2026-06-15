/**
 * contract-nav-jank.spec.ts
 * ---
 * Reproduce: sau 1 hồi thao tác trên /contracts, app tự redirect sang route khác (vd /crm).
 * Strategy: thao tác liên tục (mở drawer, đóng, scroll, hover, tab switch) và monitor pathname.
 * Bất kỳ navigation nào rời khỏi /contracts → FAIL + log stack trace nguồn gốc.
 */

import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { sweepStaleE2EOrphans } from "./e2e-sweep";

type AdminClient = SupabaseClient;

interface SeedState {
  marker: string;
  email: string;
  password: string;
  employeeName: string;
  userId?: string;
  employeeId?: string;
  customerId?: string;
  contractId?: string;
}

// ── Env + Admin client (reuse pattern from contract-perf) ──

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1);
    process.env[key] ??= value;
  }
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function createAdminSupabase() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// ── Seed / Cleanup ──

async function seedUser(admin: AdminClient, seed: SeedState) {
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: seed.email,
    password: seed.password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: seed.employeeName },
  });
  if (authError || !authUser.user) throw new Error(`Cannot create E2E auth user: ${authError?.message || "missing"}`);
  seed.userId = authUser.user.id;

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .update({
      employee_code: `E2E-NAV-${Date.now().toString(36).toUpperCase()}`,
      department: "E2E",
      position: "QA",
      role: "admin",
      status: "active",
      start_date: "2026-05-15",
    })
    .eq("auth_user_id", seed.userId)
    .select("id")
    .single();
  if (employeeError || !employee) throw new Error(`Cannot update E2E employee: ${employeeError?.message || "missing"}`);
  seed.employeeId = employee.id;

  // Seed a few contracts so the list isn't empty
  const { data: customer } = await admin
    .from("customers")
    .insert({
      customer_code: `E2E-NAV-CUS-${seed.marker}`,
      full_name: `E2E NavJank Customer ${seed.marker}`,
      phone: "0901234567",
      status: "active",
    })
    .select("id")
    .single();
  if (!customer) throw new Error("Cannot create E2E customer");
  seed.customerId = customer.id;

  const { data: contract } = await admin
    .from("contracts")
    .insert({
      contract_code: `E2E-NAV-${seed.marker}`,
      customer_id: seed.customerId,
      contract_date: "2026-05-15",
      work_date: "2026-05-20",
      service_type: "studio",
      transaction_type: "hop_dong",
      status: "dang_thuc_hien",
      payment_status: "chua_thanh_toan",
      total_amount: 1000000,
      paid_amount: 0,
      remaining_amount: 1000000,
    })
    .select("id")
    .single();
  if (!contract) throw new Error("Cannot create E2E contract");
  seed.contractId = contract.id;
}

async function cleanupSeed(admin: AdminClient, seed: SeedState) {
  if (seed.contractId) {
    await admin.from("work_tasks").delete().eq("contract_id", seed.contractId);
    await admin.from("contract_events").delete().eq("contract_id", seed.contractId);
    await admin.from("payments").delete().eq("contract_id", seed.contractId);
    await admin.from("printing_orders").delete().eq("contract_id", seed.contractId);
    await admin.from("contract_items").delete().eq("contract_id", seed.contractId);
    await admin.from("contracts").delete().eq("id", seed.contractId);
  }
  if (seed.customerId) {
    await admin.from("customers").delete().eq("id", seed.customerId);
  }
  if (seed.employeeId) {
    await admin.from("employees").delete().eq("id", seed.employeeId);
  }
  if (seed.userId) {
    await admin.auth.admin.deleteUser(seed.userId);
  }
}

// ── Login ──

async function login(page: Page, seed: SeedState) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(seed.email);
  await page.locator('input[name="password"]').fill(seed.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 45_000 });
}

// ── Navigation monitor — inject vào page ──

async function installNavigationMonitor(page: Page) {
  await page.evaluate(() => {
    (window as any).__navLog = [];

    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);

    history.pushState = function (...args: any[]) {
      (window as any).__navLog.push({
        type: "pushState",
        url: args[2],
        from: window.location.pathname,
        time: Date.now(),
        stack: new Error().stack?.split("\n").slice(1, 5).join(" | "),
      });
      return origPush(...args);
    };

    history.replaceState = function (...args: any[]) {
      (window as any).__navLog.push({
        type: "replaceState",
        url: args[2],
        from: window.location.pathname,
        time: Date.now(),
        stack: new Error().stack?.split("\n").slice(1, 5).join(" | "),
      });
      return origReplace(...args);
    };

    window.addEventListener("popstate", () => {
      (window as any).__navLog.push({
        type: "popstate",
        url: window.location.pathname,
        from: "(popstate)",
        time: Date.now(),
      });
    });
  });
}

async function getNavLog(page: Page): Promise<any[]> {
  return page.evaluate(() => (window as any).__navLog || []);
}

async function getCurrentPath(page: Page): Promise<string> {
  return page.evaluate(() => window.location.pathname);
}

// ── Test ──

test.describe.serial("contract navigation jank detector", () => {
  test.setTimeout(180_000);

  let admin: AdminClient;
  const timestamp = Date.now();
  const seed: SeedState = {
    marker: timestamp.toString(),
    email: `e2e-navjank-${timestamp}@test.local`,
    password: `NavJank!${timestamp}`,
    employeeName: `E2E NavJank ${timestamp}`,
  };

  test.beforeAll(async () => {
    admin = createAdminSupabase();
    await sweepStaleE2EOrphans(admin);
    await seedUser(admin, seed);
  });

  test.afterAll(async () => {
    if (admin) await cleanupSeed(admin, seed);
  });

  test("sustained interaction: no unexpected navigation away from /contracts", async ({ page }) => {
    await login(page, seed);
    await page.goto("/contracts", { waitUntil: "networkidle" });
    await page.waitForSelector("table tbody tr", { timeout: 20_000 });

    // Install monitor AFTER reaching contracts (login redirects would pollute log)
    await installNavigationMonitor(page);

    const rows = page.locator("table tbody tr");
    const rowCount = await rows.count();
    console.log(`[nav-jank] Found ${rowCount} contract rows`);

    // Helper: assert still on /contracts
    async function assertOnContracts(label: string) {
      const p = await getCurrentPath(page);
      if (!p.startsWith("/contracts")) {
        const log = await getNavLog(page);
        const nonContractNav = log.filter(
          (e: any) => e.url && typeof e.url === "string" && !String(e.url).includes("/contracts"),
        );
        console.error(
          `[nav-jank] ❌ BAD NAV at "${label}"! Path: ${p}`,
          `\nSuspicious navigations:\n${JSON.stringify(nonContractNav.slice(-5), null, 2)}`,
        );
        expect.soft(p, `Unexpected navigation at "${label}"`).toContain("/contracts");
      }
    }

    // ── Round 1: Rapid drawer open/close ──
    console.log("[nav-jank] Round 1: Rapid drawer open/close (10x)");
    for (let i = 0; i < Math.min(10, rowCount); i++) {
      await rows.nth(i).locator("td").first().click();
      await page.waitForTimeout(600);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }
    await assertOnContracts("round1-drawer-spam");

    // ── Round 2: Hover spam ──
    console.log("[nav-jank] Round 2: Hover spam (all rows)");
    for (let i = 0; i < Math.min(rowCount, 18); i++) {
      await rows.nth(i).hover();
      await page.waitForTimeout(80);
    }
    await assertOnContracts("round2-hover-spam");

    // ── Round 3: Tab switch + scroll + drawer ──
    console.log("[nav-jank] Round 3: Tab switch + scroll + drawer interactions");
    const tabButtons = page.locator("button").filter({ hasText: /^(Tất cả|Đang thực hiện|Chờ xử lý|Hoàn thành|Đã hủy)/ });
    const tabCount = await tabButtons.count();

    for (let round = 0; round < 4; round++) {
      // Switch tab
      if (tabCount > 1) {
        await tabButtons.nth((round + 1) % tabCount).click();
        await page.waitForTimeout(1200);
      }

      // Scroll main area
      await page.evaluate(() => {
        const main = document.getElementById("main-scroll") || document.querySelector("main");
        if (main) main.scrollTo(0, main.scrollHeight);
      });
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const main = document.getElementById("main-scroll") || document.querySelector("main");
        if (main) main.scrollTo(0, 0);
      });
      await page.waitForTimeout(400);

      // Open drawer on first available row
      const currentRows = await rows.count();
      if (currentRows > 0) {
        await rows.nth(0).locator("td").first().click();
        await page.waitForTimeout(800);

        // Click drawer tabs if present
        const drawerTabTexts = ["Sự kiện", "Checklist", "Nhân sự"];
        for (const tabText of drawerTabTexts) {
          const tab = page.locator(`button:has-text("${tabText}")`).first();
          if (await tab.isVisible({ timeout: 500 }).catch(() => false)) {
            await tab.click();
            await page.waitForTimeout(400);
          }
        }

        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
      }

      await assertOnContracts(`round3-iteration-${round}`);
    }

    // ── Round 4: Idle wait — catch async/Realtime-triggered redirects ──
    console.log("[nav-jank] Round 4: Idle wait (40s) — watching for async redirects");

    // Switch back to "Tất cả" tab, open a drawer, then idle
    if (tabCount > 0) {
      await tabButtons.nth(0).click();
      await page.waitForTimeout(1000);
    }
    const finalRows = await rows.count();
    if (finalRows > 0) {
      await rows.nth(0).locator("td").first().click();
      await page.waitForTimeout(500);
    }

    for (let sec = 0; sec < 40; sec += 5) {
      await page.waitForTimeout(5000);
      await assertOnContracts(`round4-idle-${sec + 5}s`);
    }

    // ── Final report ──
    const finalLog = await getNavLog(page);
    const suspicious = finalLog.filter(
      (e: any) => e.url && typeof e.url === "string" && !String(e.url).includes("/contracts"),
    );

    const finalPath = await getCurrentPath(page);
    console.log(`[nav-jank] ✅ Final path: ${finalPath}`);
    console.log(`[nav-jank] Total navigation events: ${finalLog.length}`);
    if (suspicious.length > 0) {
      console.log(`[nav-jank] ⚠️ Non-contracts navigations:\n${JSON.stringify(suspicious, null, 2)}`);
    } else {
      console.log("[nav-jank] ✅ No suspicious navigations detected");
    }

    expect(finalPath).toContain("/contracts");
  });
});
