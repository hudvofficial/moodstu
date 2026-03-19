# Phase 04 (a→f): Contract Detail Page
Status: 🟡 In Progress — Split into 04a✅, 04b✅, 04c✅, 04d✅, 04e✅, 04f⬜
Dependencies: Phase 03 (Wire List UI → Real Data) ✅
Execution: 04a → 04b → 04c → 04d → 04e → 04f (tuần tự, mỗi phase build verify)

## Objective
Khi user bấm vào 1 hợp đồng trong danh sách → mở trang chi tiết hiển thị toàn bộ thông tin HĐ.
- READ-ONLY (không sửa data)
- 2-column desktop (70-30) / 1-column mobile
- Stitch mockup: Desktop `9e95bc24`, Mobile `16c286be`
- Stitch SSOT Mobile HTML: `c:\tmp\stitch_mobile_contract.html` (291 lines)
- V1 reference: `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\app\(protected)\contracts\[id]\page.tsx`

## Data Source (đã sẵn sàng)
- Server Action: `getContractById()` → joins: contracts, customers, contract_items, contract_events, work_tasks
- Separate fetch: `payments` table
- SWR hook: `useContractDetail(id)` → đã có trong `lib/hooks/use-contracts.ts`

## Architecture
```
app/(protected)/contracts/[id]/page.tsx    ← Server Component (entry)
  ├── components/contracts/detail/
  │   ├── contract-detail-client.tsx       ← Client wrapper (SWR)
  │   ├── summary-card.tsx                ← Mã HĐ, KH, DV, ngày, status
  │   ├── customer-info-block.tsx         ← Thông tin khách hàng
  │   ├── financial-dashboard.tsx         ← 3 card Tổng/Thu/Nợ + progress
  │   ├── service-details-block.tsx       ← Bảng dịch vụ
  │   ├── event-timeline.tsx             ← Cards lịch trình
  │   ├── payment-history.tsx            ← Lịch sử thanh toán
  │   ├── financial-summary.tsx          ← Tổng kết tài chính
  │   ├── contract-actions-shell.tsx     ← 3 nút (UI shell, chưa wire)
  │   ├── top-action-bar.tsx            ← Back, Export, Print, Edit
  │   ├── cancel-banner.tsx             ← Banner HĐ đã hủy
  │   └── empty-state-placeholder.tsx   ← Placeholder đẹp
  └── (shared V2) types, constants, utils
```

## Key Lessons Applied
- #53: Dùng CSS classes từ design-system.css, KHÔNG hardcode
- #59: withAuth pattern (service_role, bypass RLS)
- #60: V2 ≥ V1 — port 100% features
- #61: Stitch = STYLE, V1 = LOGIC
- #64: KHÔNG border, CHỈ shadow
- #65: snake_case ENUM, map display ở constant layer
- #66: V2 table names (contract_items, work_tasks, payments)

---

## Sub-Phase A: Route + Layout (Tasks 4.1, 4.10, 4.12)

### Task 4.1 — Route + Layout Shell
**Files:**
- CREATE: `app/(protected)/contracts/[id]/page.tsx`
- CREATE: `app/(protected)/contracts/[id]/loading.tsx`
- CREATE: `components/contracts/detail/contract-detail-client.tsx`

**Steps:**
1. Tạo dynamic route `/contracts/[id]/page.tsx` (Server Component)
2. Fetch data bằng `getContractById(id)` (server-side)
3. Pass data → `ContractDetailClient` (client component)
4. Layout: 2-col desktop `lg:grid-cols-10` (7+3), 1-col mobile
5. Loading skeleton cho page

**V1 Ref:** `0Moodstudio/webapp/app/(protected)/contracts/[id]/page.tsx` L291-458

### Task 4.10 — Top Action Bar
**Files:**
- CREATE: `components/contracts/detail/top-action-bar.tsx`

**Steps:**
1. Desktop: `← Quay lại danh sách` (left) + `Xuất file | In | Sửa` (right)
2. Mobile: Icon-only buttons
3. Sửa → link to `/contracts/[id]/edit` (Phase 05, href sẵn)
4. In → link to `/contracts/[id]/print` (Phase 07, href sẵn)

