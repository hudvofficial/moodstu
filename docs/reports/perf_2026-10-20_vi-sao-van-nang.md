# Vì sao app vẫn "nặng" với PO — đo trước khi sửa (2026-10-20)

Theo ADR-005: perf chỉ làm khi có số đo, chỉ sửa cái số đo chỉ ra, mỗi hướng lớn mở ADR riêng. Báo cáo này **chỉ đo + đề xuất**, chưa sửa gì.

**Tóm tắt (đo được / suy ra tách riêng):**
- Đo được: DB 1–4 ms (không phải nút thắt) · middleware prod ấm 0,22 s · trang chi tiết HĐ tải 478 KB JS gzip (1,5 MB giải nén), file lớn nhất chủ yếu là Sentry 140 KB gzip.
- **Đã làm (ADR-022, 20/10):** gỡ tracing Sentry khỏi gói trình duyệt → **478,3 → 431,2 KB gzip (−47 KB, −9,8 %)**, xem mục 5.
- Đo được nhưng **bẩn**: số Vercel hôm nay (cold start 14,6 %, CPU 350 ms/lượt, mobile 48 "Kém") lẫn 4 lần deploy + lượt test của chính đợt làm việc này → chưa dùng để chọn đòn bẩy.
- Chưa đo được: thời gian máy chủ của trang **đã đăng nhập** trên prod (lúc ấm và lúc lạnh), và số thật trên iPhone của PO.

## 1. Số đo

### 1a. Database KHÔNG phải nút thắt (`EXPLAIN ANALYZE` trên DB prod, chỉ đọc)
| Truy vấn | Thời gian chạy trong DB |
|---|---:|
| `get_contract_detail_v2` (HĐ-0075) | **2,7 ms** |
| `get_contract_detail_v3` (HĐ-0075) | **3,7 ms** |
| Tra hồ sơ nhân viên theo `auth_user_id` (mỗi lần chuyển trang đều gọi) | **1,1 ms** |

*(Số 116–823 ms của `npm run perf:operational` là máy dev ở Việt Nam gọi thẳng Supabase Singapore — đường này **không tồn tại trên prod**, vì máy chủ Vercel `sin1` nằm cạnh Supabase. Không dùng số đó để đánh giá prod.)*

### 1b. Máy chủ Vercel prod (`https://stu.moodwedding.com`, curl từ Việt Nam, không đăng nhập)
| Đo | Kết quả |
|---|---|
| Vùng chạy | edge `hkg1` → function `sin1` (cùng vùng Supabase Singapore, đúng `vercel.json`) |
| Bắt tay TLS mỗi kết nối mới | ~0,11–0,16 s |
| Request nhẹ nhất (chỉ middleware, 307 về `/login`) | **0,22–0,31 s**; đo lại 14:47 4/4 lần 0,22–0,23 s |
| Lần đo chậm duy nhất | 1,62–1,75 s — **nhiều khả năng ngay sau deploy** (xem dưới) |

`SentryUptimeBot/1.0` gọi `/` **mỗi phút** (log Vercel, middleware 8 ms, `/login` cache HIT) → đường middleware luôn ấm. Hôm nay có 4 lần deploy prod trong 3 giờ (2ee162f, e8943af, 7c81c86, f08d1d2); mỗi deployment mới khởi động lạnh lại → số 1,6 s không phải cảnh PO gặp hằng ngày trên đường này.

### 1c. JavaScript tải về khi mở trang chi tiết hợp đồng (bản build production chạy cục bộ, đo Resource Timing + gzip từng file)
| | |
|---|---:|
| Số file JS (khác nhau) | 35 |
| Dung lượng JS giải nén | **1.509 KB** (+209 KB CSS) |
| Dung lượng JS nén gzip (gần với dung lượng tải thật) | **478 KB** |

