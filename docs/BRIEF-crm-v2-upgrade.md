# 💡 BRIEF: CRM V2 Upgrade — Port V1 + Nâng cấp

**Ngày tạo:** 2026-03-16
**Phiên bản:** V2.0
**Tác giả:** Senior Dev Engineer (10 năm)

---

## 1. MỤC TIÊU

> V2 CRM = 100% V1 features + V2 code quality + Stitch styling + Cải tiến mới

**KHÔNG ĐƯỢC mất bất kỳ feature nào của V1.**

---

## 2. KIẾN TRÚC ĐÃ CÓ — TẬN DỤNG TỐI ĐA

### 2.1. V2 Foundation đã sẵn (GIỮ NGUYÊN):
| Tài sản | Chi tiết |
|---------|----------|
| Design System | Earth-tone tokens, Inter font, 4-8-12-16-24-32 spacing |
| CSS Variables | `--color-primary`, `--color-bg`, dark mode tokens |
| Layout System | Header + Sidebar + Content + CrmTabs |
| Supabase | Tables: `customers`, `crm_leads` + RLS + withAuth pattern |
| Server Actions | `app/actions/crm.ts` — CRUD + stats (đã chuyển withAuth) |
| Shared Components | FilterChip, OverdueBadge, PhoneLink, SourceBadge, StatusBadge |
| Stitch Reference | Color palette, spacing, layout grid, component style |
| Lucide Icons | Lighter than V1 Material Symbols (150KB saving) |

### 2.2. V1 Logic đã proven (PHẢI PORT):
| Component V1 | Lines | Chức năng | V2 hiện có? |
|--------------|-------|-----------|-------------|
| `KanbanBoard.tsx` | 240 | 5-stage drag-drop + deal value per stage | ⚠️ Có nhưng thiếu deal, score |
| `KanbanCards.tsx` | 211 | Desktop: drag + inline deal edit. Mobile: left/right buttons | ❌ |
| `ConversionFunnel.tsx` | 174 | Pipeline overview + progress bar + phễu visual | ❌ |
| `SourceChart.tsx` | 117 | SVG doughnut chart nguồn khách | ❌ |
| `LeadsViewToggle.tsx` | 96 | 3-tab toggle: Kanban / List / Analytics + realtime | ⚠️ Có nhưng thiếu analytics |
| `LeadListView.tsx` | 192 | Table desktop + Card mobile cho leads | ⚠️ Có nhưng thiếu score, deal value |
| `SmartCRMFab.tsx` | 52 | Auto-detect tab → đúng modal + hide on detail | ❌ Có CrmFab nhưng manual |
| `CRMLayoutHeader.tsx` | 66 | Route-aware search + create button | ❌ |
| `CareLogSection.tsx` | 152 | Timeline vertical + emoji type dropdown | ⚠️ Có CareTimeline nhưng đơn giản |
| `ConvertButton.tsx` | 53 | Confirm → chuyển lead→customer→contract | ⚠️ Có nhưng chưa link DB |
| `CRMSearch.tsx` | 40 | Debounced search 300ms + URL params | ❌ Search chỉ URL param |
| `CRMSkeletons.tsx` | ? | Loading skeletons cho CRM | ❌ |
| `LeadFormModal.tsx` | ? | Modal form tạo lead nhanh | ⚠️ Có LeadForm nhưng full page |
| `TagsInput.tsx` | ? | Autocomplete tags input | ❌ |
| `pipeline-actions.ts` | ? | moveLeadToStage, updateDealValue | ❌ |

### 2.3. V2 types đã có (TẬN DỤNG):
| File V1 | V2 tương đương | Cần bổ sung |
|---------|----------------|-------------|
| `types/crm.ts` — PIPELINE_STAGES, TAG_PRESETS, getScoreLevel, AVATAR_COLORS, STATUS_BADGE_COLORS | Có nhưng cần verify | Thêm score levels, tag presets |

---

## 3. FEATURE MAP — V1 → V2

### 3.1. 👥 CUSTOMER MODULE

| Feature | V1 | V2 hiện tại | V2 Target | Action |
|---------|-----|-------------|-----------|--------|
| Customer List (table) | ✅ Server render | ⚠️ Client render | ✅ Server render | **Chuyển lại server** |
| Customer Stats (3 cards) | ✅ | ✅ | ✅ | Fix bg-white dark mode |
| Customer Search | ✅ Debounced | ⚠️ URL only | ✅ Inline search bar | **Port CRMSearch** |
| Customer Detail/360 | ✅ | ✅ CustomerDetail | ✅ | Verify đầy đủ fields |
| Customer Form (modal) | ✅ Modal | ✅ CustomerForm | ✅ | OK |
| LTV (Lifetime Value) | ✅ Linked contracts | ❌ Hardcode `—` | ✅ Query contracts | **Fix query** |
| Customer Tags | ✅ | ⚠️ | ✅ | Verify |
| Create from URL param | ✅ `?create=true` | ⚠️ | ✅ | Port pattern |