**V1 Ref:** `page.tsx` L313-379

### Task 4.12 — Cancel/Delete Banner
**Files:**
- CREATE: `components/contracts/detail/cancel-banner.tsx`

**Steps:**
1. Nếu `status === "da_huy"` → hiện banner cảnh báo (red/orange)
2. Giảm opacity toàn bộ content phía dưới (`opacity-60`)
3. Hiển thị lý do hủy nếu có

**V1 Ref:** `ContractCancelDeleteActions.tsx` variant="banner"

---

## Sub-Phase B: Core Sections (Tasks 4.2, 4.3, 4.5)

### Task 4.2 — SummaryCard
**Files:**
- CREATE: `components/contracts/detail/summary-card.tsx`

**Data:** `contracts` + `customers` (joined)
**Hiển thị:**
- Mã HĐ (`contract_code`)
- Khách hàng (`customers.full_name`) → link future
- Gói dịch vụ (`service_type` → display label từ `SERVICE_TYPE_LABELS`)
- Ngày ký (`contract_date`)
- Ngày làm (`work_date`)
- Trạng thái badge (`status` → `CONTRACT_STATUS_LABELS` + color)

**V1 Ref:** `details/SummaryCard.tsx`

### Task 4.3 — CustomerInfoBlock
**Files:**
- CREATE: `components/contracts/detail/customer-info-block.tsx`

**Data:** `customers` (từ join)
**Hiển thị:**
- Avatar chữ cái đầu
- Tên KH, SĐT, Email
- Địa chỉ
- Cô dâu / Chú rể (nếu có trong notes hoặc field riêng)

**V1 Ref:** `details/CustomerInfoBlock.tsx`

### Task 4.5 — ServiceDetailsBlock
**Files:**
- CREATE: `components/contracts/detail/service-details-block.tsx`

**Data:** `contract_items`
**Hiển thị:**
- Desktop: Table (Mã DV, Tên, Loại, SL, Đơn giá, Thành tiền)
- Mobile: Card list compact
- Footer: Tạm tính, Giảm giá (nếu có), Tổng cộng

**V1 Ref:** `details/ServiceDetailsBlock.tsx` (210 lines — port logic, adapt UI)

---

## Sub-Phase C: Financial + Events (Tasks 4.4, 4.6, 4.7, 4.8)

### Task 4.4 — Financial Dashboard
**Files:**
- CREATE: `components/contracts/detail/financial-dashboard.tsx`

**Data:** `contracts` (total_amount, paid_amount, remaining_amount)
**Hiển thị:**
- 3 cards: Tổng cộng (neutral), Đã thu (green), Còn nợ (red/orange)
- Progress bar thanh toán (%)
- Công thức: `progress = Math.round((paid_amount / total_amount) * 100)`

**V1 Ref:** `ContractDrawer.tsx` L89-148

### Task 4.6 — EventTimeline
**Files:**
- CREATE: `components/contracts/detail/event-timeline.tsx`

**Data:** `contract_events` + `work_tasks` (task count per event)
**Hiển thị:**
- Event cards: title, date, location, status badge
- Task count badge: `3/5 tasks`
- Sort by event_date ascending

**V1 Ref:** `details/EventTimeline.tsx` + `details/EventSection.tsx`

### Task 4.7 — PaymentHistory
**Files:**
- CREATE: `components/contracts/detail/payment-history.tsx`

**Data:** `payments`
**Hiển thị:**
- Danh sách phiếu thanh toán (ngày, số tiền, phương thức, ghi chú)
- Empty state nếu chưa có

**V1 Ref:** `details/ReceiptsHistoryBlock.tsx`

### Task 4.8 — FinancialSummary
**Files:**
- CREATE: `components/contracts/detail/financial-summary.tsx`

**Data:** computed từ contracts + payments
**Hiển thị:**
- Tổng giá trị HĐ
- Đã thanh toán / Còn nợ
- Progress % (dark luxury theme V1)

**V1 Ref:** `details/FinancialSummaryBlock.tsx`

---

## Sub-Phase D: Polish (Tasks 4.9, 4.11 + Wire)

### Task 4.9 — ContractActions Shell
**Files:**
- CREATE: `components/contracts/detail/contract-actions-shell.tsx`

