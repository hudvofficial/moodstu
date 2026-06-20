/**
 * QA script: Contracts Tablet List V3
 * Usage: QA_BASE_URL=http://127.0.0.1:3000 QA_USER=admin QA_PASS=xxx node scripts/qa-contracts-tablet.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3000";
const user = process.env.QA_USER ?? "admin";
const pass = process.env.QA_PASS;
if (!pass) { console.error("QA_PASS env required"); process.exit(1); }

const VIEWPORTS = [
  { name: "portrait",  width: 820,  height: 1180 },
  { name: "landscape", width: 1180, height: 820  },
];

async function login(page) {
  await page.goto(baseUrl + "/login", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('input[name="email"]', { state: "visible", timeout: 15000 });
  await page.fill('input[name="email"]', user);
  await page.fill('input[name="password"]', pass);
  await page.waitForTimeout(1200);
  // Wait for React to naturally hide the splash screen (proves hydration is complete)
  await page.waitForSelector('#splash-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});
  await page.click('button[type="submit"]');
  await page.waitForTimeout(6000);
  if (page.url().includes('/login')) {
    const body = await page.textContent('body').catch(() => '');
    throw new Error(`Login did not leave /login. Body snippet: ${(body || '').slice(0, 500)}`);
  }
}

async function captureContracts(page, label) {
  await page.goto(baseUrl + "/contracts", { waitUntil: "domcontentloaded", timeout: 30000 });
  // Wait for table or empty state
  await page.waitForSelector("table, [data-empty-state]", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);

  const metrics = await page.evaluate(() => {
    const sidebar = document.querySelector("aside, nav[aria-label]");
    const table   = document.querySelector("table");
    const ths     = table ? [...table.querySelectorAll("thead th")] : [];
    const paginationEl = document.querySelector("[data-pagination], nav[aria-label='pagination']");
    return {
      sidebarWidth: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : null,
      tableWidth: table ? Math.round(table.getBoundingClientRect().width) : null,
      colCount: ths.length,
      columns: ths.map(th => ({ text: th.textContent?.trim(), width: Math.round(th.getBoundingClientRect().width) })),
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      windowWidth: window.innerWidth,
      paginationHeight: paginationEl ? Math.round(paginationEl.getBoundingClientRect().height) : null,
    };
  });

  console.log(`\n── ${label} ──`);
  console.log(JSON.stringify(metrics, null, 2));

  const overflow = metrics.docScrollWidth - metrics.windowWidth;
  console.log(`  overflow: ${overflow}px ${overflow <= 4 ? "✅" : "❌ OVERFLOW"}`);
  console.log(`  sidebar: ${metrics.sidebarWidth}px ${metrics.sidebarWidth === 80 ? "✅" : "⚠️"}`);
  console.log(`  table: ${metrics.tableWidth}px ${metrics.tableWidth <= 860 ? "✅" : "⚠️ >860"}`);
  console.log(`  columns: ${metrics.colCount} ${metrics.colCount === 5 ? "✅" : "⚠️ expected 5"}`);

  mkdirSync("qa-results", { recursive: true });
  await page.screenshot({ path: `qa-results/contracts-${label}.png`, fullPage: false });
  console.log(`  screenshot → qa-results/contracts-${label}.png`);
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({ serviceWorkers: "block" });


  for (const vp of VIEWPORTS) {
    
    const page = await context.newPage({ viewport: { width: vp.width, height: vp.height } });
    await login(page);
    await captureContracts(page, vp.name);
    
  }

  await browser.close();
  console.log("\nQA done.");
})();