### 3.2. 📊 LEAD MODULE

| Feature | V1 | V2 hiện tại | V2 Target | Action |
|---------|-----|-------------|-----------|--------|
| Lead Kanban (5 cols) | ✅ Drag-drop | ✅ LeadKanban | ✅ | **Thêm deal value + score** |
| Kanban Desktop Card | ✅ Score, tags, deal inline edit, next_contact | ⚠️ Basic | ✅ | **Port KanbanCards** |
| Kanban Mobile Card | ✅ Left/Right buttons + deal value | ⚠️ Basic | ✅ | **Port mobile pattern** |
| Pipeline Value/Stage | ✅ 💰 SUM mỗi cột | ❌ | ✅ | **Port** |
| Deal Value Inline Edit | ✅ Click→input→save | ❌ | ✅ | **Port** |
| Lead List View (table + card) | ✅ Full: avatar, score, deal, status, potential | ⚠️ LeadList basic | ✅ | **Port LeadListView** |
| Lead View Toggle (3-tab) | ✅ Kanban/List/Analytics + realtime | ⚠️ LeadViewToggle basic | ✅ | **Port + useRealtime** |
| ConversionFunnel | ✅ 174 dòng visual | ❌ | ✅ | **Port nguyên** |
| SourceChart (doughnut) | ✅ SVG donut | ❌ | ✅ | **Port nguyên** |
| Score System | ✅ getScoreLevel() + icon + color | ❌ | ✅ | **Port types** |
| Lead Detail Page | ✅ Full page | ✅ LeadDetail | ✅ | Verify + add CareLog |
| Lead Form (modal) | ✅ Quick modal from FAB | ⚠️ LeadForm (full page?) | ✅ Modal | **Port LeadFormModal** |
| Lead Create Page | ✅ /crm/leads/create | ? | ✅ | Verify |
| Lead Edit Page | ✅ /crm/leads/[id]/edit | ? | ✅ | Verify |
| CareLog Timeline | ✅ Vertical + emoji type + add form | ⚠️ CareTimeline basic | ✅ | **Port full version** |
| Convert Lead→Customer | ✅ Confirm + redirect | ⚠️ ConvertButton basic | ✅ | **Fix DB link** |
| Lead Tags (autocomplete) | ✅ TagsInput | ❌ | ✅ | **Port TagsInput** |
| Pipeline Actions | ✅ moveLeadToStage, updateDealValue | ❌ | ✅ | **Port server actions** |
| Lead Stats (mobile strip) | ✅ Tổng/Active/Chốt | ✅ LeadStats | ✅ | Verify match |
| Realtime subscription | ✅ useRealtime("crm_leads") | ❌ | ✅ | **Port hook** |

### 3.3. 🏗 LAYOUT & NAVIGATION

| Feature | V1 | V2 hiện tại | V2 Target | Action |
|---------|-----|-------------|-----------|--------|
| CRM Layout Header | ✅ Route-aware search + create | ⚠️ Generic header | ✅ | **Port CRMLayoutHeader** |
| CRM Tabs | ✅ CrmTabs | ✅ CrmLayoutClient | ✅ | OK |
| SmartCRMFab | ✅ Auto-detect tab + hide on detail | ⚠️ CrmFab manual | ✅ | **Port SmartCRMFab** |
| Loading Skeletons | ✅ CRMSkeletons | ❌ | ✅ | **Port** |

---

## 4. NÂNG CẤP V2-ONLY (V1 CHƯA CÓ)

| # | Feature mới | Vì sao cần | Effort |
|---|-------------|------------|--------|
| 1 | **Dark mode hoàn chỉnh** | V1 partial dark mode, V2 có full tokens | Verify all components |
| 2 | **Lucide Icons** thay Material Symbols | Nhẹ hơn 150KB, tree-shakeable | Đã convert phần lớn |
| 3 | **TypeScript strict** | V1 dùng `as unknown as`, V2 typed đúng | Verify types |
| 4 | **Design tokens** nhất quán | V1 hardcode colors, V2 dùng CSS vars | Apply khi port |
| 5 | **Stitch visual polish** | Layout grid, border-radius, shadow chuẩn | Apply song song khi port |
| 6 | **Server Components** cho list pages | V1 đã có, V2 bị lùi thành client | Chuyển lại server |

---

## 5. QUY TẮC PORT V1 → V2

```
1. ĐỌC V1 component code
2. Copy LOGIC + structure nguyên vẹn
3. Đổi:
   - Material Symbols → Lucide icons
   - Hardcode colors → design tokens (text-text-main, bg-elevated, etc.)
   - Hardcode dark mode → auto CSS variable
   - Import paths → V2 paths
4. KHÔNG thêm/bớt feature
5. KHÔNG thay đổi business logic
6. Test: mọi interaction V1 có → V2 phải có
```

