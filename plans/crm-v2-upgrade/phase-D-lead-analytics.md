# Phase D: Lead Module — Analytics
**Status:** ⬜ Pending
**Dependencies:** Phase C ✅ (LeadViewToggle tab #3)
**Est.:** 1 hour

---

## Objective
Port ConversionFunnel + SourceChart nguyên vẹn. Wire vào LeadViewToggle tab Analytics.

## V1 Source Files (PHẢI ĐỌC KỸ)
- `components/crm/ConversionFunnel.tsx` (174 lines)
- `components/crm/SourceChart.tsx` (117 lines)

## V2 Target Files
- `components/crm/leads/ConversionFunnel.tsx` — **NEW**
- `components/crm/leads/SourceChart.tsx` — **NEW**

---

## Implementation Steps

### D1. Port ConversionFunnel
- [ ] Tạo `components/crm/leads/ConversionFunnel.tsx`
- [ ] Port V1 nguyên vẹn — 2 sections:
  - **Pipeline Summary Strip:** Total leads + Pipeline value + Stage progress bar (color-coded) + Stage details grid (5 cols, count + value + avg days)
  - **Conversion Funnel Visual:** Horizontal bars cho mỗi stage + count + % + drop-off %
- [ ] **Đổi:** `material-symbols-outlined` → Lucide (`Activity` for monitoring, `Filter` for filter_alt)
- [ ] **Đổi:** Hardcode colors → V2 tokens
- [ ] **Giữ:** `STATUS_BAR_COLORS`, `PIPELINE_STAGES` from types (Phase A)
- [ ] **Giữ:** `formatCurrency` from V2 `lib/format.ts`
- [ ] **Giữ:** Animation transitions (`duration-700 ease-out`)

### D2. Port SourceChart (SVG Doughnut)
- [ ] Tạo `components/crm/leads/SourceChart.tsx`
- [ ] Port V1 nguyên vẹn:
  - SVG doughnut (radius 35, circumference 2πr, strokeDasharray/offset)
  - Legend list (color dot + name + %)
  - Sorted by count descending
- [ ] **Đổi:** `material-symbols-outlined pie_chart` → Lucide `PieChart`
- [ ] **Đổi:** `bg-elevated` → V2 token
- [ ] **Giữ:** COLORS array, RADIUS, CIRCUMFERENCE constants
- [ ] **Giữ:** `useMemo` for segment calculation (performance)

### D3. Wire analytics vào LeadViewToggle
- [ ] LeadViewToggle tab #3 (`analytics`) renders:
  ```tsx
  <ConversionFunnel funnel={funnel} stats={stats} />
  <SourceChart sources={sourceCounts} />
  ```
- [ ] Compute `sourceCounts` from leads: `Record<string, number>` (group by `lead.source`)
- [ ] Dynamic import both components (code splitting): `const ConversionFunnel = dynamic(() => import(...))`

### D4. Verify data flow
- [ ] Leads page server component computes: `stats`, `funnel`, `leads`
- [ ] V1 pattern: single query → compute stats + funnel client-side
- [ ] Verify V2 does same or passes pre-computed data

---

## Files to Create/Modify
| File | Action |
|------|--------|
| `components/crm/leads/ConversionFunnel.tsx` | **CREATE** — port V1 |
| `components/crm/leads/SourceChart.tsx` | **CREATE** — port V1 |
| `components/crm/leads/LeadViewToggle.tsx` | **MODIFY** — wire tab #3 |
| `app/(protected)/crm/leads/page.tsx` | **MODIFY** — ensure stats/funnel data passed |

## Test Criteria
- [ ] ConversionFunnel renders with real data
- [ ] Pipeline progress bar shows color segments
- [ ] Stage grid shows 5 stages with count + value
- [ ] Funnel bars animate on load
- [ ] Drop-off % hiện đúng giữa stages
- [ ] SourceChart doughnut renders nếu có ≥ 1 source
- [ ] Legend hiện tên nguồn + %
- [ ] Tab analytics switch không flash
- [ ] Build pass: `npm run build`

---
**Next Phase:** → Phase E (Lead Detail & Forms)
