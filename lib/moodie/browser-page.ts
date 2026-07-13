import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { getMoodieBrowserRuntimeConfig } from "@/lib/moodie/browser-config";

const MAX_TEXT_CHARS = 16_000;
const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal"]);

function isPrivateIp(address: string) {
  if (!isIP(address)) return true;
  return /^(?:10\.|127\.|169\.254\.|192\.168\.|0\.|::1$|fc|fd|fe80)/i.test(address)
    || /^172\.(?:1[6-9]|2\d|3[01])\./.test(address);
}

async function assertPublicUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Browser chỉ hỗ trợ URL http/https");
  }
  if (url.username || url.password) throw new Error("URL không được chứa thông tin đăng nhập");
  if (BLOCKED_HOSTS.has(url.hostname.toLowerCase())) throw new Error("Không được truy cập host nội bộ");
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => isPrivateIp(entry.address))) {
    throw new Error("Không được truy cập địa chỉ mạng riêng hoặc không xác định");
  }
  return url;
}

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_CHARS);
}

async function browseWithCloak(url: URL, timeoutMs: number, cdpUrl?: string, cdpToken?: string) {
  if (!cdpUrl) return null;

  const { chromium } = await import("playwright-core");
  const browser = await chromium.connectOverCDP(cdpUrl, {
    timeout: timeoutMs,
    headers: cdpToken ? { Authorization: `Bearer ${cdpToken}` } : undefined,
  });
  const context = browser.contexts()[0] || await browser.newContext();
  const page = await context.newPage();
  await page.route("**/*", async (route) => {
    try {
      await assertPublicUrl(route.request().url());
      await route.continue();
    } catch {
      await route.abort("blockedbyclient");
    }
  });
  try {
    await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForLoadState("networkidle", { timeout: Math.min(timeoutMs, 5_000) }).catch(() => {});
    return {
      url: page.url(),
      title: await page.title(),
      text: compactText(await page.locator("body").innerText({ timeout: 5_000 })),
      engine: "cloakbrowser" as const,
    };
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

async function browseWithFetch(initialUrl: URL, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let url = initialUrl;
    let response: Response | null = null;
    for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
      response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "Moodie/1.0 (+studio assistant)" },
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      if (!location) throw new Error("Trang chuyển hướng nhưng thiếu Location");
      if (redirectCount === 5) throw new Error("Trang chuyển hướng quá nhiều lần");
      url = await assertPublicUrl(new URL(location, url).toString());
    }
    if (!response) throw new Error("Không nhận được phản hồi từ trang");
    if (!response.ok) throw new Error(`Trang trả HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      throw new Error("Trang không trả nội dung văn bản/HTML");
    }
    const html = (await response.text()).slice(0, 1_000_000);
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/<[^>]+>/g, " ") || url.hostname;
    const text = compactText(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">"),
    );
    return { url: response.url, title: compactText(title), text, engine: "fetch" as const };
  } finally {
    clearTimeout(timeout);
  }
}

export async function browseMoodiePage(input: { url: string; timeoutMs?: number }) {
  const [url, config] = await Promise.all([
    assertPublicUrl(input.url),
    getMoodieBrowserRuntimeConfig(),
  ]);
  if (!config.enabled) throw new Error("Browser của Moodie đang bị tắt trong Cài đặt");
  const timeoutMs = Math.max(3_000, Math.min(input.timeoutMs || config.timeoutMs, 30_000));
  let cloakError: string | undefined;
  const cloakResult = await browseWithCloak(url, timeoutMs, config.cdpUrl, config.cdpToken).catch((error) => {
    cloakError = error instanceof Error ? error.message : String(error);
    return null;
  });
  const result = cloakResult || await browseWithFetch(url, timeoutMs);
  if (!result.text) throw new Error("Không đọc được nội dung hữu ích từ trang");
  return {
    ...result,
    preferredEngine: config.cdpUrl ? "cloakbrowser" as const : "fetch" as const,
    fallbackReason: cloakResult ? undefined : cloakError,
  };
}
