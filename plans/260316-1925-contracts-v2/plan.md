# Plan: Contracts Module V2 (Full)
Created: 2026-03-16T19:25
Updated: 2026-03-17T18:37
Status: 🟡 In Progress

## Overview
Port module Hợp đồng từ V1 sang V2. Module lớn nhất — quản lý toàn bộ lifecycle HĐ cưới.

## Nguyên tắc V1 → V2
- **Logic = COPY V1** (proven production, atomic RPC, dedup, retry)
- **Kiến trúc = TỐI ƯU V2** (Server Actions, SWR, Zod, withAuth)
- **Styling = Stitch tokens** (Earth-Tone, design-system.css)

## V1 Bugs PHẢI tránh (đã xảy ra production):
| Bug | V2 Fix |
|-----|--------|
| Ghost Payment (receipt_id = null) | Zod validate + atomic RPC |
| F5 Bug (data cũ sau submit) | SWR mutate() + revalidatePath() |
| Orphan Customer (RPC fail) | Giữ dedup by phone + warning log |
| Race condition contract_code | Giữ retry loop 5 lần |
| Service type typo | Strict enum, KHÔNG `| string` |
| Client-side financial calc | RPC only, client chỉ hiển thị |

## Architecture
- **Hierarchy**: Contract → Event → Task (Event-First — giữ nguyên V1)
- **Backend**: Supabase RPCs (submit_contract_v4) — GIỮ NGUYÊN
- **Data Layer**: Server Actions (withAuth + service_role) — TỐI ƯU
- **Cache**: SWR (thay React Query) — TỐI ƯU
- **Validation**: Zod schemas — MỚI
- **UI**: Stitch Earth-Tone + V2 design tokens — MỚI

## Phases

| # | Name | Files | Status | Progress |
|---|------|-------|--------|----------|
| 00 | Types & Constants | `types/contract.ts`, `types/contract-constants.ts` | ✅ Done | 100% |
| 01 | UI Shell — List Page | `components/contracts/*.tsx` | ✅ Done | 100% |
| 01b | V1 UI Parity (Badges) | `missing-info-badge.tsx`, `progress-badge.tsx` | ✅ Done | 100% |
| **02** | **Server Actions + Hooks** | `app/actions/contracts.ts`, `lib/hooks/use-contracts.ts` | ✅ Done | 100% |
| **03** | **Wire List UI → Real Data** | `contracts-list-client.tsx`, `contracts-table.tsx` | ✅ Done | 100% |
| **04a** | **Detail — Route + Layout** | `page.tsx`, `detail-client`, `top-action-bar`, `cancel-banner` | ✅ Done | 100% |
| **04b** | **Detail — Core Sections** | `summary-card`, `customer-info`, `service-details` | ✅ Done | 100% |
| **04c** | **Detail — Financial + Events** | `financial-dashboard`, `event-timeline`, `payment-history`, `financial-summary` | ✅ Done | 100% |
| **04d** | **Detail — Desktop Layout + Stitch Align** | Rearrange 65/35, breadcrumb, gom cards, stepper | ✅ Done | 100% |
| **04e** | **Detail — Sidebar Sections** | `costumes-block`, `print-orders-block`, `activity-log` | ✅ Done | 100% |
| **04f** | **Detail — Quick Actions + Wire** | `quick-actions-grid`, `checklist-block`, wire list→detail | ⬜ **NEXT** | 0% |
| 05 | Contract Form (Create/Edit) | `components/contracts/contract-form/*.tsx` | ⬜ Pending | 0% |
| 06 | Event Timeline & Tasks | `components/contracts/event-timeline.tsx` | ⬜ Pending | 0% |
| 07 | Financial Logic (Payments) | Phase 05 in main roadmap | ⬜ Pending | 0% |

## Phase Feature Roadmap (Chi tiết từng tính năng)

### Phase 04a — Route + Layout + Action Bar
> Mục tiêu: Tạo route, layout shell, nút điều hướng, cancel banner

| # | Feature | Mô tả | Data Source | Trạng thái |
|---|---------|-------|-------------|-----------|
| 4a.1 | Route + Layout Shell | Tạo `/contracts/[id]/page.tsx`, 2-col desktop / 1-col mobile | — | ⬜ |
| 4a.2 | Loading Skeleton | `loading.tsx` cho trang detail | — | ⬜ |
| 4a.3 | Top Action Bar | Nút Quay lại, Xuất file, In, Sửa | — | ⬜ |
| 4a.4 | Cancel Banner | Banner "HĐ đã hủy" nếu status=da_huy | contracts.status | ⬜ |

