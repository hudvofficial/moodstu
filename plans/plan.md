# Plan: Mood Studio v2

**Created:** 2026-03-15
**Updated:** 2026-03-16 (Phase 02 brainstorm + V1 deep audit applied)
**Status:** 🟡 Planning
**Source:** [BRIEF.md](../docs/BRIEF.md) | [V1_LESSONS.md](../docs/V1_LESSONS.md)

---

## Overview

Hệ thống quản lý toàn diện cho Mood Studio — đa dịch vụ (cưới, baby, concept, hình thẻ, thiệp cưới, cho thuê trang phục). Hợp đồng là trung tâm, kho trang phục real-time, team media management, tài chính đầy đủ (thu/chi/công nợ/mục tiêu/bảng lương), in ấn & lab management.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS v4 (@theme tokens)
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Data Fetching:** SWR (client) + cachedQuery (server) — KHÔNG dùng React Query
- **Patterns:** Server Actions, useRealtime hook (v1), cacheKeys factory (Coffee)
- **UI:** Custom components (Coffee pattern), lucide-react, sonner, recharts
- **PWA:** @ducanh2912/next-pwa (3-tier caching từ Coffee)
- **Deploy:** Vercel + Supabase Cloud

### Tech Carry-over

| Pattern | Từ | File gốc |
|---------|-----|----------|
| useRealtime hook | Studio v1 | `hooks/useRealtime.ts` (147 lines) |
| SWR Cache Keys Factory | Mood Coffee | `lib/swr.ts` (53 lines) |
| useInfiniteScroll | Mood Coffee | `hooks/useInfiniteScroll.ts` (38 lines) |
| CurrencyInput | Mood Coffee | `components/ui/CurrencyInput.tsx` (79 lines) |
| Modal (slide-up/scale-in) | Mood Coffee | `components/ui/Modal.tsx` (44 lines) |
| TabsFilter | Mood Coffee | `components/ui/TabsFilter.tsx` (29 lines) |
| middleware (RBAC) | Studio v1 | `middleware.ts` (108 lines) |
| auth_utils (withAdmin) | Studio v1 | `lib/auth_utils.ts` |
| cachedQuery (server) | Studio v1 | `lib/cache.ts` |
| PWA + next.config | Mood Coffee | `next.config.ts` (87 lines) |

---

## 🏗️ Wave 1 — MVP (8 phases)

| Phase | Name | Scope | Status | Est. |
|-------|------|-------|--------|------|
| 01 | Foundation | Project setup, auth, layout, shared components | ✅ Done | 1 day |
| 02 | Database & RLS | 35 tables (ENUM!), migrations, RLS policies, Gallery | ✅ Done | ~1 hour |
| 03 | CRM (KH + Leads) | CRUD + pipeline + Kanban + convert + analytics (10/10) | 🎨 Designing | 2 days |
| 04 | Contracts Core | HĐ CRUD, 12 loại DV, lifecycle 4 bước, phát sinh tracking | ⬜ Pending | 2 days |
| 05 | Payments | Phiếu thu, công nợ, nhắc thanh toán | ⬜ Pending | 1 day |
| 06 | Inventory | Kho trang phục (váy/áo dài/vest), conflict check | ⬜ Pending | 1.5 days |
| 07 | Dashboard | KPIs, charts, overview, role-based stats | ⬜ Pending | 1 day |

**Total Wave 1: ~8 days**

---

## 🎁 Wave 2 — Full Features (15 phases)

### 📷 Vận hành (P08-P10)

| Phase | Name | Scope | Status | Est. |
|-------|------|-------|--------|------|
| 08 | Team Media | Jobs assign, task tracking, workload dashboard | ⬜ Backlog | 1.5 days |
| 09 | Calendar | Lịch chụp, assign team, conflict check member | ⬜ Backlog | 1 day |
| 10 | Services Catalog | DV theo loại, giá, gói combo | ⬜ Backlog | 1 day |

### 💰 Tài chính (P11-P14)