*(Đính chính 20/10: bản đầu ghi 41 file / 1.588 KB / 506 KB vì Resource Timing liệt kê 6 file hai lần; đo lại khử trùng trên build gốc ra 35 / 1.509 / 478.)*
| File JS lớn nhất, **chủ yếu là Sentry** (theo dõi lỗi) | **140 KB gzip** (~28%), 457 KB giải nén |
| Thư viện Supabase phía trình duyệt | ~55 KB gzip |
| Thư viện xuất PDF/ảnh | 725 KB nhưng **chỉ tải khi mở trang xuất** (đúng) |

Mỗi lần app trên iPhone phải tải lại trang thì phải dịch + chạy lại ~1,5 MB JS này (tải mạng có thể được cache). *(Suy ra: iOS đóng app chạy nền rồi mở lại là hành vi đã biết của iOS nhưng chưa kiểm trên máy thật — xem `investigate_2026-10-20_tu-nhay-dashboard.md`.)*

### 1d. Số trên Vercel (chủ đăng nhập pane 20/10, gói Hobby — nhiều ô bị khoá) — ⚠️ mẫu bẩn
**Speed Insights, Production, 7 ngày:**
| | Desktop | Mobile |
|---|---:|---:|
| Real Experience Score (gộp FCP/LCP/CLS/INP) | 62 — "Cần cải thiện" | 48 — "Kém" |
| Số lượt đo | 21 | **14** |
| Theo route | `/dashboard` 61, `/contracts/[id]/print` 71 | 1 route "Kém" (tên bị khoá) |

- Từng chỉ số LCP/INP/TTFB/FCP và khoảng thời gian khác 7 ngày: **khoá** (cần Speed Insights Plus).
- Toàn bộ dữ liệu rơi vào 19–20/10 — đúng những ngày làm xuất hợp đồng trên mobile, lỗi nhảy `/dashboard`, lưu ảnh hợp đồng (có thử trên iPhone). Desktop có `/contracts/[id]/print`; route mobile "Kém" bị khoá tên **có thể** là trang in (tải thêm 725 KB html2pdf). → **Chưa được coi điểm 48 là trải nghiệm hằng ngày của PO.**

**Observability → Functions, 12 giờ gần nhất:**
| | |
|---|---|
| Compute model | **Fluid** (đã bật sẵn) |
| Cold start | 14,6 % số lượt gọi (89 lượt) |
| Active CPU P75 / lượt | 350 ms |
| Bộ nhớ TB | 271 MB / 2,05 GB; CPU throttle P75 5 % |
| P75 Duration, TTFB theo route | khoá (cần Pro) |

Tổng Active CPU theo route (12 h, cộng các route ≈ 14 s = khớp ô tổng "Active CPU 14s"): `/dashboard` 5 lượt / 2,01 s · `/crm/leads` 9 / 2,38 s · `/contracts` 9 / 1,99 s · `/gallery/[accessUrl]` 17 / 1,61 s · **`/api/monitoring/web-vitals` 7 / 0,86 s**.

- **Bẩn vì deploy:** 4 lần deploy trong cửa sổ 12 h; 89 lượt gọi thì chỉ vài lần deploy cũng đủ tạo phần lớn 13 lượt lạnh, và lượt lạnh tính cả thời gian nạp module vào CPU.
- **Đối chứng:** `/api/monitoring/web-vitals` chỉ ghi log mà vẫn ~123 ms CPU/lượt → với mẫu nhỏ thế này, chi phí cố định mỗi lượt (nạp module lúc lạnh, Sentry phía máy chủ `tracesSampleRate: 0.2` ở `sentry.server.config.ts:10`) lấn át. **Chưa tách được** CPU render trang với CPU khởi động.