**Hiển thị:**
- 3 nút bấm: Thêm trang phục (pink), Đặt lệnh in (blue), Thu tiền (green)
- Chưa wire form — chỉ UI + toast "Tính năng sẽ sớm cập nhật"
- Phase 05 sẽ wire → modal forms

**V1 Ref:** `ContractActions.tsx` (171 lines)

### Task 4.11 — Empty State Placeholders
**Files:**
- CREATE: `components/contracts/detail/empty-state-placeholder.tsx`

**Dùng cho:**
- Checklist vận hành → "Chưa có checklist. Tính năng đang phát triển."
- Ghi chú nội bộ → "Chưa có ghi chú."
- Trang phục → "Chưa có trang phục. Bấm 'Thêm trang phục' để bắt đầu."
- In ấn → "Chưa có đơn in."
- Hoạt động → "Chưa có hoạt động nào."

### Wire List → Detail (bonus)
**Files:**
- MODIFY: `components/contracts/contracts-table.tsx` — thêm `onClick` row → `router.push(/contracts/${id})`

---

## Test Criteria (04a→04d)
- [x] Build pass (`npm run build`)
- [x] Click vào HĐ từ danh sách → mở trang detail
- [x] Desktop: 2-column layout hiển thị đúng
- [x] Mobile: 1-column stack
- [x] Tất cả sections render data thật (không mock)
- [x] Empty states hiện cho sections chưa có data
- [x] Nút Back → quay về `/contracts`
- [x] HĐ status "da_huy" → hiện cancel banner + opacity

---

## Execution Order (04a→04d) ✅ DONE
```
4.1 (Route+Layout) → 4.10 (Action Bar) → 4.12 (Cancel Banner)
    → 4.2 (Summary) → 4.3 (Customer) → 4.5 (Services)
    → 4.4 (Financial) → 4.6 (Events) → 4.7 (Payments) → 4.8 (Summary)
    → 4.9 (Actions Shell) → 4.11 (Empty States)
    → Wire contracts-table click
    → Build verify
```

---

## Sub-Phase E: Desktop Polish (Hardcode Audit) ✅ DONE
Status: ✅ Complete (2026-03-17)

### Task 4.13 — Audit Desktop Hardcoded Values
**Result:** Found & fixed 4 instances of `text-[11px]` → `text-caption`
**Files Modified:**
- `quick-actions-grid.tsx` — label text
- `workflow-stepper.tsx` — step labels
- `files-drive-placeholder.tsx` — sub-text
- `checklist-block.tsx` — date text

### Task 4.14 — Header Conditional Hide
**Files Modified:**
- `components/layout/header.tsx` — Added `isDetailPage` logic, hide header on detail routes
- `app/design-system.css` — Adjusted `.main-container` top padding

### Task 4.15 — Quick Actions Rainbow Enhancement
**Files Modified:**
- `quick-actions-grid.tsx` — Rainbow colored icons, bg circles, hover effects, `w-12 h-12` icons

---

## Sub-Phase F: Mobile Responsive (Stitch SSOT Alignment) ⬜ PENDING
Status: ⬜ Pending
Dependencies: Sub-Phase E ✅
SSOT: Stitch screen `16c286beb8df4ebab01a1541c59ee273`
SSOT HTML: `c:\tmp\stitch_mobile_contract.html` (291 lines)
Gap Analysis: `artifacts/gap_analysis_mobile_contract.md`
Score Analysis: `artifacts/mobile_stitch_score.md`
**Current Match: ~36%** → Target: **100%**

### 🛡️ Desktop Safety Architecture
```
🔒 Rule 1: KHÔNG SỬA bất kỳ dòng nào trong block `max-lg:hidden` (desktop)
🔒 Rule 2: Chỉ thêm responsive modifier (max-lg:hidden, lg:hidden), KHÔNG xóa class hiện tại
🔒 Rule 3: Component mới (TabNav) = lg:hidden only
🔒 Rule 4: Grid changes → dùng prefix (grid-cols-2 lg:grid-cols-3), desktop breakpoint GIỮ NGUYÊN
🔒 Rule 5: Sau code xong → mở desktop 1424px verify KHÔNG KHÁC GÌ trước khi check mobile
```

