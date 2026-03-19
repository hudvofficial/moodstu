# Phase C: Lead Module — Core (Kanban + List)
**Status:** ⬜ Pending
**Dependencies:** Phase A ✅
**Est.:** 2 hours

---

## Objective
Port V1 Kanban full features (deal value, score, inline edit, mobile buttons) + LeadListView full table.

## V1 Source Files (PHẢI ĐỌC KỸ)
- `components/crm/KanbanBoard.tsx` (240 lines)
- `components/crm/KanbanCards.tsx` (211 lines — Desktop + Mobile cards)
- `components/crm/LeadListView.tsx` (192 lines — table + mobile card)
- `components/crm/LeadsViewToggle.tsx` (96 lines — 3-tab toggle + realtime)

## V2 Target Files
- `components/crm/leads/LeadKanban.tsx` — upgrade existing
- `components/crm/leads/LeadKanbanCards.tsx` — **NEW** (port KanbanCards)
- `components/crm/leads/LeadList.tsx` — upgrade existing
- `components/crm/leads/LeadViewToggle.tsx` — upgrade existing

---

## Implementation Steps

### C1. Port KanbanDesktopCard
- [ ] Tạo `components/crm/leads/LeadKanbanCards.tsx`
- [ ] Port V1 `KanbanDesktopCard`: name link, score badge, source+phone, needs, tags (max 3), deal value (inline edit), next_contact_date
- [ ] **Đổi:** Material Symbols → Lucide (`alarm` → `AlarmClock`, etc.)
- [ ] **Đổi:** Hardcode colors → V2 tokens (`bg-elevated`, `text-text-main`, etc.)
- [ ] Giữ nguyên: `draggable`, `onDragStart`, cursor styles

### C2. Port KanbanMobileCard
- [ ] Trong cùng file `LeadKanbanCards.tsx`
- [ ] Port V1 `KanbanMobileCard`: name, score, deal value, source, phone (tel: link), left/right buttons
- [ ] **Đổi:** `material-symbols-outlined` → `<ChevronLeft />`, `<ChevronRight />`
- [ ] Giữ nguyên: `onMove(leadId, direction)` pattern

### C3. Upgrade LeadKanban (KanbanBoard logic)
- [ ] Đọc V2 `LeadKanban.tsx` hiện tại
- [ ] Thêm từ V1: `editingDeal` state, `dealInput` state, `handleSaveDeal`
- [ ] Thêm: pipeline value SUM per stage (`getStageValue`)
- [ ] Thêm: hiện `💰 {formatCurrency(stageValue)}` dưới stage header
- [ ] Thêm: mobile move handler (`handleMobileMove`)
- [ ] Replace inline cards → dùng `LeadKanbanCards` components
- [ ] Import `updateDealValue` from actions

### C4. Port pipeline actions vào component
- [ ] Wire `moveLeadToStage` (from Phase A) vào `handleDrop`
- [ ] Wire `updateDealValue` vào `handleSaveDeal`
- [ ] Optimistic update pattern: setState → startTransition → server action → rollback on error

### C5. Port LeadListView full
- [ ] Upgrade V2 `LeadList.tsx` với V1 `LeadListView.tsx` logic
- [ ] Desktop table columns: Khách hàng (avatar+name+date), Liên hệ (phone+email), Nguồn, Nhu cầu, Score (badge+icon), Deal Value, Trạng thái (status+potential), Thao tác
- [ ] Mobile card: avatar, name, source·phone, score badge, potential badge, chevron
- [ ] Empty state: icon + "Chưa có khách tiềm năng" + CTA link
- [ ] **Đổi:** Material Symbols → Lucide

### C6. Port LeadViewToggle 3-tab
- [ ] Upgrade V2 `LeadViewToggle.tsx`
- [ ] 3 tabs: `kanban` / `list` / `analytics` (V1 pattern)
- [ ] Dynamic import for KanbanBoard và ConversionFunnel (code splitting)
- [ ] Search filter áp dụng cho tất cả views
- [ ] Show count: `{filteredLeads.length} leads`
- [ ] **Đổi:** `material-symbols-outlined` → Lucide (`LayoutGrid`, `List`, `BarChart3`)

### C7. Port useRealtime hook
- [ ] Check V2 có `hooks/useRealtime.ts` chưa
- [ ] Nếu chưa: port V1 `useRealtime("crm_leads")` pattern
- [ ] Subscribe Supabase realtime channel → router.refresh() on change
- [ ] Add to LeadsViewToggle

### C8. Verify Lead page server render
- [ ] `app/(protected)/crm/leads/page.tsx` — ensure data fetch logic matches V1
- [ ] V1 fetches: all leads + compute stats + compute funnel IN SERVER
- [ ] Pass all 3 to `LeadsViewToggle` as props

### C9. Split check
- [ ] Verify all files < 250 lines
- [ ] Split if needed: LeadKanbanCards (Desktop + Mobile) có thể > 200 lines → OK nếu < 250

---

## Files to Create/Modify
| File | Action |
|------|--------|
| `components/crm/leads/LeadKanbanCards.tsx` | **CREATE** — port KanbanCards |
| `components/crm/leads/LeadKanban.tsx` | **MODIFY** — add deal value, score, pipeline SUM |
| `components/crm/leads/LeadList.tsx` | **MODIFY** — full table + mobile card |
| `components/crm/leads/LeadViewToggle.tsx` | **MODIFY** — 3-tab + dynamic import |
| `hooks/useRealtime.ts` | **CREATE** or verify |
| `app/(protected)/crm/leads/page.tsx` | **MODIFY** — server data fetch |

## Test Criteria
- [ ] Kanban: drag-drop works desktop
- [ ] Kanban: deal value hiện mỗi stage header
- [ ] Kanban card: tap deal value → inline edit → save
- [ ] Kanban card mobile: left/right buttons work
- [ ] Lead list table: 8 columns visible
- [ ] Lead list mobile: card view with score + potential
- [ ] View toggle: switch giữa 3 tabs không flash
- [ ] Realtime: thay đổi data → auto refresh
- [ ] Build pass: `npm run build`

---
**Next Phase:** → Phase D (Lead Analytics)