### 1e. Kiến trúc (đọc mã)
- **39 file `force-dynamic`** → mỗi lần chuyển trang (quá 180 s cache của router) là một lần render trên máy chủ: middleware → layout (tra nhân viên) → dữ liệu trang. Các bước này chạy **trong `sin1`, cạnh Supabase** (DB vài ms, mục 1a); phía điện thoại chịu khoảng một vòng đi–về Việt Nam ⇄ Singapore (~0,2–0,3 s, mục 1b) **cộng thời gian render trên máy chủ — con số này chưa đo được cho trang đã đăng nhập**.
- `staleTimes.dynamic = 180` s: quay lại trang trong 3 phút thì dùng lại; quá 3 phút lại chờ máy chủ.
- Service worker: điều hướng `NetworkOnly` (không trả HTML từ cache) — đúng để tránh dữ liệu cũ, nhưng mở app luôn phải chờ mạng + máy chủ.
- 423 component `"use client"`.
- Sentry phía trình duyệt bật đo hiệu năng (`tracesSampleRate: 0.1`) — kéo phần tracing vào gói JS; Session Replay đã tắt nhưng `excludeReplayWorker` chưa bật.

**Kết luận đến giờ:** phần **đo được** là JS phía máy khá nặng (1c). Chi phí máy chủ của trang đã đăng nhập và cold start **chưa chốt** — số hôm nay bẩn.

## 2. Chưa đo được
- **Trang đã đăng nhập trên prod** (TTFB lúc ấm và lúc lạnh của `/dashboard`, `/contracts`, `/contracts/[id]`): cần chủ đăng nhập **app prod** trong pane một lần → tôi tự đo nhiều lượt từ Việt Nam, lặp lại được. Đây là phép đo quyết định.
- **Số thật trên iPhone của PO**: Speed Insights đã gắn (`app/layout.tsx:157`) nhưng Hobby chỉ cho điểm tổng và mẫu quá ít; Sentry Performance lấy mẫu 10 % → với ~14 lượt/tuần chỉ được khoảng 1 lượt, không đáng. Web-vitals riêng của app chỉ ghi log Vercel (giữ 1 giờ).
- *Lựa chọn của chủ (tốn tiền, không phải đòn bẩy):* nâng Speed Insights Plus / Observability Pro để mở khoá LCP/INP/TTFB theo route.
- Thời gian chạy JS trên CPU điện thoại thật (pane không giả lập được CPU chậm).

## 3. Đề xuất — theo giai đoạn, mỗi bước đo trước/sau, mỗi giai đoạn chủ duyệt

### Giai đoạn 0 — đo trang đã đăng nhập trên prod (cần chủ đăng nhập app prod trong pane)
Đo TTFB + tải JS + LCP cho `/dashboard`, `/contracts`, `/contracts/[id]`, mỗi trang nhiều lượt, lúc ấm và lần đầu sau một lúc để yên; **tránh cửa sổ ngay sau deploy**. Đòn bẩy giai đoạn 1 chọn theo số này.

### Giai đoạn 1 — rẻ, ít rủi ro (chọn sau giai đoạn 0)
1. **Gọt Sentry phía trình duyệt**: bỏ `tracesSampleRate` phía trình duyệt **và đồng thời** bật `excludeTracing` (cùng `excludeReplayWorker`) trong `bundleSizeOptimizations`; giữ nguyên bắt lỗi; Speed Insights vẫn đo. Nhắm thẳng vào số đã đo ở 1c. **→ ĐÃ LÀM, xem mục 5.** *Đo:* gzip JS trang chi tiết trước/sau (mức giảm chưa biết trước, vì lõi Sentry vẫn ở lại).
2. **Cold start function trang** — *chưa đủ số để đề xuất*: Fluid đã bật, middleware đã ấm nhờ Uptime Bot; tỷ lệ lạnh của trang phải đo lại ở cửa sổ không deploy.
3. **CPU máy chủ mỗi lượt** — *chưa đủ số*: đối chứng web-vitals (1d) cho thấy chưa tách được render với khởi động. Nếu giai đoạn 0 cho thấy TTFB lúc ấm cao → profile render `/dashboard` + cân nhắc Sentry phía máy chủ.