### Stitch Mobile Structure (SSOT — 11 sections, exact HTML lines):
```
 #  | Section              | HTML Lines | Key Classes
----+----------------------+------------+------------------------------------------
 1  | Sticky Header        | 47-57      | sticky top-0 z-50 bg-white/90 backdrop-blur-md h-14
 2  | Badges + Tên KH      | 59-71      | "Đã cọc"(amber) "Cưới"(slate) + text-xl font-bold
 3  | Financial Card       | 72-101     | rounded-2xl p-5, text-center, grid 2-col, CTA h-12
 4  | Workflow Stepper     | 103-137    | card, "Bước 4/6", 6 dots w-3.5, step-completed/active/pending
 5  | Sticky Tab Nav       | 139-147    | sticky top-14 z-40, 5 pills, overflow-x-auto no-scrollbar
 6  | Lịch trình           | 149-182    | Event card + staff checkboxes + "Xem tất cả"
 7  | In ấn                | 183-207    | "Tạo đơn in" CTA + progress 45%
 8  | Checklist            | 208-247    | "12/18" + sub-tabs (Chụp|Ảnh|Phóng) + checkbox items
 9  | Quick Actions        | 249-277    | grid-cols-2, 6 btns, monochrome primary icons
10  | Bottom Bar           | 280-289    | fixed bottom-0, "Sửa"(outline) + "Thu tiền"(primary), h-12
```

---

### Task 4.20 — Mobile Header Sticky + Compact (20% → 100%)
**Stitch ref:** HTML lines 47-57
**File:** `components/contracts/detail/top-action-bar.tsx`
**Desktop safety:** Chỉ sửa trong `lg:hidden` block (lines 58-67) + thêm wrapper responsive
**Changes:**
1. Mobile wrapper: `lg:hidden sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 h-14`
2. Layout: `flex items-center justify-between px-4 h-14`
3. Left: `button w-10 h-10 rounded-full` → ArrowLeft icon only (bỏ text "Quay lại")
4. Center: mã HĐ `text-[15px] font-semibold tracking-tight uppercase`
5. Right: MoreHorizontal `w-10 h-10 rounded-full text-[20px]`
6. Ẩn title row + action buttons trên mobile: `max-lg:hidden` cho div dòng 70-113
7. Desktop: `max-lg:hidden` blocks GIỮ NGUYÊN

### Task 4.16 — Mobile SummaryCard Compact (15% → 100%)
**Stitch ref:** HTML lines 59-71
**File:** `components/contracts/detail/summary-card.tsx`
**Desktop safety:** Desktop dùng `embedded` prop hoặc wrapper. Thêm responsive classes, KHÔNG xóa
**Changes:**
1. Mobile block `lg:hidden`: 
   - 2 pills ngang (`flex gap-2 mb-3`): status badge (amber) + service type badge (slate)
   - Style pills: `px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider`
   - Tên KH: `text-xl font-bold leading-tight` (lấy từ customer.full_name)
2. Desktop block `max-lg:hidden`: GIỮ NGUYÊN toàn bộ (FileText icon + mã HĐ + info grid)
3. Ẩn info grid trên mobile: thêm `max-lg:hidden` cho div grid-cols-2 (line 64)

### Task 4.21 — Financial Card Mobile Variant (45% → 100%)
**Stitch ref:** HTML lines 72-101
**File:** `components/contracts/detail/financial-dashboard.tsx`
**Desktop safety:** Bọc desktop content trong `max-lg:hidden`, thêm mobile block `lg:hidden`
**Changes — Mobile block:**
1. Ẩn "Tài chính" h3 header trên mobile
2. Amount: `text-center mb-5` → "Tổng giá trị hợp đồng" `text-[11px] uppercase tracking-widest mb-1` + amount `text-[24px] font-bold tracking-tight`
3. Progress: "Tiến độ thanh toán" `text-[10px] font-bold uppercase` + "60%" `text-[10px] font-bold text-primary` + bar `h-2`
4. Grid 2-col: `grid grid-cols-2 gap-4 mb-6`
   - Card 1: "Đã thu" `text-[10px] uppercase font-bold` + amount `text-sm font-bold text-green-600` in `bg-slate-50 p-3 rounded-xl border`
   - Card 2: "Còn nợ" + amount `text-sm font-bold text-primary` in same style
