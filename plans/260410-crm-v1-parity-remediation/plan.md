# Plan: CRM V1 Parity Remediation (Gold Standard Sync)
Created: 2026-04-10
Status: ✅ Hoàn thành

## Overview
Kế hoạch này nhắm đến việc khôi phục toàn bộ các tính năng UX mạnh mẽ của CRM V1 (Kanban, Swipe, Analytics Funnel, FAB) sang CRM V2, **NHƯNG** code sẽ được implement trên nền tảng **V2 Shared UI Components** (`components/ui`, Tailwind v4 `@theme`, `lib/swr.ts`). 

Tuyệt đối KHÔNG gọt bỏ tính năng ("Code gọn") mà giữ nguyên Flow của V1; chỉ tối ưu cách Viết Code sao cho không phá vỡ UI/UX Design System hiện tại.

## Kiến trúc chuyển đổi (V1 UX + V2 Tech Stack)
1. **Dữ liệu CareLog (Timeline) & Lead Fields:** 
   - Đồng bộ Schema DB chuẩn với V1 (Thêm trường `social_link`, khôi phục cách parse/log log_history dạng Pipeline).
2. **Realtime Sync:**
   - Sử dụng `lib/swr.ts` (SWR Mutate) kết hợp với Supabase Channel (Thay thế React Context nặng nề của V1), giữ data luôn tươi mới.
3. **Phục dựng Kanban & Swipe (Gold Standard V2):**
   - **Kanban Desktop:** Dựng `<PipelineBoard />` sử dụng kỹ thuật Render Tối Ưu để KHÔNG gây re-render toàn trang mỗi khi rà chuột. Trạng thái thẻ lơ lửng được cách ly (isolate) tuyệt đối, chỉ gán inline style tạm thời cho tọa độ `transform`, ngay sau khi Drop sẽ sử dụng SWR để update tức thời.
   - **Swipe Mobile:** Dựng `<SwipeableCard />` bao bọc `<LeadCard />`. Xử lý triệt để lỗi xung đột scroll dọc/ngang bằng `touch-action: pan-y`. Tuân thủ 100% kích thước nút Action, màu sắc bằng hệ thống utility class `@theme` của V2, mang lại trải nghiệm như app iOS Native.
4. **SmartCRMFab & Navigation:**
   - Sử dụng component `components/ui/fab.tsx` (SSOT) thay vì code lại từ đầu.
5. **SourceChart & Funnel Analytics (10/10 Architecture):**
   - Áp dụng kiến trúc **Server-side SVG + Client-side Micro-Interactions** (chuẩn Vercel/Stripe).
   - **Source Chart (Donut):** KHÔNG dùng thư viện (0KB JS), tạo SVG `<circle stroke-dasharray>` thuần để tận dụng Animation CSS `:hover { transform: scale(1.05) }` và gắn Radix Tooltip tĩnh. Nhẹ, mượt 60fps và dễ tương tác hơn `conic-gradient`.
   - **Funnel Analytics:** Vẽ phễu dạng **Waterfall Progress** bằng Flex/Grid. Gắn huy hiệu Badge Conversion/Drop-off Rate tự động cảnh báo (Warning text khi rớt > 50%).
   - Tích hợp **Server Cache / SWR TTL** cho API thống kê để Dashboard load tức thì (0ms DB Throttle).

## Tech Stack
- Frontend: Next.js + CSS `@theme` + `components/ui/*` + SWR
- Backend: Supabase + Server Actions + `swr.ts` invalidate
- Design: V2 Gold Standard Utility Classes

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Cập nhật Schema (`social_link`), CareLog & Realtime SWR | ✅ Done | 100% |
| 02 | Phục dựng Kanban Board (No-Lag) & Swipe Mobile (Apple HIG) | ✅ Done | 100% |
| 03 | Khôi phục Funnel Analytics & Source Chart (Native SVG + V-Cache) | ✅ Done | 100% |
| 04 | Khôi phục TagsInput & ghép FAB component | ✅ Done | 100% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
