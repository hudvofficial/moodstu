# Mood Studio - Long-Term Memory & Context

## Kiến trúc Hệ thống Hiện tại
- **Framework:** Next.js 16.2.6 (App Router), Tailwind CSS.
- **Database/Backend:** Supabase.
- **Deployment:** Vercel (Tài khoản hiện tại: `moodstudio`, Repo: `hudvofficial/moodstu`). Domain chính: `stu.moodwedding.com` (Đã được trỏ DNS qua Vercel CNAME).

## Module Quan Trọng & Các thay đổi gần đây
- **Module Download ZIP Ảnh (Client-side):** 
  - Vừa được tối ưu hóa để tải và nén ảnh (ZIP) trực tiếp trên Client-side.
  - Xử lý dứt điểm tình trạng lỗi 500 do nghẽn RAM và hao tổn băng thông (Bandwidth) Server-side trên Vercel. 
  - Đã **bypass hoàn toàn API Proxy của Vercel**, trình duyệt (JSZip) sẽ tải ảnh trực tiếp từ Google Drive thông qua link gốc `lh3.googleusercontent.com/d/id=s0`. Điều này giúp đưa băng thông Fast Origin Transfer của Vercel về đúng mức 0.
- **Performance & Analytics:** Đã tích hợp thành công `@vercel/speed-insights` để theo dõi Core Web Vitals của khách hàng (giúp tối ưu tốc độ load ảnh cho người xem Gallery trên mobile/4G).

## Lưu ý Kỹ thuật (Technical Notes)
- **Vercel Deployment:** 
  - Vercel đang được liên kết với Github Repo: `hudvofficial/moodstu`.
  - **LƯU Ý QUAN TRỌNG:** KHÔNG bao giờ chạy lệnh deploy thủ công (`npx vercel --prod`) sau khi đã `git push` code lên nhánh `main`. Vì Vercel đã tích hợp tự động với GitHub, chỉ cần `git push` là đủ, nếu chạy thêm lệnh sẽ làm trùng lặp tiến trình deploy (bị x2 bản build).
  - Để lệnh Auto-Deploy từ GitHub qua Vercel chạy thành công (bypass bảo mật Vercel Team), cấu hình Git local BẮT BUỘC phải sử dụng email `hudvofficial@gmail.com`. (Đã cấu hình).
  - Sử dụng package manager chuẩn là **NPM**. Đã xóa bỏ toàn bộ file rác `pnpm-lock.yaml` để tránh đụng độ trong quá trình Vercel chạy lệnh `npm install`.

## Promoted From Short-Term Memory (2026-06-16)

