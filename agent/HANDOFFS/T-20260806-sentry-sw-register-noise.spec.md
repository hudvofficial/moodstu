# HANDOFF — T-20260806-sentry-sw-register-noise — claude → claude (fallback: user yêu cầu Claude tự sửa)

- **Task:** T-20260806-sentry-sw-register-noise — Lọc noise Sentry `Error: Rejected` (đăng ký Service Worker bị in-app browser từ chối)
- **Từ → Đến:** claude → claude (không qua Codex — user chốt 2026-08-06)
- **Branch / worktree:** làm thẳng trên `main` (1 file, 1 phần tử mảng)
- **Locks (vùng độc quyền):** `instrumentation-client.ts`
- **Ngày:** 2026-08-06

## 1. Mục tiêu bước này

Sentry ngừng ghi nhận `Error: Rejected` phát sinh từ lần `navigator.serviceWorker.register()` bị trình duyệt nhúng (in-app browser) từ chối. **Không** đổi hành vi PWA, **không** đụng next-pwa, **không** làm mù các lỗi Service Worker thật khác.

## 2. Đã làm / hiện trạng — root cause đã truy xong

### Hiện tượng (từ event Sentry user gửi)

- Project `javascript-nextjs`, environment `production`, level `error`.
- Exception: `Error: Rejected`, stack:
  ```
  at ServiceWorkerContainer.<anonymous> (<anonymous>:669:449)
  at ServiceWorkerContainer.register (<anonymous>:460:195)
  at None (app:///_next/static/chunks/4078-2cf6eeb09cc187d2.js:42:26371)
  at p.bn (app:///_next/static/chunks/4078-...js:42:26326)
  ```
- Request URL: `https://stu.moodwedding.com/gallery/duye-thanh-ngaycuoi`, query có `fbclid=...`.

### Root cause — ĐO ĐƯỢC (đọc code, không suy đoán)

1. **Không có dòng nào trong source dự án gọi `serviceWorker.register`.** Grep toàn repo (`--include=*.ts,*.tsx`) chỉ ra 3 chỗ chạm Service Worker và không chỗ nào register:
   - `components/layout/dev-service-worker-reset.tsx` → `getRegistrations()` + `unregister()`
   - `components/layout/service-worker-update-reload.tsx` → `getRegistration()` + `registration.update()`, cả hai đều đã `.catch(() => {})`
   - `hooks/use-push-subscription.ts` → `getRegistrations()` / `serviceWorker.ready`
2. **Nguồn duy nhất là next-pwa.** `next.config.ts:213` đặt `register: true`; next-pwa nhét entry `node_modules/@ducanh2912/next-pwa/dist/sw-entry.js` vào bundle client, nội dung:
   ```js
   window.workbox = new Workbox(window.location.origin + __PWA_SW__, { scope: __PWA_SCOPE__ }),
   __PWA_ENABLE_REGISTER__ && window.workbox.register(),
   ```
   `window.workbox.register()` **không có `.catch()`** → promise reject không ai bắt → `unhandledrejection` → Sentry ghi nhận thành error. Khớp stack: `p.bn` = `Workbox.register` sau minify, gọi tới `ServiceWorkerContainer.register`.
3. **Sentry client init nằm ở `instrumentation-client.ts`** (repo KHÔNG có `sentry.client.config.ts`). Mảng `ignoreErrors` hiện có 10 mục (ResizeObserver, Failed to fetch, zaloJSV2, `__gCrWeb`, …), chưa có mục nào bắt chuỗi này.

### SUY RA — chưa đối chứng, ghi rõ để không tưởng là fact

`fbclid` trong query + frame `<anonymous>` (script được embedder inject, không thuộc bundle mình) ⇒ nhiều khả năng khách mở link gallery trong in-app browser Facebook/Messenger, nơi embedder từ chối đăng ký Service Worker. **Chưa xác nhận** bằng tag `browser.name`/`os` của event. Cách vá dưới đây **không phụ thuộc** giả thuyết này — nó lọc theo chữ ký lỗi, không theo trình duyệt.

### Tác động thật: bằng 0 với người dùng

`/gallery/<slug>` là trang public read-only. Service Worker ở dự án này chỉ phục vụ offline cache + push của PWA nội bộ. Khách vẫn xem/chọn/tim ảnh bình thường khi register hỏng. Đây là **noise đốt quota Sentry**, không phải bug chức năng.

## 3. Files touched

- `instrumentation-client.ts` — thêm 1 phần tử vào mảng `ignoreErrors` (kèm comment giải thích), không đổi gì khác.

Chạm ngoài danh sách này → DỪNG.

## 4. Bước tiếp cần làm — 1 thay đổi, chép nguyên văn

File `instrumentation-client.ts`, trong mảng `ignoreErrors`, **thêm vào cuối** (ngay sau dòng `"__gCrWeb",`, trước dấu `]`):

