---
name: "playwright-e2e-boilerplate"
description: "Paste-ready Playwright E2E template: helpers (login via storageState/env, cleanup, common assertions), boilerplate spec, mobile projects (iOS Safari, Android Chrome), best practices (no hard wait, locator-first, parallel-safe). Designed for mood-studio testDir=./tests/e2e, Supabase admin client, E2E- prefix data isolation."
---

# Playwright E2E Boilerplate

Skill tạo spec E2E **paste-ready** cho mood-studio. M3 chỉ cần:

1. Đọc file `assets/_boilerplate.spec.ts`
2. Copy vào `tests/e2e/<tên>.spec.ts`
3. **Chỉ sửa logic cụ thể** (locator + flow), giữ nguyên helpers + assertions

## When to use

- Cần viết E2E test mới cho feature/page mới
- Cần test trên mobile (iOS Safari, Android Chrome)
- Cần test parallel-safe với data isolation theo `marker`
- Cần login helper dùng `ADMIN_EMAIL/PASSWORD` env hoặc `storageState`

## Available assets

| File | Mục đích |
|------|----------|
| `assets/_helpers.ts` | Helper functions (login, cleanup, assertions). **Paste 1 lần** vào `tests/e2e/_helpers.ts`, import trong mọi spec. |
| `assets/_boilerplate.spec.ts` | Template spec hoàn chỉnh. Copy thành `<feature>.spec.ts`, sửa logic. |
| `assets/example.spec.ts` | Example dùng đầy đủ helpers + assertions. Tham khảo pattern. |
| `assets/playwright-config-snippet.ts` | Snippet merge vào `playwright.config.ts`. Thêm projects cho mobile iOS/Android. |
| `assets/BEST_PRACTICES.md` | Quy tắc tối ưu: locator-first, no hard wait, parallel-safe, network-idle. |

## Quick start (3 bước)

### Bước 1 — Chuẩn bị helpers (1 lần)

```bash
# Copy helper file (chỉ làm 1 lần cho cả project)
cp skills/playwright-e2e-boilerplate/assets/_helpers.ts tests/e2e/_helpers.ts
```

Sau đó import trong spec:
```ts
import { loginViaUI, loginViaStorageState, cleanupTestData, expectToast, assertNoConsoleErrors } from "./_helpers";
```

### Bước 2 — Copy template

```bash
cp skills/playwright-e2e-boilerplate/assets/_boilerplate.spec.ts tests/e2e/my-feature.spec.ts
```

### Bước 3 — Sửa logic cụ thể

Mở file mới, **giữ nguyên**:
- `loginViaUI` / `loginViaStorageState` call
- `cleanupTestData` trong `afterAll`
- Common assertions
- Test structure (describe → beforeAll → tests → afterAll)

**Chỉ sửa**:
- Locator cụ thể (page.getByRole, getByLabel, getByTestId)
- Flow nghiệp vụ (click, fill, navigation)
- Assertion riêng của feature

## Conventions (khớp với mood-studio)

| Item | Convention |
|------|------------|
| Test data prefix | `E2E-` (vd: `E2E-CUS-abc123`) |
| Marker (parallel) | `Date.now().toString(36)` + random suffix |
| Auth user email | `e2e-<marker>@test.local` |
| Admin client | `SUPABASE_SERVICE_ROLE_KEY` từ `.env.local` |
| Seed file (global) | `os.tmpdir()/e2e-seed-ids.json` |
| Cleanup | `sweepStaleE2EOrphans` (đã có trong `e2e-sweep.ts`) |

## Env vars (ưu tiên theo thứ tự)

1. `ADMIN_EMAIL` + `ADMIN_PASSWORD` → `loginViaUI` (khuyến nghị cho CI)
2. `.auth/admin.json` (storageState) → `loginViaStorageState` (khuyến nghị cho local dev)
3. `process.env.PLAYWRIGHT_BASE_URL` (override URL)

## Mobile testing

Xem `assets/playwright-config-snippet.ts` để thêm projects:
- `iPhone 14` (iOS Safari, 390x844)
- `Pixel 7` (Android Chrome, 412x915)
- `iPad (gen 7)` (đã có sẵn trong config mood-studio)

Run:
```bash
npx playwright test --project="iPhone 14" tests/e2e/my-feature.spec.ts
```

## Best practices nhanh

✅ **DO**:
- `await page.getByRole("button", { name: "Lưu" }).click()`
- `await expect(page.getByText("Thành công")).toBeVisible()`
- `await page.waitForURL(/\/dashboard$/)`
- Dùng `test.describe.configure({ mode: "parallel" })` khi data isolation OK
- Marker unique để parallel safe

❌ **DON'T**:
- `await page.waitForTimeout(2000)` (hard wait, brittle)
- `page.locator(".btn.btn-primary.submit")` (CSS phức tạp, fragile)
- `expect(page).toHaveScreenshot()` không pin snapshot (flaky)
- Share mutable state giữa tests

## Workflow đầy đủ (khi M3 trigger)

1. Đọc `assets/BEST_PRACTICES.md` (nếu chưa nắm)
2. Đọc `assets/example.spec.ts` (pattern reference)
3. Copy `_boilerplate.spec.ts` → `<feature>.spec.ts`
4. Đổi `test.describe("...", ...)` title + `MARKER` constant
5. Sửa từng step trong test cases (chỉ phần `// 🔧 CUSTOMIZE HERE`)
6. Chạy `npx playwright test tests/e2e/<feature>.spec.ts --ui` để debug
7. Chạy `npx tsc --noEmit` để verify type (nhớ `tests` đang exclude trong tsconfig.json → có thể cần `--project tsconfig.test.json` hoặc thêm include)

## Lưu ý về tsconfig

`tsconfig.json` hiện tại **exclude** `tests/`. Khi chạy `npx tsc --noEmit`, các file trong `tests/e2e/` sẽ KHÔNG được check. Có 2 cách:

**Cách 1** (khuyến nghị): Tạo `tsconfig.test.json` extends và include `tests/`:
```json
{
  "extends": "./tsconfig.json",
  "include": ["tests/**/*.ts", "playwright/**/*.ts"]
}
```
Sau đó: `npx tsc --noEmit -p tsconfig.test.json`

**Cách 2** (tạm thời): Sửa `tsconfig.json` thêm `"tests"` vào include (không khuyến nghị vì conflict với Next.js types).

Cách 1 sẽ được set up sẵn trong boilerplate.
