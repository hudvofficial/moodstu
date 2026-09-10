# T-20260830-ios-safari-testing — Bọc lại lớp test iOS: 2 project "iPad" không phải iPad, script `test:e2e:mobile` trỏ project không tồn tại, và LAN bị `allowedDevOrigins` chặn

**Owner:** claude (spec) · **Trạng thái:** 🟡 spec — CHỜ USER DUYỆT (Cổng người 1) · **Module:** hạ tầng test + config dev · **DB:** không đụng · **ADR:** không cần (không đổi data-flow, không thêm lib, không đổi schema/RLS; chỉ sửa config test + 1 dòng dev-origin)

**Bối cảnh:** user dùng **iPhone + iPad** làm thiết bị thật. iOS Simulator của Apple **không tồn tại trên Windows** (là thành phần của Xcode/macOS) → không có đường "cài simulator iOS" trên máy này. Android Emulator vừa dựng xong (AVD `medium_phone`, API 36) chỉ đại diện cho **Chromium**, không nói gì về WebKit. Việc còn lại: (a) chạy được trên **máy thật qua LAN**, (b) sửa lớp **WebKit tự động** trong Playwright đang sai.

---

## 0. Trace (đo trên máy, 30/08 — chỉ đọc, chưa sửa gì)

### 0.1 Playwright WebKit đã có sẵn — không cần cài thêm

`~/AppData/Local/ms-playwright/` có `webkit-2287`. `@playwright/test@^1.60.0` (`package.json:109`). WebKit của Playwright **chạy trên Windows** và là cùng họ engine với Safari — đây là thứ gần iOS nhất mà máy Windows có.

### 0.2 Ba lỗi trong `playwright.config.ts` (dòng 60–82)

| # | Nơi | Đang là | Vấn đề |
|---|---|---|---|
| 1 | `:74` project **"iPad A16 Landscape"** | `...devices["Desktop Safari"]` | **`hasTouch: false`, `isMobile: false`** → đây là Safari **desktop**, không phải iPad. Mọi assertion về touch/tap trên project này đang chạy trên môi trường không có touch. |
| 2 | `:65` project **"iPad A16 Portrait"** | `...devices["iPad (gen 7) landscape"]` rồi ép `viewport {768, 1180}` | Spread bản **landscape** rồi ép viewport **dọc** — tên ngược nghĩa. Và `768×1180` không khớp iPad nào: preset thật là `iPad (gen 11)` = `656×944 @2.5x`, `iPad Pro 11` = `834×1194 @2x`. |
| 3 | — | Không có project iPhone nào | User dùng iPhone. Toàn bộ chiều 390–430px trên WebKit **không được test**. |

### 0.3 `package.json:30` — script mobile đang chết

```json
"test:e2e:mobile": "playwright test --project=\"iPhone 14\" --project=\"Pixel 7\""
```

Cả **"iPhone 14"** lẫn **"Pixel 7"** đều **không tồn tại** trong `projects[]` của `playwright.config.ts` (chỉ có `chromium`, `iPad A16 Portrait`, `iPad A16 Landscape`). Gõ `npm run test:e2e:mobile` → Playwright báo lỗi project không tìm thấy, fail ngay, chưa từng chạy được.

### 0.4 Giả thuyết cho known-limitation đang mở

`agent/CURRENT_STATE.md:224` ghi:

> Known-limitation: 4 test mở detail của `contracts-tablet-ipad` treo click row trên WebKit emulation (project "iPad A16 Landscape") — chưa mổ, chromium pass đủ.

Mà `tests/e2e/contracts-tablet-ipad.spec.ts:4-12` khai báo rõ 8 case cho iPad, trong đó có **"5. Touch prefetch"** và **"7. Touch target tối thiểu 44px"**.

**Giả thuyết (chưa xác nhận):** project đó chạy `Desktop Safari` → `hasTouch=false`, nên nhánh code/handler dành cho thiết bị cảm ứng không kích hoạt, click row treo. Sửa project về đúng preset iPad (có `hasTouch: true`) có thể làm 4 test này hết treo — **hoặc lộ ra lỗi thật khác**. Spec này **không hứa fix** known-limitation đó; chỉ nêu đây là biến số cần đo lại sau khi sửa config.

### 0.5 Mâu thuẫn kích thước iPad giữa 2 file