```ts
    // next-pwa (next.config.ts `register: true`) gọi workbox.register() không
    // .catch(); in-app browser từ chối đăng ký SW → rejection lọt vào Sentry.
    // Chỉ mất offline cache của PWA, trang vẫn chạy bình thường.
    // Regex NEO 2 đầu: ignoreErrors match theo substring nên chuỗi "Rejected"
    // trần sẽ nuốt nhầm mọi lỗi khác có chữ này.
    /^Rejected$/,
```

**KHÔNG** đổi gì khác: giữ nguyên `register: true` ở `next.config.ts`, không tự viết lại luồng đăng ký SW, không đụng `beforeSend`.

### Vì sao regex neo `/^Rejected$/` là đúng chỗ

Đọc `node_modules/@sentry/core/build/cjs/utils/eventUtils.js` — `getPossibleEventMessages()` đẩy vào danh sách so khớp **cả `exception.value` trần** lẫn `` `${type}: ${value}` ``:

```js
possibleMessages.push(lastException.value);              // "Rejected"
if (lastException.type) {
  possibleMessages.push(`${lastException.type}: ${lastException.value}`);  // "Error: Rejected"
}
```

và `isMatchingPattern()` với pattern là RegExp thì chạy `pattern.test(value)` trên **từng** chuỗi đó. Vậy `/^Rejected$/` khớp chuỗi `"Rejected"` → event bị lọc. Nếu dùng string `"Rejected"` thì `isMatchingPattern` chạy `value.includes(pattern)` → nuốt luôn mọi message có chứa chữ "Rejected".

### Phương án thay thế đã cân nhắc và loại

`register: false` rồi tự gọi `navigator.serviceWorker.register()` có try/catch: phải viết lại luồng đăng ký + wiring `workbox-window` của cả PWA (skipWaiting/clientsClaim/reloadOnOnline đang do next-pwa lo). Rủi ro treo PWA trên build cũ lớn hơn nhiều so với lợi ích. Loại.

## 5. Cách verify

1. `npx eslint instrumentation-client.ts` → exit 0 (luật: exit ≠ 0 là KHÔNG push).
2. `npm run build` → exit 0 (file này nằm trong bundle client, build là gate thật).
3. Kiểm logic lọc bằng chính helper của Sentry, không đoán:
   ```bash
   node -e "const {getPossibleEventMessages}=require('./node_modules/@sentry/core/build/cjs/utils/eventUtils.js');const {stringMatchesSomePattern}=require('./node_modules/@sentry/core/build/cjs/utils/string.js');const ev={exception:{values:[{type:'Error',value:'Rejected'}]}};console.log('drop Rejected:',getPossibleEventMessages(ev).some(m=>stringMatchesSomePattern(m,[/^Rejected$/])));const keep={exception:{values:[{type:'SecurityError',value:'Failed to register a ServiceWorker: The script has an unsupported MIME type'}]}};console.log('keep SW that fails for real:',!getPossibleEventMessages(keep).some(m=>stringMatchesSomePattern(m,[/^Rejected$/])));"
   ```
   Kỳ vọng: `drop Rejected: true` và `keep SW that fails for real: true`.
4. Sau deploy: issue `Error: Rejected` trong Sentry ngừng tăng event mới (kiểm sau vài ngày — không xác nhận được ngay tại thời điểm push).

## 6. Ràng buộc / cạm bẫy phải giữ

- **Không đụng `next.config.ts`** — PWA đang chạy đúng, đây là task lọc log chứ không phải task PWA.
- **Không dùng chuỗi trần trong `ignoreErrors`** cho từ chung như "Rejected" (xem §4).
- Giữ style file hiện có: comment tiếng Việt/Anh như các mục xung quanh, không format lại cả mảng.
- Không thêm `beforeSend` filter mới — `beforeSend` hiện chỉ chặn dev, giữ nguyên.

## 7. Câu hỏi mở / rủi ro

- **Rủi ro làm mù lỗi thật:** chỉ chuỗi message đúng bằng `"Rejected"` bị lọc. Lỗi đăng ký SW thật ở trình duyệt thường có message khác hẳn (`Failed to register a ServiceWorker: ...` kèm lý do 404/MIME/scope) → vẫn lọt vào Sentry. Đã kiểm bằng §5.3, nhưng chỉ kiểm chuỗi giả lập, chưa gặp ca thật.
- **Chưa xác nhận trình duyệt nguồn** (§2). Nếu sau này muốn biết chắc, mở event trong Sentry xem tag `browser.name` / `os` trước khi thêm bất kỳ suy luận nào vào tài liệu.
- **Không xác nhận được hiệu quả ngay khi push** — chỉ đo được bằng số event mới của issue sau vài ngày.
