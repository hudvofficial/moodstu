/**
 * #30a (T-20260906-bang-hd-desktop) — bảng hợp đồng desktop tự co theo bề rộng KHUNG bảng.
 * Kiểm: không tràn ngang ở 1280/1366/1440/1536/1920 · cột "Trạng thái" luôn thấy · số cột theo khung
 * (6 khi < 880px, 7 khi 880–1079, 8 khi ≥ 1080 với role có finance) · sidebar thu ở 1366 → 8 cột ·
 * khung ép 800px → 6 cột · tablet @1024 và phone @390 không đổi. Chụp screenshots/contracts-desktop/.
 * Seed 1 auth user admin (department E2E), KHÔNG tạo hợp đồng — dùng dữ liệu thật đang có; dọn ở afterAll.
 * Chạy: $env:ALLOW_PROD_WRITE="1"; $env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000"; npx playwright test tests/e2e/contracts-table-desktop.spec.ts --project=chromium
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { sweepStaleE2EOrphans } from "./e2e-sweep";

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] ??= value;
  }
}
function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}
function admin(): SupabaseClient {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const SHOTS = path.resolve("screenshots/contracts-desktop");
const ts = Date.now();
const seed = { email: `e2e-tbl-${ts}@test.local`, password: `Tbl!${ts}`, userId: "" };
let db: SupabaseClient;

type Measure = { cols: number; visibleHeaders: string[]; widths: number[]; maxColShare: number; tableW: number; frameW: number; overflow: number; statusVisible: boolean; statusRightInFrame: boolean };

async function measure(page: Page): Promise<Measure> {
  await page.waitForSelector("table thead th", { timeout: 30_000 });
  await page.waitForTimeout(600);
  return page.evaluate(() => {
    const table = document.querySelector("table")!;
    const scroller = table.parentElement!;
    const ths = [...table.querySelectorAll("thead th")] as HTMLElement[];
    const visible = ths.filter((th) => getComputedStyle(th).display !== "none");
    const status = visible.find((th) => (th.textContent || "").trim() === "Trạng thái");
    const frame = scroller.getBoundingClientRect();
    const sr = status?.getBoundingClientRect();
    const widths = visible.map((th) => Math.round(th.getBoundingClientRect().width));
    return {
      cols: visible.length,
      visibleHeaders: visible.map((th) => (th.textContent || "").trim() || "›"),
      widths,
      // phần dư màn rộng phải chia đều theo tỷ lệ — không cột nào được nuốt > 40% khung (lỗi cột auto, chủ bắt 06/09)
      maxColShare: Math.max(...widths) / scroller.clientWidth,
      tableW: table.scrollWidth,
      frameW: scroller.clientWidth,
      overflow: table.scrollWidth - scroller.clientWidth,
      statusVisible: Boolean(status),
      statusRightInFrame: Boolean(sr && sr.right <= frame.right + 1),
    };
  });
}

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(seed.email);
  await page.locator('input[name="password"]').fill(seed.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 45_000 });
  await Promise.race([page.waitForEvent("load"), page.waitForTimeout(4000)]);
}

test.describe.serial("#30a — bảng HĐ desktop tự co theo khung", () => {
  test.setTimeout(240_000);

  test.beforeAll(async () => {
    db = admin();
    await sweepStaleE2EOrphans(db);
    const { data: au, error } = await db.auth.admin.createUser({
      email: seed.email, password: seed.password, email_confirm: true,
      app_metadata: { role: "admin" }, user_metadata: { full_name: `E2E Table ${ts}` },
    });
    if (error || !au.user) throw new Error(`auth: ${error?.message}`);
    seed.userId = au.user.id;
    const { error: ee } = await db.from("employees").update({
      employee_code: `E2E-TBL-${String(ts).slice(-6)}`, department: "E2E", position: "QA", role: "admin", status: "active", start_date: "2026-05-15",
    }).eq("auth_user_id", seed.userId);
    if (ee) throw new Error(`employee: ${ee.message}`);
    mkdirSync(SHOTS, { recursive: true });
  });

  test.afterAll(async () => {
    if (!db || !seed.userId) return;
    await db.from("employees").delete().eq("auth_user_id", seed.userId);
    await db.auth.admin.deleteUser(seed.userId);
    await sweepStaleE2EOrphans(db);
  });

  test("desktop 1280–1920: không tràn, Trạng thái luôn thấy, 7/8 cột theo khung", async ({ page }) => {
    await login(page);
    const log: string[] = [];
    for (const w of [1280, 1366, 1440, 1536, 1920]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto("/contracts?status=all");
      const m = await measure(page);
      log.push(`@${w}: ${m.cols} cột · bảng ${m.tableW} / khung ${m.frameW} · tràn ${m.overflow} · ${m.visibleHeaders.map((h, i) => `${h}:${m.widths[i]}`).join(" · ")}`);
      expect(m.overflow, `@${w} tràn`).toBeLessThanOrEqual(0);
      expect(m.maxColShare, `@${w} cột rộng nhất chiếm ${Math.round(m.maxColShare * 100)}% khung`).toBeLessThanOrEqual(0.4);
      expect(m.statusVisible && m.statusRightInFrame, `@${w} cột Trạng thái trong khung`).toBe(true);
      // admin có finance: 7 cột khi khung 880–1079, 8 cột khi khung ≥ 1080
      expect(m.cols, `@${w} số cột theo khung ${m.frameW}`).toBe(m.frameW >= 1080 ? 8 : m.frameW >= 880 ? 7 : 6);
      await page.screenshot({ path: path.join(SHOTS, `${w}.png`) });
    }
    console.log(log.join("\n"));
  });

  test("1366 + sidebar thu → khung rộng hơn → 8 cột", async ({ page }) => {
    await login(page);
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto("/contracts?status=all");
    const before = await measure(page);
    // Nút thu sidebar: aria-label "Thu gọn menu" (components/layout/sidebar.tsx:192)
    await page.getByRole("button", { name: "Thu gọn menu" }).click();
    await page.waitForTimeout(500);
    const after = await measure(page);
    console.log(`sidebar mở: khung ${before.frameW} → ${before.cols} cột · sidebar thu: khung ${after.frameW} → ${after.cols} cột`);
    expect(after.frameW).toBeGreaterThan(before.frameW + 100);
    expect(after.overflow).toBeLessThanOrEqual(0);
    expect(after.cols).toBe(8);
    await page.screenshot({ path: path.join(SHOTS, "1366-sidebar-thu.png") });
  });

  test("khung bảng ép xuống 800px → 6 cột (ẩn Sự kiện), không tràn", async ({ page }) => {
    // Zoom trình duyệt ở 1280 đưa viewport CSS < 1280 → TierSwitch chuyển sang bảng tablet (đúng thiết kế),
    // nên tầng 6 cột chỉ xuất hiện khi KHUNG hẹp mà viewport vẫn ≥ 1280 (panel phụ, sidebar rộng hơn sau này).
    // Chứng minh container query bằng cách ép bề rộng vùng cuộn — đúng tín hiệu mà CSS @container đọc.
    await login(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/contracts?status=all");
    await page.waitForSelector("table thead th", { timeout: 30_000 });
    await page.evaluate(() => {
      const scroller = document.querySelector("table")!.parentElement as HTMLElement;
      scroller.style.width = "800px";
    });
    await page.waitForTimeout(600);
    const m = await measure(page);
    console.log(`khung ép 800: khung ${m.frameW} → ${m.cols} cột · tràn ${m.overflow} · ${m.visibleHeaders.join(" · ")}`);
    expect(m.frameW).toBeLessThan(880);
    expect(m.cols).toBe(6);
    expect(m.visibleHeaders).not.toContain("Sự kiện");
    expect(m.statusVisible && m.statusRightInFrame).toBe(true);
    expect(m.overflow).toBeLessThanOrEqual(0);
    await page.screenshot({ path: path.join(SHOTS, "1280-khung-800.png") });
  });

  test("đợt 2: mặc định tab Đang thực hiện · HĐ xong hàng gọn · lợi nhuận — khi chưa chi phí · tab không cắt @1280", async ({ page }) => {
    await login(page);
    await page.setViewportSize({ width: 1280, height: 900 });

    // (a) /contracts không tham số → tab "Đang thực hiện" active, mọi chip trong bảng = Đang thực hiện
    await page.goto("/contracts");
    await page.waitForSelector("table thead th", { timeout: 30_000 });
    await page.waitForTimeout(600);
    const activeTab = page.locator('[role="tab"][aria-selected="true"], button[aria-pressed="true"], [data-state="active"]').first();
    const activeText = (await activeTab.count()) ? (await activeTab.innerText()).trim() : "";
    const chips = await page.locator("table tbody tr .badge").allInnerTexts();
    const statusChips = chips.map((t) => t.trim().toUpperCase()).filter((t) => /ĐANG THỰC HIỆN|HOÀN THÀNH|CHỜ XỬ LÝ|ĐÃ HỦY/.test(t));
    console.log(`mặc định: tab active "${activeText}" · ${statusChips.length} chip trạng thái · khác "Đang thực hiện": ${statusChips.filter((t) => !t.includes("ĐANG THỰC HIỆN")).length}`);
    expect(statusChips.length).toBeGreaterThan(0);
    expect(statusChips.every((t) => t.includes("ĐANG THỰC HIỆN"))).toBe(true);

    // (d) @1280 tab cuối "Đã hủy" nằm trong khung (không bị overflow-hidden cắt)
    const lastTab = page.getByText(/^Đã hủy/).first();
    await expect(lastTab).toBeVisible();
    const box = await lastTab.boundingBox();
    expect(box && box.x + box.width <= 1280).toBe(true);

    // (b)+(c) tab Hoàn thành: hàng gọn (không pill 2 dòng) + lợi nhuận "—" khi chưa có chi phí
    await page.goto("/contracts?status=hoan_thanh");
    await page.waitForSelector("table tbody tr", { timeout: 30_000 });
    await page.waitForTimeout(600);
    const rowHeights = await page.locator("table tbody tr").evaluateAll((rows) => rows.slice(0, 10).map((r) => Math.round(r.getBoundingClientRect().height)));
    const doneMarks = await page.locator("table tbody tr td [title*='hoàn tất']").count();
    console.log(`HĐ xong: chiều cao hàng ${rowHeights.join("/")} · dấu ✓ n/n: ${doneMarks}`);
    expect(Math.max(...rowHeights)).toBeLessThanOrEqual(52);
    expect(doneMarks).toBeGreaterThan(0);
    // ép khung ≥ 1080 để cột Lợi nhuận hiện, rồi kiểm "Chưa ghi chi phí" xuất hiện khi có HĐ chi phí 0
    await page.evaluate(() => { (document.querySelector("table")!.parentElement as HTMLElement).style.width = "1100px"; });
    await page.waitForTimeout(400);
    const noCost = await page.locator("table tbody tr td[title*=\"Chưa ghi chi phí\"], table tbody tr td div[title*=\"Chưa ghi chi phí\"]").count();
    const withCost = await page.locator("table tbody tr").filter({ hasText: /Chi phí \d/ }).count();
    console.log(`Lợi nhuận: ${noCost} hàng "—" (chi phí 0) · ${withCost} hàng có chi phí`);
    expect(noCost + withCost).toBeGreaterThan(0);
    await page.screenshot({ path: path.join(SHOTS, "1280-hoan-thanh-gon.png") });
  });

  test("tablet @1024 và phone @390 không đổi", async ({ page }) => {
    await login(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/contracts?status=all");
    const t = await measure(page);
    console.log(`@1024 (tablet): ${t.cols} cột · bảng ${t.tableW} / khung ${t.frameW} · ${t.visibleHeaders.join(" · ")}`);
    expect(t.cols).toBe(5);
    expect(t.visibleHeaders[0]).toBe("Mã HĐ");
    await page.screenshot({ path: path.join(SHOTS, "1024-tablet.png") });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/contracts?status=all");
    await page.waitForSelector(".card-base", { timeout: 30_000 });
    await page.waitForTimeout(600);
    expect(await page.locator("table").count()).toBe(0);
    expect(await page.locator("button.card-base").count()).toBeGreaterThan(0);
    await page.screenshot({ path: path.join(SHOTS, "390-phone.png") });
  });
});