### Phase 04b — Core Sections (Summary + Customer + Services)
> Mục tiêu: Hiển thị thông tin cốt lõi của HĐ

| # | Feature | Mô tả | Data Source | Trạng thái |
|---|---------|-------|-------------|-----------|
| 4b.1 | SummaryCard | Mã HĐ, KH, loại DV, ngày ký, trạng thái, badge | contracts + customers | ⬜ |
| 4b.2 | CustomerInfoBlock | Tên KH, SĐT, địa chỉ, cô dâu/chú rể | customers | ⬜ |
| 4b.3 | ServiceDetailsBlock | Bảng dịch vụ (Desktop table + Mobile cards) | contract_items | ⬜ |

### Phase 04c — Financial + Events
> Mục tiêu: Hiển thị tài chính + lịch trình sự kiện

| # | Feature | Mô tả | Data Source | Trạng thái |
|---|---------|-------|-------------|-----------|
| 4c.1 | Financial Dashboard | 3 card (Tổng/Đã thu/Còn nợ) + progress bar | contracts | ⬜ |
| 4c.2 | EventTimeline | Cards lịch trình sự kiện + task count | contract_events + work_tasks | ⬜ |
| 4c.3 | PaymentHistory | Lịch sử thanh toán | payments | ⬜ |
| 4c.4 | FinancialSummary | Tổng kết tài chính (V1 dark luxury theme) | computed | ⬜ |

### Phase 04d — Desktop Layout + Stitch Alignment (100% Bám Stitch)
> Mục tiêu: Rearrange layout desktop cho đúng Stitch, thêm Stepper, gom cards

**DB Schema Confirmed:**
- `inventory_reservations` → có `contract_id` ✅ (trang phục)
- `printing_orders` → có `contract_id` ✅ (in ấn)
- `work_tasks` → có `contract_id` ✅ (checklist)
- `audit_logs` → filter by `table_name='contracts'` + `record_id` ✅ (activity)
- `inventory_items` → join với reservations (name, size, item_code, image_url) ✅
- `documents` → không có `contract_id` ❌ → dùng empty state

| # | Feature | Mô tả | Data Source | Trạng thái |
|---|---------|-------|-------------|-----------|
| 4d.1 | Desktop Layout 65/35 | Rearrange grid: left 65% (info+events), right 35% (finance+sidebar) | CSS only | ⬜ |
| 4d.2 | Breadcrumb | "Hợp đồng > MS-2026-001" trong TopActionBar | contract_code | ⬜ |
| 4d.3 | WorkflowStepper | 6 circles ngang: Ký HĐ→Chụp ngoại→Studio→Chỉnh sửa→In ấn→Hoàn tất | contract.status + events | ⬜ |
| 4d.4 | Gom "Thông tin HĐ" card | Merge SummaryCard + CustomerInfo thành 1 card grid 4 cột (desktop) | contracts + customers | ⬜ |
| 4d.5 | Financial sidebar adjust | Tổng tiền LỚN, progress bar, nút "Thu thêm" nổi bật | contracts | ⬜ |
| 4d.6 | Merge FinancialSummary | Gom nội dung FinancialSummary vào FinancialDashboard (Stitch gom 1 card) | computed | ⬜ |

### Phase 04e — Sidebar Sections (Data-driven từ DB có sẵn)
> Mục tiêu: Hiển thị Trang phục, In ấn, Activity Log trên sidebar

| # | Feature | Mô tả | Data Source | Trạng thái |
|---|---------|-------|-------------|-----------|
| 4e.1 | CostumesBlock | Trang phục đã chọn: tên váy, size, mã | `inventory_reservations` JOIN `inventory_items` WHERE contract_id | ⬜ |
| 4e.2 | PrintOrdersBlock | Album/Ảnh in: tên, lab, expected_date, status | `printing_orders` JOIN `labs` WHERE contract_id | ⬜ |
| 4e.3 | ActivityLog | Hoạt động gần đây: action + timestamp + employee | `audit_logs` WHERE table_name='contracts' AND record_id | ⬜ |
| 4e.4 | FilesDrivePlaceholder | Empty state đẹp "Chưa có file" — chờ Drive integration | — | ⬜ |

