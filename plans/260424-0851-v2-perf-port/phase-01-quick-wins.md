# Phase 01: Quick Wins (TopLoader + DNS Prefetch + Google Fonts Cache)
Status: ⬜ Pending
Dependencies: Không

## Objective
Áp dụng 3 kỹ thuật tối ưu cực nhẹ nhưng impact lớn nhất từ V1:
1. **NextTopLoader** — thanh loading bar khi chuyển trang (perceived performance)
2. **DNS Prefetch + Preconnect Supabase** — giảm 50-100ms latency lần fetch đầu
3. **Google Fonts PWA Cache Rule** — cache fonts offline vĩnh viễn

## Requirements
### Functional
- [ ] Khi click chuyển trang → thanh progress bar màu primary chạy ở top
- [ ] DNS Supabase được resolve sẵn trước khi gọi API
- [ ] Google Fonts (nếu có) được cache CacheFirst 365 ngày trong SW

### Non-Functional
- [ ] Không ảnh hưởng bundle size đáng kể (TopLoader ~3KB gzip)
- [ ] Không thay đổi behavior hiện tại

## Implementation Steps

### 1. Install NextTopLoader
1. [ ] `npm install nextjs-toploader`

### 2. Thêm NextTopLoader vào layout
2. [ ] Mở `app/layout.tsx`
3. [ ] Import `NextTopLoader` từ `nextjs-toploader`
4. [ ] Thêm `<NextTopLoader>` vào ngay trước `{children}` trong body, config:
   - `color="var(--color-primary)"` (dùng CSS var để đồng bộ theme)
   - `height={3}`
   - `showSpinner={false}` (tránh rối mắt)
   - `speed={300}`

### 3. DNS Prefetch + Preconnect Supabase
5. [ ] Trong `app/layout.tsx`, thêm vào `<head>` (dùng Next.js metadata hoặc inline):
   ```html
   <link rel="dns-prefetch" href="https://[SUPABASE_PROJECT_ID].supabase.co" />
   <link rel="preconnect" href="https://[SUPABASE_PROJECT_ID].supabase.co" />
   ```
   Lấy URL từ `process.env.NEXT_PUBLIC_SUPABASE_URL`

### 4. Google Fonts PWA Cache Rule
6. [ ] Mở `next.config.ts`, thêm rule vào `workboxOptions.runtimeCaching`:
   ```js
   {
     urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
     handler: "CacheFirst",
     options: {
       cacheName: "google-fonts",
       expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
     },
   }
   ```

## Files to Create/Modify
- `app/layout.tsx` — Thêm TopLoader + DNS prefetch
- `next.config.ts` — Thêm Google Fonts cache rule
- `package.json` — Thêm dependency `nextjs-toploader`

## Test Criteria
- [ ] Chuyển trang → thanh xanh chạy ở top (F12 > chọn 3G để thấy rõ)
- [ ] F12 > Network > lọc "supabase" → thấy connection reused (no DNS lookup)
- [ ] Build thành công không lỗi

---
Next Phase: Phase 02 — Cold-Start UX (Smart Splash Screen)