---

## 6. IMPLEMENTATION ORDER

Nguyên tắc: **Nền trước, Mặt tiền sau**

### Phase A: Types & Server Actions (30 min)
```
1. Port/merge V1 types/crm.ts → V2 types (PIPELINE_STAGES, TAG_PRESETS, getScoreLevel, etc.)
2. Port pipeline-actions.ts (moveLeadToStage, updateDealValue)  
3. Verify all models/interfaces match V1 capabilities
```

### Phase B: Customer Module Fix (1 hour)
```
4. Customer page → Server Component (match V1)
5. Port CRMSearch → inline search bar
6. Fix CustomerStats dark mode (bg-white → bg-bg-card)
7. Fix LTV query (link contracts)
8. Pagination → right-align (Stitch)
```

### Phase C: Lead Module — Core (2 hours)
```
9. Port KanbanCards (Desktop + Mobile) — score, deal inline edit, tags
10. Upgrade KanbanBoard — deal value per stage, pipeline value SUM
11. Port pipeline-actions server actions
12. Port LeadListView full (table + mobile card)
13. Port LeadViewToggle 3-tab (Kanban/List/Analytics)
14. Port useRealtime hook for crm_leads
```

### Phase D: Lead Module — Analytics (1 hour)
```
15. Port ConversionFunnel nguyên vẹn (pipeline overview + funnel bars)
16. Port SourceChart (SVG doughnut)
17. Wire analytics data vào LeadViewToggle tab #3
```

### Phase E: Lead Module — Detail & Forms (1 hour)
```
18. Port CareLogSection full (timeline + emoji type + add form)
19. Port LeadFormModal (quick create from FAB)
20. Port TagsInput (autocomplete)
21. Verify ConvertButton → DB link
22. Verify Lead Detail page tất cả fields
```

### Phase F: Layout & Polish (30 min)
```
23. Port SmartCRMFab (auto-detect tab)
24. Port CRMLayoutHeader (route-aware search + create)
25. Port CRMSkeletons
26. Dark mode sweep — verify all ported components
27. Stitch visual sweep — spacing, radius, shadow
```

**Tổng ước tính: 6-7 giờ**

---

## 7. CHECKLIST HOÀN THÀNH

### Customer
- [ ] Server-rendered list page
- [ ] Inline search bar (debounced 300ms)
- [ ] LTV hiện số thật từ contracts
- [ ] Stats cards dark mode OK
- [ ] Pagination right-aligned
- [ ] Form modal (create + edit)
- [ ] Detail 360 view — tất cả fields

### Lead Kanban
- [ ] 5-stage columns (Mới→Tư vấn→Báo giá→Hẹn gặp→Chốt deal)
- [ ] Desktop: drag-drop + score badge + inline deal edit + tags
- [ ] Mobile: left/right buttons + deal value + score
- [ ] Pipeline value SUM mỗi stage
- [ ] Empty state per column

### Lead List
- [ ] Desktop table: avatar, contact, source, needs, score, deal, status, actions
- [ ] Mobile card: avatar, name, source, phone, score, potential
- [ ] Empty state CTA

### Lead Analytics
- [ ] ConversionFunnel: pipeline overview + stage grid + funnel bars + drop-off %
- [ ] SourceChart: SVG doughnut + legend

### Lead View Toggle
- [ ] 3-tab: Kanban / Danh sách / Phân tích
- [ ] Realtime subscription (useRealtime)
- [ ] Search filter applied to all views

### Lead Detail
- [ ] CareLog timeline (vertical + emoji types)
- [ ] Add CareLog form (type select + content textarea)
- [ ] ConvertButton → confirm → create customer → redirect
- [ ] All V1 fields present

### Lead Forms
- [ ] LeadFormModal (quick create from FAB)
- [ ] TagsInput autocomplete
- [ ] Lead create page
- [ ] Lead edit page

### Layout
- [ ] SmartCRMFab (auto-detect KH vs Lead tab)
- [ ] CRMLayoutHeader (route-aware search + create button)
- [ ] CRMSkeletons loading states
- [ ] Dark mode: all components verified
- [ ] Stitch styling: all components use design tokens

---

## 8. BƯỚC TIẾP THEO

→ Chạy `/plan phase-A` để bắt đầu Phase A (Types & Server Actions)
→ Mỗi phase xong → verify checklist → chạy phase tiếp

---

## 9. BÀI HỌC GHI NHỚ

> **V2 = V1 + Upgrade, KHÔNG BAO GIỜ V2 < V1.**
> 
> 1. Port V1 logic 100% trước
> 2. Mặc áo V2 (design tokens, Lucide, TypeScript)
> 3. Thêm Stitch visual polish
> 4. Thêm feature mới (dark mode, realtime, etc.)
> 
> Stitch = style reference, KHÔNG PHẢI logic source.
> V1 = logic source, KHÔNG PHẢI style source.
