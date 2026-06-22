# Playwright Best Practices (mood-studio)

Quy tắc vàng khi viết E2E test. Tuân thủ để test **nhanh, ổn định, dễ bảo trì**.

---

## 1. Không bao giờ dùng hard wait

### ❌ BAD — `waitForTimeout`
```ts
await page.click("button");
await page.waitForTimeout(2000); // ← tại sao 2s? 3s có work không?
await expect(page.locator(".toast")).toBeVisible();
```

### ✅ GOOD — đợi signal cụ thể
```ts
await page.click("button");
await expectToast(page, /thành công/i); // auto-wait + auto-retry
// hoặc:
await page.waitForURL(/\/dashboard$/);
// hoặc:
await page.getByText("Đã lưu").waitFor({ state: "visible" });
```

**Các signal nên đợi**:
| Signal | Dùng khi |
|--------|----------|
| `page.waitForURL(pattern)` | Sau click link/button navigate |
| `locator.waitFor({ state: "visible" })` | Element render xong |
| `expect(locator).toBeVisible()` | Auto-retry với timeout |
| `page.waitForLoadState("networkidle")` | Network xong (cuối test) |
| `page.waitForResponse(url)` | Đợi specific API call |
| `page.waitForRequest(url)` | Verify request đã gửi |

---

## 2. Locator-first (accessibility)

### ❌ BAD — CSS phức tạp
```ts
await page.locator("div.container > div.row > button.btn.btn-primary.submit").click();
```

### ✅ GOOD — Role/Text/Label
```ts
await page.getByRole("button", { name: /lưu|save/i }).click();
await page.getByLabel(/email/i).fill("a@example.com");
await page.getByText("Thành công").click();
await page.getByTestId("customer-row-123").click();
```

**Ưu tiên** (tốt nhất → tệ nhất):
1. `getByRole(role, { name })` — accessibility tree, robust nhất
2. `getByLabel(text)` — cho form inputs
3. `getByText(text)` — cho text content
4. `getByTestId(id)` — khi không có role/text phù hợp
5. `locator("css...")` — last resort

---

## 3. Parallel-safe data isolation

### ❌ BAD — shared data
```ts
test("...", async () => {
  await page.goto("/customers/E2E-CUST-001"); // ← có thể bị test khác xóa
});
```

### ✅ GOOD — unique marker
```ts
const MARKER = uniqueMarker(); // unique mỗi run

test("...", async () => {
  const code = `E2E-CUST-${MARKER}`;
  await seed({ contractCode: code });
  // cleanupTestData(admin, MARKER) sẽ xóa chính xác
});
```

**Nguyên tắc**:
- Mỗi test/describe tạo `MARKER` riêng
- Mọi test data embed marker: `E2E-${MARKER}-...`
- `cleanupTestData(admin, MARKER)` xóa theo LIKE pattern
## 5. Auto-retry với expect

### ❌ BAD — manual retry
```ts
let visible = false;
for (let i = 0; i < 10; i++) {
  if (await page.locator(".toast").isVisible()) {
    visible = true;
    break;
  }
  await page.waitForTimeout(500);
}
expect(visible).toBe(true);
```

### ✅ GOOD — expect tự retry
```ts
await expect(page.locator(".toast")).toBeVisible({ timeout: 5_000 });
// Auto-retry mỗi 100ms trong 5s, throw nếu vẫn fail
```

---

## 6. Form interactions

### ❌ BAD — typing từng ký tự
```ts
await page.locator("input").pressSequentially("hello", { delay: 100 });
```

### ✅ GOOD — fill() một lần
```ts
await page.getByLabel(/tên/i).fill("E2E Customer");
// Fill không trigger keyboard event → nhanh hơn ~10x
```

---

## 7. Mobile testing

### Touch gestures
```ts
// Tap
await page.tap(selector);

// Long press (chưa có built-in, dùng dispatchEvent)
const box = await element.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.waitForTimeout(800);
await page.mouse.up();
```

### Mobile-only tests
```ts
test("mobile drawer", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile-only test");
  // ...
});
```

### CPU throttle
```ts
const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
```

---

## 8. Debugging

### Trace viewer
```ts
// playwright.config.ts
use: {
  trace: "retain-on-failure", // ← save trace khi test fail
}

// Xem: npx playwright show-trace test-results/<test>/trace.zip
```

### Pause + step
```ts
await page.pause(); // ← mở inspector, step từng action
```

### Console capture
```ts
page.on("console", (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
page.on("pageerror", (err) => console.log(`[browser ERROR] ${err.message}`));
```

### Video recording
```ts
use: {
  video: "retain-on-failure", // ← video khi fail
}
```

---

## 9. CI/CD

### Skip webserver khi CI có URL riêng
```ts
const shouldStartWebServer = !process.env.PLAYWRIGHT_BASE_URL;
```

### Retry trên CI
```ts
retries: process.env.CI ? 2 : 0,
workers: process.env.CI ? 1 : undefined, // ← serial trên CI
```

### Workers song song trên dev
```ts
workers: process.env.CI ? 1 : undefined, // ← dùng max CPU khi dev
```

---

## 10. Common pitfalls

| Pitfall | Fix |
|---------|-----|
| Test flakey vì timing | Dùng `expect().toBeVisible()` thay `waitForTimeout` |
| Test pass locally fail CI | Dùng `retries`, `trace`, `screenshot` |
| Auth fail sau khi restart | Re-run setup project: `npx playwright test --project=setup` |
| Database leak | Cleanup trong `afterAll` + `sweepStaleE2EOrphans` |
| Selector thay đổi | Dùng `getByRole`/`getByLabel`, tránh CSS |
| Race condition parallel | Marker unique + cleanup theo marker |
| Animation flicker | Đợi transition end: `await locator.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)))` |

---

## Quick checklist trước khi commit

- [ ] Không có `waitForTimeout` (trừ 200ms buffer cuối test cho hydration)
- [ ] Locator dùng `getByRole` / `getByLabel` / `getByText` / `getByTestId`
- [ ] Test data có marker unique
- [ ] `cleanupTestData` trong `afterAll`
- [ ] `assertNoConsoleErrors` + `assertNoFailedRequests` trong `afterEach`
- [ ] Không hard-code URL/path ngắn (dùng `baseURL` + relative path)
- [ ] Test pass local + pass CI với retries
- [ ] Trace + video chỉ save on failure (không tốn disk)

- KHÔNG share mutable state giữa tests

---

## 4. Đợi network thay vì đợi thời gian

### ❌ BAD — chờ animation
```ts
await page.click("button");
await page.waitForTimeout(1000); // animation
await expect(page.locator(".result")).toBeVisible();
```

### ✅ GOOD — chờ response
```ts
const [response] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/api/save") && r.status() === 200),
  page.click("button"),
]);
const data = await response.json();
expect(data.success).toBe(true);
```

---

