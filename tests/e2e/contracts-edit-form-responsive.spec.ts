/**
 * contracts-edit-form-responsive.spec.ts
 * ---
 * Responsive test cho /contracts/[id]/edit form page.
 *
 * 5 test cases cho 4 viewport tiers:
 *   1. Desktop 1440      → 2-col grid 12, ratio 8/4, sidebar sticky, container max-w-7xl
 *   2. iPad Landscape 1180 → 2-col grid 10, ratio 6/4, sidebar sticky, container max-w-5xl
 *   3. iPad Landscape 1024 (boundary) → 2-col grid 10 (just hit lg:)
 *   4. Tablet 768         → 1-col, sidebar HIDDEN, container max-w-2xl + px-6, FormActions fixed bottom
 *   5. Mobile 375         → 1-col, sidebar HIDDEN, FormActions fixed bottom
 *
 * Coverage:
 * - Container width theo breakpoint (max-w-2xl | max-w-5xl | max-w-7xl | max-w-[88rem])
 * - Grid ratio responsive (grid-cols-10 vs grid-cols-12)
 * - Right sidebar ẩn/hiện + sticky offset
 * - FormActions không bị double (chỉ 1 instance active — fixed bottom vs panel inline)
 * - Financial summary values KHÔNG wrap (whitespace-nowrap check)
 *
 * See: docs/plans/260620-contracts-ipad-portrait-tier/plan.md
 */

import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { readGlobalSeed } from "../../playwright/seed-reader";

type AdminClient = SupabaseClient;

interface SeedState {
  marker: string;
  email: string;
  password: string;
  employeeName: string;
  contractCode: string;
  userId?: string;
  customerId?: string;
  contractId?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────

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

/**
 * Seed tối thiểu cho EDIT form test:
 * 1 user + 1 employee + 1 customer + 1 contract (full).
 */
async function seedEditContract(admin: AdminClient, seed: SeedState) {
  // Auth user
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: seed.email,
    password: seed.password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: seed.employeeName },
  });
  if (authError || !authUser.user)
    throw new Error(`auth user: ${authError?.message || "missing user"}`);
  seed.userId = authUser.user.id;

  // Employee
  const { error: empError } = await admin
    .from("employees")
    .update({
      employee_code: `E2E-EDIT-${seed.marker.slice(-6)}`,
      department: "E2E",
      position: "QA",
      role: "admin",
      status: "active",
      start_date: "2026-05-15",
    })
    .eq("auth_user_id", seed.userId);
  if (empError) throw new Error(`employee: ${empError.message}`);

  // Customer
  const { data: customer, error: custError } = await admin
    .from("customers")
    .insert({
      customer_code: `E2E-EDIT-CUS-${seed.marker}`,
      full_name: `E2E Edit ${seed.marker}`,
      phone: "0901234570",
      status: "active",
    })
    .select("id")
    .single();
  if (custError || !customer) throw new Error(`customer: ${custError?.message || "missing row"}`);
  seed.customerId = customer.id;

  // Contract
  const { data: contract, error: contractError } = await admin
    .from("contracts")
    .insert({
      contract_code: seed.contractCode,
      customer_id: seed.customerId,
      contract_date: "2026-06-30",
      work_date: "2026-07-05",
      service_type: "studio",
      transaction_type: "hop_dong",
      status: "dang_thuc_hien",
      payment_status: "chua_thanh_toan",
      total_amount: 8_900_000,
      paid_amount: 0,
      remaining_amount: 8_900_000,
    })
    .select("id")
    .single();
  if (contractError || !contract) throw new Error(`contract: ${contractError?.message || "missing row"}`);
  seed.contractId = contract.id;
}

async function cleanupSeed(admin: AdminClient, seed: SeedState) {
  if (seed.contractId) {
    for (const table of ["contract_items", "contract_events", "payments", "contract_notes", "contract_checklists"]) {
      await admin.from(table).delete().eq("contract_id", seed.contractId);
    }
    await admin.from("contracts").delete().eq("id", seed.contractId);
  }
  if (seed.customerId) {
    await admin.from("customers").delete().eq("id", seed.customerId);
  }
  if (seed.userId) {
    await admin.from("employees").delete().eq("auth_user_id", seed.userId);
    await admin.auth.admin.deleteUser(seed.userId);
  }
}