- `playwright.config.ts:77` — "iPad A16 Landscape" = `1024×1366`
- `tests/e2e/contracts-edit-form-responsive.spec.ts:184` — `iPadLandscape: { width: 1180, height: 820 }, // iPad A16 ~1180`

Hai file cùng repo nói hai kích thước khác nhau cho cùng một thiết bị. `1180×820` mới đúng iPad A16 (11", logical `820×1180`).

### 0.6 Đường LAN đang bị chặn ở đúng 1 dòng

- IP LAN máy: **`192.168.8.101`** (interface Ethernet, DHCP).
- Firewall: đã có rule inbound **`Allow Port 3000 cho Hermes`** = Allow → port 3000 **đã mở sẵn**.
- `next dev` bind mọi interface (log cũ `dev-server.log` in cả dòng `Network:`), không cần thêm cờ.
- **Chặn ở đây →** `next.config.ts:27`:
  ```ts
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  ```
  iPhone/iPad vào bằng `http://192.168.8.101:3000` là **cross-origin dev request** → Next chặn, HMR/dev asset hỏng.
- `docs/hermes-local-qa-url-provided.md` đã chốt `192.168.8.101:3000` là URL QA chuẩn của máy này → thêm IP đó vào `allowedDevOrigins` là **khớp quy ước sẵn có**, không phải phát minh mới.

### 0.7 Giới hạn không thể vượt bằng WebKit trên Windows

Playwright WebKit **không** tái hiện được: safe-area/notch thật, `100vh` vs `dvh` khi thanh địa chỉ Safari co giãn, momentum scroll, auto-zoom khi focus input `font-size < 16px`, date/select picker kiểu iOS, PWA standalone mode, giới hạn service worker/IndexedDB của iOS. → Những thứ này **bắt buộc** máy thật (mục 1.C) hoặc dịch vụ real-device.

---

## 1. Phạm vi sửa

### A. `playwright.config.ts` — thay khối `projects[]` (giữ nguyên phần còn lại)

Giữ `chromium` y nguyên. Thay 2 project iPad bằng 4 project dùng **preset thật của Playwright** (tất cả đều `defaultBrowserType: webkit`, `hasTouch: true`, `isMobile: true`), không tự chế viewport:

| Tên project mới | Preset | Viewport | Ghi chú |
|---|---|---|---|
| `iPhone 15 Pro` | `devices["iPhone 15 Pro"]` | `393×659 @3x` | Thiết bị chính của user |
| `iPhone 15 Pro Max` | `devices["iPhone 15 Pro Max"]` | `430×739 @3x` | Chiều rộng lớn nhất của iPhone |
| `iPad Pro 11` | `devices["iPad Pro 11"]` | `834×1194 @2x` | Thay "iPad A16 Portrait" |
| `iPad Pro 11 landscape` | `devices["iPad Pro 11 landscape"]` | `1194×834 @2x` | Thay "iPad A16 Landscape" — **có touch**, khác hẳn `Desktop Safari` cũ |

Giữ `retries: 1` cho 4 project mobile như bản cũ đang làm với 2 project iPad.

**Rủi ro đã kiểm:** không file test nào đọc tên project bằng code (`grep -rn "project.name\|projectName\|iPad A16"` trên `tests/`, `playwright/`, `.github/` → chỉ khớp trong **comment**). `.github/workflows/ci.yml` **không** chạy Playwright. ⇒ Đổi tên project **không phá** test hay CI.

**Tác dụng phụ đã lường:** `contracts-tablet-ipad.spec.ts` viết cho `1024×1366`, project mới là `1194×834`. Số đo trong spec đó (DOM nodes < 500, LCP < 2.5s, CLS < 0.1) có thể xê dịch → phải chạy lại và ghi số thật, **không** sửa threshold để cho pass.

### B. `package.json:30` — trỏ script về đúng tên project vừa đặt

```json
"test:e2e:mobile": "playwright test --project=\"iPhone 15 Pro\" --project=\"iPad Pro 11\""
```

### C. `next.config.ts:27` — mở đường LAN cho máy thật

```ts
allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.8.101"],
```

Chỉ thêm IP LAN của máy này (khớp `docs/hermes-local-qa-url-provided.md`). **Chỉ ảnh hưởng `next dev`**, không ảnh hưởng build/prod.

---

## 2. Ngoài phạm vi (nêu, KHÔNG làm trong task này)

- **Không** mổ known-limitation 4 test treo click row — chỉ đo lại sau khi đổi config rồi báo số, mở task riêng nếu vẫn treo.
- **Không** sửa threshold/nội dung `contracts-tablet-ipad.spec.ts`.
- **Không** đụng `contracts-edit-form-responsive.spec.ts:184` dù nó mâu thuẫn kích thước với config (mục 0.5) — sửa ở đây là "tiện tay", vi phạm §2.2 AGENT_RULES. Ghi nhận để user quyết.
- **Không** dựng HTTPS tunnel trong spec này (xem mục 4 — cần quyết định riêng của user vì chạm prod).

---

## 3. Verify (chạy gì, chờ số nào)

⚠️ **E2E của repo này chạm DB PRODUCTION** (dev/prod chung 1 Supabase — `AGENT_RULES §2b`). Vì vậy:

1. `npx tsc --noEmit` + `npx eslint playwright.config.ts next.config.ts` → sạch.
2. `npx playwright test --list` → xác nhận 5 project hiện đúng tên, **không** lỗi "project not found".
3. `npm run test:e2e:mobile -- --list` → chạy được (đây là thứ đang chết ở 0.3).
4. Chạy **1 spec lẻ** trên project iPhone mới (không full suite): `npx playwright test tests/e2e/contracts-tablet-ipad.spec.ts --project="iPad Pro 11 landscape"` → ghi **số thật** (pass/fail từng case) vào §Kết quả, kể cả nếu 4 test kia vẫn treo.
5. Sau khi chạy: kiểm rác DB `node scripts/db-q.mjs "SELECT (SELECT count(*) FROM contracts WHERE contract_code LIKE 'E2E%') hd, (SELECT count(*) FROM employees WHERE department='E2E') ns"`, dọn bằng `sweepStaleE2EOrphans` (ngưỡng 30 phút), **không tự viết SQL xóa**.
6. Verify LAN: bật `npm run dev`, mở `http://192.168.8.101:3000` **trên iPhone thật** → trang render + HMR không báo lỗi cross-origin.

---

## 4. Việc cần user quyết trước khi làm tiếp (không nằm trong 3 file trên)

**HTTPS cho iPhone thật.** `http://192.168.8.101:3000` **không phải secure context** → trên iOS sẽ **không** đăng ký được service worker, không cài được PWA, không dùng được camera/clipboard. Muốn test mấy thứ đó cần HTTPS. `cloudflared 2026.8.2` đã cài sẵn (`C:\Program Files (x86)\cloudflared\cloudflared.exe`), lệnh `cloudflared tunnel --url http://localhost:3000` cho URL `*.trycloudflare.com` ngay, không cần tài khoản.

**Nhưng:** URL đó **công khai trên Internet, không xác thực**, mà dev server này nối **thẳng vào Supabase production** (dev/prod chung 1 DB). Ai có link là chạm dữ liệu thật. → Cần user chốt: (a) chỉ bật tunnel trong phiên ngắn khi cần test PWA rồi tắt ngay, hay (b) bỏ tunnel, chấp nhận không test được SW/PWA/camera trên iPhone và chỉ dùng LAN HTTP cho layout/UI.

---

## 5. Kết quả (code + verify 30–31/08)

**Đã sửa đúng 3 file trong §1:** `playwright.config.ts` (+31/−14), `package.json` (+2/−1), `next.config.ts` (+4/−1). Không đụng file nào khác.

### 5.1 Verify tĩnh — sạch

| Lệnh | Kết quả |
|---|---|
| `npx eslint playwright.config.ts next.config.ts` | exit 0 |
| `npx tsc --noEmit` | exit 0 |
| `npx playwright test --list` | 5 project × 87 test: `chromium`, `iPhone 15 Pro`, `iPhone 15 Pro Max`, `iPad Pro 11`, `iPad Pro 11 landscape` |
| `npm run test:e2e:mobile -- --list` | **174 test / 28 file** (trước đây fail ngay vì project không tồn tại — §0.3) |
| Mojibake 3 file | sạch (đọc lại UTF-8 strict) |

### 5.2 Chạy thật — `contracts-tablet-ipad.spec.ts` trên `iPad Pro 11 landscape`

`npx playwright test tests/e2e/contracts-tablet-ipad.spec.ts --project="iPad Pro 11 landscape" --reporter=list`
→ **3 passed / 5 failed, 5.9 phút.**

| # | Test | Kết quả |
|---|---|---|
| 1 | List scroll FPS > 3 | ❌ **mới hỏng do thay đổi này** |
| 2 | Tablet table virtualization ≤ 40 rows | ✅ 8.2s |
| 3 | Không dual-render — chỉ 1 layout active | ❌ treo click row |
| 4 | Detail LCP < 2.5s | ❌ treo click row |
| 5 | Touch prefetch — mở detail không cold-load | ❌ treo click row |
| 6 | Sticky columns CLS < 0.1 | ✅ 10.8s |
| 7 | Touch target tối thiểu 44px | ✅ 8.6s |
| 8 | Memory — mở/đóng detail 10 lần | ❌ treo click row |

**DB production:** rác E2E **0 hợp đồng / 0 nhân viên** cả **trước và sau** khi chạy (`node scripts/db-q.mjs`). Không cần `sweepStaleE2EOrphans`.

### 5.3 Giả thuyết §0.4 — **SAI, đã bác bỏ bằng số**

4 test 3/4/5/8 vẫn treo **y nguyên**, cùng một chỗ, cùng một lỗi:

```
TimeoutError: locator.click: Timeout 20000ms exceeded.
  - waiting for locator('table tbody tr').filter({ hasText: 'E2E-GLOBAL-…' }).first().locator('td').first()
  - locator resolved to <td class="… sticky left-0 z-10 w-[124px] …">…</td>
```

Locator **tìm thấy** phần tử rồi mới timeout ⇒ kẹt ở actionability check, không phải kẹt selector. Thêm `hasTouch: true` **không** làm nó hết treo ⇒ nguyên nhân known-limitation (`CURRENT_STATE.md:224`) **không nằm ở touch**. Nghi vấn còn lại (chưa mổ, ngoài phạm vi): `<td>` là **sticky left-0 z-10** — nhiều khả năng bị phần tử khác che nên không nhận được pointer event.

⚠️ **Giới hạn của kết luận (AGENT_RULES §2c):** tôi **không** chạy baseline trên config cũ. Việc đối chiếu "4 test treo" là so với ghi chép `CURRENT_STATE.md:224` (khác ngày, khác cỡ mẫu), **không** phải phép đo cùng điều kiện. Muốn kết luận chắc phải `git stash` config rồi chạy lại đúng spec đó trên project cũ.

### 5.4 Hồi quy do chính thay đổi này — test 1

```
Error: mouse.wheel: Mouse wheel is not supported in mobile WebKit
  > 449 |       await page.mouse.wheel(0, 500);
```

Nguyên nhân cơ học, không phải flaky: project cũ là `Desktop Safari` (`isMobile: false`) nên `page.mouse.wheel` chạy được; preset iPad thật có `isMobile: true` và **mobile WebKit không hỗ trợ mouse wheel**. Tức file test này đang viết cho một môi trường *desktop đội lốt iPad*.

**Cách sửa (nằm ngoài §1, CẦN user duyệt riêng):** trong `contracts-tablet-ipad.spec.ts:449`, đổi `page.mouse.wheel(0, 500)` sang cách cuộn chạy được trên mobile WebKit (vd `page.evaluate(() => window.scrollBy(0, 500))`). Đây là sửa **nội dung file test** mà §2 đã tự loại khỏi phạm vi.

### 5.5 Hệ quả ngoài dự tính — full suite phình

Không project nào có `testMatch` ⇒ mọi spec chạy trên mọi project: **3×87 = 261 → 5×87 = 435 test** (+67%), mà E2E repo này seed vào **DB production**. `npm run test:e2e:mobile` không bị (174, có chủ đích). Hai cách gọn nếu user thấy nặng: bỏ project `iPhone 15 Pro Max`, hoặc thêm `testMatch` để 4 project mobile chỉ chạy spec mobile/tablet. **Chưa làm** — ngoài phạm vi đã duyệt.

### 5.6 Còn lại

- **Chưa** verify LAN trên iPhone thật (§3.6) — cần user cầm máy mở `http://192.168.8.101:3000`.
- **Chưa** push. Chờ user xem diff (Cổng người 2).