<!-- openclaw-memory-promotion:memory:memory/2026-06-11.md:89:90 -->
- 23:29 Update: **Printing Orders Findings**: DB loading avoids N+1 by using joined PostgREST selects; search uses a safe two-query tradeoff for contract/customer matching. UI already uses optimistic status updates with rollback on error. Gaps: no production issue state (`gap_su_co`), no structured status history/velocity analytics, no bulk status updates, no reason-required rollback/rework flow, and likely no cross-client realtime patch on status changes.; **Printing Orders UX Note**: `components/ui/select/SelectStatus.tsx` was verified to already have mobile-safe `min-h-[44px]` for compact/default triggers in the current workspace;... [score=0.830 recalls=0 avg=0.620 source=memory/2026-06-11.md:89-90]
<!-- openclaw-memory-promotion:memory:memory/2026-06-11.md:93:96 -->
- 23:55 Update — Printing Phase 1 Implementation (4 Slices): **Slice 1 (Issue State)**: Added `gap_su_co` to `PRINTING_ORDER_STATUSES`, status labels, badge variants, `isPendingPrintStatus`, and `PRINT_ORDER_STATUS_OPTIONS` (red color). Wired into `VALID_TRANSITIONS` so any active state can transition to `gap_su_co`, and `gap_su_co` can resume to any active state or cancel.... [score=0.830 recalls=0 avg=0.620 source=memory/2026-06-11.md:93-96]
<!-- openclaw-memory-promotion:memory:memory/2026-06-11.md:97:99 -->
- 23:55 Update — Printing Phase 1 Implementation (4 Slices): **Side fix**: Re-exported `RealtimePayload` from `@/hooks/use-realtime-multi` to unblock the `contract-drawer.tsx` import.; **Verification**: `npx tsc --noEmit` clean; `npm run build` exit 0 (29/29 pages, Turbopack ~32s compile, TS check ~50s).; **Pending operational step**: Migration file is staged but not applied to remote Supabase yet — needs `supabase db push` or manual SQL execution before status-history writes work in production. [score=0.830 recalls=0 avg=0.620 source=memory/2026-06-11.md:97-99]
<!-- openclaw-memory-promotion:memory:memory/2026-06-11.md:44:47 -->
- Nhật ký 2026-06-11: Hoàn thành module: **Tối ưu tải ảnh Client-side (ZIP)**. Đã chuyển toàn bộ luồng nén ảnh từ Server-side sang Client-side.; Phát hiện lỗi nghiêm trọng: Client-side ZIP ban đầu vẫn kéo ảnh qua API Proxy `/api/gallery-download` của Vercel (khiến Vercel cắn 8GB Fast Origin Transfer khi test tải 1 album). Đã SỬA LỖI bằng cách cấu hình JSZip **tải ảnh trực tiếp từ Google Drive (qua link `lh3...=s0`)**, chính thức loại bỏ Vercel ra khỏi quá trình Tải File.... [score=0.812 recalls=0 avg=0.620 source=memory/2026-06-11.md:44-47]
<!-- openclaw-memory-promotion:memory:memory/2026-06-11.md:48:50 -->
- Nhật ký 2026-06-11: Khắc phục lỗi bảo mật Vercel: Đồng bộ cấu hình git local sử dụng email `hudvofficial@gmail.com` để Vercel chấp nhận auto-deploy từ GitHub mà không bị lỗi "not a member of this team".; Xoá triệt để file rác `pnpm-lock.yaml` để tránh đụng độ với `package-lock.json`, giúp Vercel tự động build thành công bằng `npm install`.; Tích hợp thêm **@vercel/speed-insights** vào hệ thống để đo lường và theo dõi Core Web Vitals thực tế từ khách hàng. [score=0.812 recalls=0 avg=0.620 source=memory/2026-06-11.md:48-50]
<!-- openclaw-memory-promotion:memory:memory/2026-06-11.md:53:56 -->
- Tối ưu Web Vitals (chiều): Speed Insights ghi nhận: Desktop FCP/LCP 6.05s, TTFB 5.5s, CLS 0.34 (Poor); Mobile FCP 5.93s, TTFB 4.82s. Hai route bị đỏ: `/dashboard` (6.05s) và `/contracts/[id]` (4.27s).; Multi-agent audit (frontend analyzer + backend tracer + dashboard fixer + contracts fixer) xác định nguyên nhân TTFB:; `app/(protected)/layout.tsx`: `await getAuthenticatedUserContext()` ở top-level layout chặn mọi route protected (auth claims + DB employee context, có thể trùng với middleware proxy).; `app/(protected)/dashboard/page.tsx`: `await requireDashboardAccess()` ngay top-level page khiến shell không stream được. [score=0.812 recalls=0 avg=0.620 source=memory/2026-06-11.md:53-56]
<!-- openclaw-memory-promotion:memory:memory/2026-06-11.md:57:58 -->
- Tối ưu Web Vitals (chiều): `app/(protected)/contracts/[id]/page.tsx`: `await getContractDetail()` (RPC `get_contract_detail_v2/v3` + fallback 8 queries) chặn HTML đầu tiên.; `app/gallery/[accessUrl]/page.tsx`: 2 chuỗi query Supabase (metadata + page) không dedupe được vì `cache()` bị key theo `supabase client object` khác nhau. [score=0.812 recalls=0 avg=0.620 source=memory/2026-06-11.md:57-58]
<!-- openclaw-memory-promotion:memory:memory/2026-06-11.md:60:61 -->
- Tối ưu Web Vitals (chiều): `dashboard/page.tsx`: tách thành `DashboardContent` async được bọc `<Suspense fallback={<DashboardSkeleton/>}>`; shell trả HTML ngay (TTFB ~0ms).; `contracts/[id]/page.tsx`: chuyển sang client-first shell (`return <ContractDetailClient contractId={id} />`); `useContractDetail` đã có loading state nội bộ. [score=0.812 recalls=0 avg=0.620 source=memory/2026-06-11.md:60-61]
<!-- openclaw-memory-promotion:memory:memory/2026-06-11.md:64:66 -->
- Tối ưu TTFB/FCP đợt 2 (Tối): Dashboard/contracts/[id] giảm SSR blocking via page-level Suspense.; `/contracts/[id]/gallery` được chuyển sang client-first shell, gỡ `Promise.allSettled` trên server, dùng React Query via `useGalleryData`.; Auth Layout Bottleneck: Tối ưu `lib/supabase/middleware.ts` truyền JWT claims qua header (`AUTH_PROXY_*`). `lib/auth_utils.ts` (`getClaimsUser`) ưu tiên parse header thay vì gọi lại `supabase.auth.getClaims()`. Mọi protected routes thoát khỏi double auth check. [score=0.812 recalls=0 avg=0.620 source=memory/2026-06-11.md:64-66]
<!-- openclaw-memory-promotion:memory:memory/2026-06-11.md:69:72 -->
- INP/CLS/Hydration Audit & Fix đợt 3: CLS trên `/dashboard`: Sửa `loading.tsx` skeleton khớp grid thực, bỏ `Math.random()`, bỏ hardcode `400px` của chart/list skeleton.; INP `PullToRefreshProvider`: Sửa state chứa callback thành `ref` + `hasCallback` boolean.; INP `AppShell`: Chuyển `NavigationWarmup` và `NavigationProgress` thành `dynamic(..., { ssr: false })` để giảm tải hydration ngay lần đầu render.; INP `NavigationWarmup`: Bổ sung kiểm tra Data Saver mode (`navigator.connection.saveData` và `effectiveType === "2g"|"slow-2g"`), tự động skip warmup trên mạng yếu để bảo vệ băng thông và CPU mobile; giảm số trang prewarm data lúc... [score=0.812 recalls=0 avg=0.620 source=memory/2026-06-11.md:69-72]