5. CTA: `w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20` + Banknote icon `size={20}`
6. Payment history: `max-lg:hidden` (ẩn trên mobile)

### Task 4.22 — Stepper Mobile Dots (25% → 100%) ← MỚI
**Stitch ref:** HTML lines 103-137
**File:** `components/contracts/detail/workflow-stepper.tsx`
**Desktop safety:** Chỉ sửa `lg:hidden` block (lines 110-132). Desktop `max-lg:hidden` (lines 54-107) NGUYÊN XI
**Changes — Replace mobile block:**
1. Card wrapper giữ nguyên `card-base p-4`
2. Header: "Tiến độ thực hiện" `text-[11px] font-bold uppercase tracking-widest` + "Bước X/6" `text-[11px] font-bold text-primary`
3. 6 dots horizontal: `relative flex items-center justify-between`
   - Progress line background: `absolute top-1.5 left-0 w-full h-[2px] bg-slate-100`
   - Progress line filled: `absolute top-1.5 left-0 w-[X%] h-[2px] bg-green-500`
   - Each dot: `relative z-10 flex flex-col items-center gap-1.5`
     - Circle: `w-3.5 h-3.5 rounded-full`
     - Label: `text-[9px] font-bold`
   - States: `step-completed` (bg-green-500), `step-active` (bg-primary ring-4 ring-primary/20), `step-pending` (bg-slate-200)

### Task 4.17 — Sticky Tab Navigation (0% → 100%) ← TẠO MỚI
**Stitch ref:** HTML lines 139-147
**File:** CREATE `components/contracts/detail/mobile-tab-nav.tsx`
**Desktop safety:** Toàn bộ component `lg:hidden` — desktop KHÔNG render
**Specs:**
1. Container: `lg:hidden sticky top-14 z-40 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm px-4 py-3 border-b border-slate-200`
2. Inner: `flex gap-2 overflow-x-auto no-scrollbar`
3. Active pill: `whitespace-nowrap px-4 py-2 rounded-full bg-primary text-white text-[13px] font-bold shadow-sm`
4. Inactive pill: `whitespace-nowrap px-4 py-2 rounded-full bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[13px] font-bold border border-slate-200 dark:border-slate-800`
5. Tabs: "Chi tiết" | "Lịch trình" | "In ấn" | "Checklist" | "Thao tác"
6. onClick: `scrollIntoView({ behavior: 'smooth' })` to section IDs
7. State: `useState` for activeTab, `useEffect` with IntersectionObserver for auto-highlight

### Task 4.18 — QuickActions Mobile Grid (0% → 100%)
**Stitch ref:** HTML lines 249-277
**File:** `components/contracts/detail/quick-actions-grid.tsx` + `contract-detail-client.tsx`
**Desktop safety:** Grid change via responsive prefix only
**Changes:**
1. Grid: `grid-cols-2 lg:grid-cols-3` (mobile 2-col, desktop 3-col giữ nguyên)
2. Mobile button style: `bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 active:bg-slate-50` (Stitch monochrome)
3. Mobile icon: `text-primary bg-primary/10 p-2 rounded-xl` (Stitch uniform, thay vì rainbow)
4. Mobile labels: `text-xs font-bold text-slate-700`
5. Add to mobile layout in `contract-detail-client.tsx` (cuối, trước bottom bar)