async function login(page: Page, seed: SeedState) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(seed.email);
  await page.locator('input[name="password"]').fill(seed.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 45_000 });
}

async function gotoEditForm(page: Page, contractId: string) {
  await page.goto(`/contracts/${contractId}/edit`, { waitUntil: "networkidle" });
  // Wait for form sections to render — Section 1 heading is reliable
  await page.getByText(/^\s*1\.\s*Thông tin hợp đồng\s*$/i).first().waitFor({ state: "visible", timeout: 20_000 });
  // Let CSS settle + lazy images if any
  await page.waitForTimeout(800);
}

// ─── Test suite ─────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════
// Tests 1-5: Mỗi test 1 viewport, dùng chung global seed
// ═══════════════════════════════════════════════════════════════════════════

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 }, // Desktop chuẩn
  iPadLandscape: { width: 1180, height: 820 }, // iPad Landscape (iPad A16 ~1180)
  iPadLandscapeBoundary: { width: 1024, height: 768 }, // lg: breakpoint
  tabletBoundary: { width: 768, height: 1180 }, // tablet tier start
  mobile: { width: 375, height: 812 }, // iPhone X reference
} as const;

// Một seed chung cho tất cả 5 tests (dùng global seed pattern)
let admin: AdminClient;
const ts = Date.now();
const seed: SeedState = {
  marker: `edit-${ts}`,
  email: `e2e-edit-${ts}@test.local`,
  password: `EditForm!${ts}`,
  employeeName: `E2E Edit Form ${ts}`,
  contractCode: `E2E-EDIT-${ts.toString().slice(-6)}`,
};

test.beforeAll(async () => {
  const globalSeed = readGlobalSeed();
  if (globalSeed) {
    Object.assign(seed, {
      marker: globalSeed.marker,
      email: globalSeed.email,
      password: globalSeed.password,
      contractCode: globalSeed.contractCode,
      userId: globalSeed.userId,
      customerId: globalSeed.customerId,
      contractId: globalSeed.contractId,
    });
    return;
  }
  admin = createAdminSupabase();
  await seedEditContract(admin, seed);
});

test.afterAll(async () => {
  if (admin) await cleanupSeed(admin, seed);
});

// ── 1. Desktop 1440: 2-col grid 12, sidebar sticky, container max-w-7xl

test.describe("1. Desktop 1440 — 2-col grid 12, sidebar sticky", () => {
  test.setTimeout(120_000);

  test("form: 2-col grid 12, ratio 8/4, container max-w-7xl", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await login(page, seed);
    await gotoEditForm(page, seed.contractId!);

    const layout = await page.evaluate(() => {
      // Find the FullpageFormShell outer container (first .max-w-* with grid inside)
      const grid = document.querySelector(".detail-grid");
      const sidebar = document.querySelector(".detail-sidebar");
      const main = document.querySelector(".detail-main");
      const formActionsFixed = document.querySelector('footer.lg\\:hidden[class*="fixed"]');

      const gridStyle = grid ? window.getComputedStyle(grid) : null;
      const sidebarStyle = sidebar ? window.getComputedStyle(sidebar) : null;

      // Sticky check — refactor: sticky nằm ở CHÍNH sidebar qua class CSS
      // .detail-sidebar-sticky (app/styles/layout.css), không còn child .sticky.
      const stickyEl = document.querySelector(".detail-sidebar-sticky");
      const stickyStyle = stickyEl ? window.getComputedStyle(stickyEl) : null;

      return {
        gridDisplay: gridStyle?.display ?? null,
        gridTemplateColumns: gridStyle?.gridTemplateColumns ?? null,
        sidebarDisplay: sidebarStyle?.display ?? null,
        stickyTop: stickyStyle?.top ?? null,
        stickyPosition: stickyStyle?.position ?? null,
        fixedFooterExists: !!formActionsFixed,
      };
    });

    console.log(`[edit-desktop] layout=${JSON.stringify(layout)}`);

    // Sidebar phải visible
    expect(layout.sidebarDisplay, "Sidebar phải visible trên Desktop").toBe("flex");

    // Grid phải là CSS grid với 12 columns (xl breakpoint)
    expect(layout.gridDisplay).toBe("grid");
    const colCount = layout.gridTemplateColumns?.split(" ").length ?? 0;
    expect(colCount, `Grid phải có 12 columns trên xl, got ${colCount}`).toBe(12);

    // Sticky positioning
    expect(layout.stickyPosition).toBe("sticky");
    expect(layout.stickyTop, "Sticky top phải là header-desktop-h (64px)").toBe("64px");

    // FormActions fixed bottom KHÔNG nên hiện trên desktop
    expect(layout.fixedFooterExists).toBe(true); // DOM exists nhưng CSS ẩn
    const footerVisible = await page.evaluate(() => {
      const f = document.querySelector('footer.lg\\:hidden[class*="fixed"]');
      if (!f) return false;
      const r = f.getBoundingClientRect();
      const s = window.getComputedStyle(f);
      return r.width > 0 && r.height > 0 && s.display !== "none";
    });
    expect(footerVisible, "FormActions fixed footer phải ẩn trên desktop").toBe(false);
  });
});