| Phase | Name | Scope | Status | Est. |
|-------|------|-------|--------|------|
| 11 | Expenses | Phiếu chi, danh mục thu/chi, chi phí cố định, duyệt chi | ⬜ Backlog | 1.5 days |
| 12 | Debts & Goals | Công nợ 2 chiều, mục tiêu tài chính (state machine), atomic RPC | ⬜ Backlog | 1.5 days |
| 13 | Reports | Báo cáo lãi/lỗ, cashflow, doanh thu theo loại DV, aging | ⬜ Backlog | 1 day |
| 14 | Payment Plans | Milestones thanh toán, liên kết phiếu thu, chống Ghost Payment | ⬜ Backlog | 0.5 day |

### 👥 Nhân sự (P15-P16)

| Phase | Name | Scope | Status | Est. |
|-------|------|-------|--------|------|
| 15 | HR & Attendance | Hồ sơ NV/CTV, chấm công, hoa hồng, đơn xin nghỉ/tạm ứng | ⬜ Backlog | 2 days |
| 16 | Payroll | Bảng lương (formula), thưởng/phạt, KPI tracking | ⬜ Backlog | 1.5 days |

### 🖨️ In ấn (P17-P18)

| Phase | Name | Scope | Status | Est. |
|-------|------|-------|--------|------|
| 17 | Labs & Printing | Xưởng in, đơn in ảnh, bảng giá lab, công nợ lab | ⬜ Backlog | 1.5 days |
| 18 | Wedding Cards | In thiệp cưới, mẫu thiệp, đơn hàng, deadline | ⬜ Backlog | 1 day |

### 📊 Hệ thống (P19-P22)

| Phase | Name | Scope | Status | Est. |
|-------|------|-------|--------|------|
| 19 | Quick POS | Hình thẻ walk-in, giao dịch nhanh | ⬜ Backlog | 0.5 day |
| 20 | Audit & Logs | Audit logs (JSONB), activity tracking | ⬜ Backlog | 0.5 day |
| 21 | Notifications | In-app notifications, nhắc TT/deadline/task | ⬜ Backlog | 1 day |
| 22 | Settings | Studio info, user preferences, system config | ⬜ Backlog | 0.5 day |

**Total Wave 2: ~15.5 days**

---

## 💭 Backlog (Chưa lên phase)

| Feature | Mô tả |
|---------|-------|
| CRM | Lead funnel, source tracking, follow-up |
| Moodie AI | Chatbot tra cứu thông tin |
| Client Portal | Khách xem tiến độ, chọn ảnh |
| Google Calendar | Sync lịch team media |
| PWA Offline | Team dùng ngoài hiện trường |
| Equipment Mgmt | Tài sản, khấu hao |
| Consumables | Vật tư tiêu hao, tồn kho |
| Promotions | Mã giảm giá, voucher |
| Break-even | Phân tích hoà vốn |
| Budget | Ngân sách theo bộ phận |
| Regulations | Nội quy, mức phạt |
| Documents | Tài liệu nội bộ |
| Anniversary Reminders | Nhắc ngày kỷ niệm + ưu đãi |
| PDF Contracts | Template HĐ theo loại DV |

---

## ⚠️ V1 Sai Lầm PHẢI TRÁNH

1. ❌ VARCHAR status → ✅ **PostgreSQL ENUM** (13 ENUMs)
2. ❌ RLS USING(true) → ✅ **Code auth + Service Role**
3. ❌ Denorm names → ✅ **FK only, JOIN khi cần** (debts exception)
4. ❌ 37 tables lộn xộn → ✅ **35 tables tối ưu, tạo 1 lần cho toàn hệ thống**
5. ❌ SWR + React Query → ✅ **SWR only (client)**
6. ❌ globals.css 20K lines → ✅ **Tailwind v4 @theme** (~80 lines)
7. ❌ God files 500+ lines → ✅ **Max 250 lines/file**

---

## Quick Commands

- Design DB: `/design` (⚡ NEXT STEP!)
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