### Phase 04f — Quick Actions + Checklist + Wire
> Mục tiêu: Thao tác nhanh, checklist từ work_tasks, wire list→detail

| # | Feature | Mô tả | Data Source | Trạng thái |
|---|---------|-------|-------------|-----------|
| 4f.1 | QuickActionsGrid | Grid icons 3x2: Thêm sự kiện, Drive, Thu tiền, In ấn, Trang phục, Ghi chú | — | ⬜ |
| 4f.2 | ChecklistBlock | Tabs "Tất cả / Theo loại" — hiển thị work_tasks dạng checklist | `work_tasks` WHERE contract_id | ⬜ |
| 4f.3 | Wire List → Detail | Click row contracts-table → navigate /contracts/[id] | — | ⬜ |
| 4f.4 | Mobile Bottom Bar | Sticky bottom 2 nút "Sửa" + "Thu tiền" (Stitch mobile) | — | ⬜ |

### Phase 05 — Contract Form (Create/Edit)
> Mục tiêu: Tạo mới + Chỉnh sửa hợp đồng

| # | Feature | Mô tả |
|---|---------|-------|
| 5.1 | ContractForm page | Route `/contracts/create` + `/contracts/[id]/edit` |
| 5.2 | Customer Section | Chọn/tạo KH, phone, address, bride/groom |
| 5.3 | Services Section | Thêm/sửa dịch vụ & sản phẩm (contract_items) |
| 5.4 | Tasks Section | Gán công việc (work_tasks) |
| 5.5 | Payment Section | Ghi nhận thanh toán đợt 1 |
| 5.6 | Financial calc | Tạm tính, giảm giá, tổng cộng (RPC only) |
| 5.7 | Wire ContractActions | 3 nút từ Phase 04 → mở form thật |

### Phase 06 — Event Timeline & Task Management
> Mục tiêu: Quản lý sự kiện + phân công công việc

| # | Feature | Mô tả |
|---|---------|-------|
| 6.1 | EventSection interactive | Thêm/sửa/xóa events |
| 6.2 | EventTaskModal | Modal quản lý tasks theo event |
| 6.3 | Task assignment | Gán nhân viên + deadline |
| 6.4 | Auto-complete events | Tự chuyển trạng thái khi qua ngày |
| 6.5 | Progress calculation | Tính tiến độ thực theo tasks |

### Phase 07 — Financial Logic (Payments & Receipts)
> Mục tiêu: Thu tiền, phiếu thu, kế hoạch thanh toán

| # | Feature | Mô tả |
|---|---------|-------|
| 7.1 | PaymentReceiptForm | Form ghi nhận thanh toán (inline trong detail) |
| 7.2 | PaymentPlanBlock | Kế hoạch thanh toán theo đợt |
| 7.3 | ReceiptsHistoryBlock | Lịch sử phiếu thu chi tiết |
| 7.4 | Auto-update amounts | paid_amount + remaining_amount auto tính |
| 7.5 | Print contract | Route `/contracts/[id]/print` |


> ℹ️ Phase 08 (Checklist) và Phase 09 (Dress/Print) đã được gom vào Phase 04e + 04f.
> DB tables `work_tasks`, `inventory_reservations`, `printing_orders`, `audit_logs` đã có sẵn — không cần migration mới.


## Stitch Reference
| Screen | Type | Screen ID |
|--------|------|-----------|
| Contracts List | Desktop | `37b29e12` ⭐ GOLD |
| Contracts List | Mobile | `ca6942ab` ✅ |
| Contract Detail | Desktop | `9e95bc24` ✅ |
| Contract Detail | Mobile | `16c286be` ✅ |
| Create Contract | Desktop | `590edbd1` ✅ |
| Create Contract | Mobile | `dedc3e9d` ✅ |

## Key Rules
- V2 ≥ V1: KHÔNG bỏ sót feature (Lesson #60)
- Stitch = STYLE, V1 = LOGIC (Lesson #61)
- Max 250 lines/file (Lesson #34)
- SWR only, Server Actions + withAuth (Lesson #59)
- Zod validation, Strict enums
- KHÔNG client-side financial calc (Lesson #8)