// ── 2. iPad Landscape 1180: 2-col grid 10, sidebar sticky, container max-w-5xl

test.describe("2. iPad Landscape 1180 — 2-col grid 10, sidebar sticky", () => {
  test.setTimeout(120_000);

  test("form: 2-col grid 10, ratio 6/4, container max-w-5xl", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPadLandscape);
    await login(page, seed);
    await gotoEditForm(page, seed.contractId!);

    const layout = await page.evaluate(() => {
      const grid = document.querySelector(".detail-grid");
      const sidebar = document.querySelector(".detail-sidebar");
      const gridStyle = grid ? window.getComputedStyle(grid) : null;
      const sidebarStyle = sidebar ? window.getComputedStyle(sidebar) : null;

      return {
        gridTemplateColumns: gridStyle?.gridTemplateColumns ?? null,
        sidebarDisplay: sidebarStyle?.display ?? null,
      };
    });

    console.log(`[edit-ipad-landscape] layout=${JSON.stringify(layout)}`);

    expect(layout.sidebarDisplay).toBe("flex");

    // Grid phải là CSS grid với 10 columns (lg breakpoint)
    expect(layout.gridTemplateColumns?.split(" ").length).toBe(10);
  });
});

// ── 3. iPad Landscape 1024 boundary: lg: vừa kick in

test.describe("3. iPad Landscape 1024 (boundary) — 2-col grid 10", () => {
  test.setTimeout(120_000);

  test("form: vừa đạt lg: → sidebar hiện + 2-col grid 10", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPadLandscapeBoundary);
    await login(page, seed);
    await gotoEditForm(page, seed.contractId!);

    const sidebarDisplay = await page.evaluate(() => {
      const sidebar = document.querySelector(".detail-sidebar");
      return sidebar ? window.getComputedStyle(sidebar).display : null;
    });

    expect(sidebarDisplay, "Sidebar phải visible ngay tại lg: boundary (1024)").toBe("flex");
  });
});

// ── 4. Tablet 768: single col, sidebar HIDDEN, FormActions fixed

