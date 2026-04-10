# Plan: Tối ưu UI/UX Module CRM (Chuẩn Gold Standard V2)
Created: 2026-04-11T02:20
Status: 🟡 In Progress

## Overview
Dựa trên kết quả Audit so sánh từ V1 (code cũ) và tư duy tối ưu cho V2 (hiện tại), kế hoạch này nhằm tái cấu trúc giao diện module CRM (`/crm/leads` và `/crm/customers`).
Mục đích: Chấm dứt hoàn toàn tình trạng vỡ layout hoặc cắt chữ khi hẹp màn hình, kết hợp khung sườn Flexbox của V2 với UI Vibe (Sidebar) của V1.

## Tech Stack
- Frontend: Next.js + TailwindCSS v4
- Components: CrmDashboardLayout, LeadCompactCard, Widget Sidebar (Mới)

## Tracking Tiến độ

| Phase | Trọng tâm | Trạng thái | Hoàn thành |
|-------|----------|------------|------------|
| 01 | Chuẩn hóa Khung sườn Layout | ✅ Hoàn tất | 100% |
| 02 | Nâng cấp Card (Danh sách 2 dòng) | ✅ Hoàn tất | 100% |
| 03 | Thiết kế lại UI Sidebar Widgets | ✅ Hoàn tất | 100% |

## Chi tiết Triển khai (Strict V2 Compliance)

### Phase 1: Chuẩn hóa Layout & Khắc phục "Tàng hình" trên Mobile
- **Vấn đề:** Sidebar biến mất trên Mobile (`hidden lg:flex`). Trên Desktop thì bị trôi mất khi scroll.
- **Giải pháp:**
  - Layout Desktop: `flex-row`, main content `flex-1 min-w-0`, Sidebar `w-[340px] sticky top-20 max-h-[calc(100vh-6rem)] no-scrollbar`.
  - Layout Mobile: Không dùng `hidden`. Đưa Sidebar Widget thành Bottom Section hoặc Custom `<Accordion>` ở cuối page, tuân thủ `max-lg:` override.
  - **SSOT Rules:** Dành cho container, dùng `gap-md`, không dùng inline grid. Không dùng border cho card, chỉ dùng `shadow-xs` hoặc shadow của SSOT.

### Phase 2: Card Architecture (Block Design - Chống vỡ)
- **Vấn đề:** Thẻ đang dùng percentage column-width, dẫn đến vỡ chữ khi layout bị bóp.
- **Giải pháp - Thẻ 2 tầng dọc:**
  - Design Pattern: Header (Avatar + Tên + Action) trên cùng, Meta (Tags + Status) dòng dưới.
  - Thẻ phải bọc bằng lớp `.card-base` chuẩn.
  - Trạng thái màu sắc Badge: Lấy từ map Color của SSOT (không hardcode `bg-green-100`).
  - Font size: Tuân thủ `@theme` -> `text-body-sm`, `text-caption`. ❌ Không dùng px cố định.

### Phase 3: Sidebar Widgets (Logic & Earth-Tone UI Vibe)
- **Vấn đề:** 
  1. `WidgetUpcoming` đang chọc mù logic bằng `mockUpcoming`. Thiếu Data binding thực.
  2. `WidgetCTA` là Dead UI (bị mất `href`).
  3. Màu sắc lộn xộn, sai tinh thần Earth-Tone của V2.
- **Giải pháp:**
  - Khối "Tư vấn ngay?": Sử dụng `bg-gradient-to-br from-primary to-primary-dark` (Màu Earth-tone V2, tĩnh tâm, sang trọng, không phải xanh lá của V1). Bổ sung `Link href="/crm/leads/create"` với css class nút nội bộ.
  - Widget Nhắc Lịch: Sửa lại UI phẳng, dùng `lucide-react` (❌ Không Material Icons). Trỏ Data vào mảng truyền xuống từ Backend khi có thể (chừa prop `reminders`), hiện tại mapping với design system chuẩn trước. Mọi màu text nhấn dùng `text-interactive` hoặc `text-accent`. Đảm bảo KHÔNG BORDER.

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