### Task 4.19 — Mobile Section Reorder + Cleanup (35% → 100%)
**File:** `components/contracts/detail/contract-detail-client.tsx`
**Desktop safety:** Chỉ thay đổi `lg:hidden` block (lines 176-234). `max-lg:hidden` block (109-171) NGUYÊN XI
**New mobile layout order:**
```tsx
<div className="lg:hidden">
  <div className="flex flex-col gap-4 mt-4">
    {/* 1. SummaryCard compact — badges + tên KH */}
    <SummaryCard contract={contract} customer={contract.customers || null} />
    
    {/* 2. FinancialDashboard — mobile variant */}
    <FinancialDashboard totalAmount={...} paidAmount={...} remainingAmount={...} />
    
    {/* [WorkflowStepper renders OUTSIDE both blocks — already OK] */}
    
    {/* 3. MobileTabNav — sticky tab pills */}
    <MobileTabNav />
    
    {/* 4. Lịch trình sự kiện */}
    <div id="section-events">
      <EventTimeline events={...} tasks={...} />
    </div>
    
    {/* 5. Đơn hàng in ấn */}
    <div id="section-print">
      <PrintOrdersBlock orders={printOrders} />
    </div>
    
    {/* 6. Checklist công việc */}
    <div id="section-checklist">
      <ChecklistBlock tasks={...} />
    </div>
    
    {/* 7. Thao tác nhanh */}
    <div id="section-actions">
      <QuickActionsGrid />
    </div>
  </div>
</div>
```
**Removed from mobile (6 components):**
- `CustomerInfoBlock` — tên KH đã trong SummaryCard compact
- `ServiceDetailsBlock` — Stitch không hiện mobile
- `CostumesBlock` — Stitch không hiện mobile
- `PaymentHistory` — gộp vào Financial card
- `FinancialSummary` — gộp vào Financial card
- `ActivityLog` — Stitch không hiện mobile

### Task 4.23 — Bottom Bar Polish (70% → 100%) ← MỚI
**Stitch ref:** HTML lines 280-289
**File:** `components/contracts/detail/mobile-bottom-bar.tsx`
**Desktop safety:** Đã `lg:hidden` — desktop không render
**Changes:**
1. Position: `bottom-0` (thay `bottom-16`) + `pb-8 safe-area-bottom`
2. Container inner: `max-w-[375px] mx-auto`
3. Buttons: `h-12` cố định (thay `py-2.5`)
4. "Sửa": `border border-slate-200 dark:border-slate-700 text-slate-700 font-bold text-[14px]` (outline, bỏ bg-bg-hover, bỏ icon)
5. "Thu tiền": `bg-primary text-white font-bold text-[14px] shadow-lg shadow-primary/20 active:scale-[0.98]` (bỏ icon)
6. Bỏ Pencil + Banknote icons (Stitch chỉ text-only)

---

## Test Criteria (04f — Mobile Responsive → 100%)
- [ ] Build pass (`npm run build`)
- [ ] ⚠️ Desktop 1424px: KHÔNG KHÁC GÌ so với trước Phase 04f
- [ ] Mobile 375px: layout 1-col, thứ tự match Stitch SSOT
- [ ] ① Header: sticky top-0, h-14, icon-only back + center mã HĐ + ⋯
- [ ] ② SummaryCard: 2 badges + tên KH text-xl, ẩn stats grid
- [ ] ③ Financial: center amount, grid 2-col Đã thu/Còn nợ, CTA h-12 + icon
- [ ] ④ Stepper: dots w-3.5 + labels text-[9px] + connecting line + 3 states
- [ ] ⑤ Tab Nav: sticky, 5 pills scroll ngang, active highlight
- [ ] ⑥ QuickActions: grid 2-col, monochrome primary icons
- [ ] ⑦ Sections: đúng thứ tự, 6 components thừa ẨN
- [ ] ⑧ Bottom Bar: bottom-0, h-12, text-only no icons

## Execution Order (04f — Mobile Responsive)
```
[✅ DONE] 4.20 (Sticky Header)
[✅ DONE] 4.16 (SummaryCard compact - badges + tên)
[✅ DONE] 4.21 (Financial mobile variant - xanh/cam)
[✅ DONE] 4.22 (Stepper dots - interactive color)
[✅ DONE] 4.17 (Tab Nav NEW component - interactive color)
[✅ DONE] 4.18 (QuickActions mobile grid - interactive color)
[✅ DONE] 4.23 (Bottom Bar polish - interactive color)
[⬜ PENDING] 4.19 (Reorder Sections: Header → Summary → Financial → Stepper → TabNav → Quick Actions → Bottom Bar)
  → Chỉnh file `contract-detail-client.tsx`
  → Build verify
  → Desktop 1424px regression check
  → Mobile 375px visual 1:1 check vs Stitch
```

---

Next Phase: Phase 05 — Contract Form (Create/Edit)