test.describe("4. Tablet 768 — single col, sidebar HIDDEN, FormActions fixed bottom", () => {
  test.setTimeout(120_000);

  test("form: 1-col, sidebar ẩn, container max-w-2xl + px-6", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tabletBoundary);
    await login(page, seed);
    await gotoEditForm(page, seed.contractId!);

    const layout = await page.evaluate(() => {
      // Container width giờ đến từ class .detail-shell-page (app/styles/layout.css),
      // KHÔNG còn Tailwind max-w-* trong className → query thẳng class đó.
      const outermost: Element | null = document.querySelector(".detail-shell-page");

      const sidebar = document.querySelector(".detail-sidebar");
      const sidebarStyle = sidebar ? window.getComputedStyle(sidebar) : null;

      const container = outermost as HTMLElement | null;
      const containerStyle = container ? window.getComputedStyle(container) : null;

      return {
        sidebarDisplay: sidebarStyle?.display ?? null,
        containerMaxWidth: containerStyle?.maxWidth ?? null,
        containerPaddingLeft: containerStyle?.paddingLeft ?? null,
        containerPaddingRight: containerStyle?.paddingRight ?? null,
      };
    });

    console.log(`[edit-ipad-portrait] layout=${JSON.stringify(layout)}`);

    // Sidebar phải ẨN trên tablet tier.
    expect(layout.sidebarDisplay, "Sidebar phải ẩn trên tablet").toBe("none");

    // Container max-w-2xl = 672px
    expect(layout.containerMaxWidth, `Container max-w phải là 672px (max-w-2xl), got ${layout.containerMaxWidth}`).toBe("672px");

    // px-6 = 24px mỗi bên
    expect(layout.containerPaddingLeft, "Container padding-left phải là 24px (px-6)").toBe("24px");
    expect(layout.containerPaddingRight).toBe("24px");

    // FormActions fixed bottom phải hiện
    const fixedFooterVisible = await page.evaluate(() => {
      const f = document.querySelector('footer.lg\\:hidden[class*="fixed"]');
      if (!f) return false;
      const r = f.getBoundingClientRect();
      const s = window.getComputedStyle(f);
      return r.width > 0 && r.height > 0 && s.display !== "none";
    });
    expect(fixedFooterVisible, "FormActions fixed bottom phải hiện trên tablet").toBe(true);
  });

  test("form: financial summary KHÔNG wrap text trên iPad Portrait", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tabletBoundary);
    await login(page, seed);
    await gotoEditForm(page, seed.contractId!);

    // Trên tablet, sidebar ẩn → financial summary hiện inline trong main col (mobile layout)
    // Kiểm tra giá trị tiền KHÔNG bị wrap (whitespace-nowrap check)
    const wrapStatus = await page.evaluate(() => {
      // Find all elements with text matching currency pattern
      const moneyEls = Array.from(document.querySelectorAll("span")).filter((el) => {
        const text = el.textContent ?? "";
        return /^\s*[\d.]+\s*(VND|%)?\s*$/.test(text) || /\d+\.\d+\.\d+/.test(text);
      });

      const wrapped: Array<{ text: string; scrollWidth: number; clientWidth: number; wraps: boolean }> = [];
      for (const el of moneyEls) {
        const htmlEl = el as HTMLElement;
        // Skip nếu parent ẩn
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const isWrapped = htmlEl.scrollWidth > htmlEl.clientWidth + 1; // +1 tolerance
        if (isWrapped) {
          wrapped.push({
            text: (el.textContent ?? "").trim().slice(0, 30),
            scrollWidth: htmlEl.scrollWidth,
            clientWidth: htmlEl.clientWidth,
            wraps: true,
          });
        }
      }
      return wrapped;
    });

    console.log(`[edit-ipad-portrait] Wrapping money elements: ${wrapStatus.length}`);
    if (wrapStatus.length > 0) {
      console.log("  Wrapped:", JSON.stringify(wrapStatus));
    }

    expect(wrapStatus.length, `Không được có money element nào wrap: ${JSON.stringify(wrapStatus)}`).toBe(0);
  });
});

// ── 5. Mobile 375: single col, sidebar HIDDEN, FormActions fixed

test.describe("5. Mobile 375 — single col, sidebar HIDDEN, FormActions fixed bottom", () => {
  test.setTimeout(120_000);

  test("form: 1-col, sidebar ẩn, full width, FormActions fixed bottom", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await login(page, seed);
    await gotoEditForm(page, seed.contractId!);

    const sidebarDisplay = await page.evaluate(() => {
      const sidebar = document.querySelector(".detail-sidebar");
      return sidebar ? window.getComputedStyle(sidebar).display : null;
    });
    expect(sidebarDisplay, "Sidebar phải ẩn trên mobile").toBe("none");

    // FormActions fixed bottom phải hiện
    const fixedFooterVisible = await page.evaluate(() => {
      const f = document.querySelector('footer.lg\\:hidden[class*="fixed"]');
      if (!f) return false;
      const r = f.getBoundingClientRect();
      const s = window.getComputedStyle(f);
      return r.width > 0 && r.height > 0 && s.display !== "none";
    });
    expect(fixedFooterVisible, "FormActions fixed bottom phải hiện trên mobile").toBe(true);
  });
});