### Giai đoạn 2 — chuyển trang "tức thì" (cần ADR, đúng hướng ADR-005: PPR/`cacheComponents`)
Khung app (thanh trên/dưới, bố cục) hiện ngay khi bấm; dữ liệu chảy vào sau. Hiện đã có `NavigationWarmup` (`components/layout/navigation-warmup.tsx`) gọi `router.prefetch` + làm ấm dữ liệu lúc trình duyệt rảnh; với trang `force-dynamic`, bản prefetch hết hạn theo `staleTimes` nên tác dụng có giới hạn *(suy ra từ cấu hình, chưa đo trên prod)*. *Đo:* thời gian từ bấm tới khung hiện trên prod.

### Giai đoạn 3 — mở app như native trên iPhone (cần ADR, rủi ro dữ liệu cũ)
Service worker trả khung app đã lưu ngay khi mở, rồi cập nhật dữ liệu sau (hiện đang cố ý `NetworkOnly` để không lộ dữ liệu cũ/đã đăng xuất). Chỉ làm khi giai đoạn 1–2 chưa đủ.

## 4. Không đề xuất
- Tối ưu SQL/index: DB chạy 1–4 ms (mục 1a), không phải chỗ nghẽn.
- Đổi sang client-direct đọc DB từ trình duyệt: ADR-005 đã loại (né rào RLS).

## 5. Kết quả giai đoạn 1.1 — gọt Sentry phía trình duyệt (ADR-022, 20/10)
Chủ chọn **bỏ qua giai đoạn 0** ("Bỏ qua đo thêm, làm luôn bước gọt Sentry…") → làm 1.1 trước khi có số trang đã đăng nhập trên prod. Hệ quả: mất số hiệu năng phía trình duyệt trong Sentry; còn Speed Insights (Hobby: chỉ điểm tổng).

**Cách đo (lặp lại được):** `npm run build` (bản production) → `npm run start` → mở `/contracts/2839b839-…` (HĐ-2026-0075) đã đăng nhập cục bộ → lấy danh sách JS từ `performance.getEntriesByType("resource")` (khử trùng) → gzip mức 9 từng file trong `.next/static`. Cùng trang, cùng cách, trước và sau.

| | Trước | Sau | Chênh |
|---|---:|---:|---:|
| Số file JS | 35 | 35 | 0 |
| JS giải nén | 1.508,7 KB | 1.364,4 KB | **−144,3 KB** |
| JS gzip | 478,3 KB | 431,2 KB | **−47,1 KB (−9,8 %)** |
| File Sentry (gzip) | 140,5 KB | 92,0 KB | −48,5 KB |
| Chunk client còn mã tracing | 1 | 0 | |

- Bắt lỗi vẫn chạy: lỗi ném thử được Sentry đóng thành envelope `event` (chặn ở transport, không gửi lên Sentry thật). Integrations còn đủ trừ `BrowserTracing`.
- Tracing phía máy chủ giữ nguyên (cờ chỉ áp build client; `.next/server` vẫn chứa mã tracing).
- **Chưa đo:** thời gian trên iPhone thật. Ít JS hơn ~10 % thì dịch + chạy ít hơn tương ứng, nhưng mức PO cảm nhận được chưa biết — xem lại Speed Insights sau vài ngày dùng thật.

**Kiểm trên prod sau push `4dcacad2` (20/10, không đăng nhập):** tải HTML `/login` → tải mọi `/_next/static/chunks/*.js` nó tham chiếu → gzip mức 9 + tìm mã tracing.

| `/login` trên prod | Trước (bản f08d1d2) | Sau (bản 4dcacad2) | Chênh |
|---|---:|---:|---:|
| Số file JS | 20 | 20 | 0 |
| JS gzip | 352,7 KB | 305,0 KB | **−47,7 KB (−13,5 %)** |
| JS giải nén | 1.084,9 KB | 934,9 KB | −150 KB |
| Chunk Sentry (gzip) | 143,7 KB (`4078-…`) | 94,3 KB (`8461-…`) | −49,4 KB |
| File còn mã tracing | 1 | **0** | |

Bản mới lên prod ~7 phút sau push. `/login` 200; `/contracts`, `/dashboard` → 307 `/login?next=…` (đúng ADR-021).
