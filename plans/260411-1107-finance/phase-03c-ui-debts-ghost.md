# Phase 03c: UI Slice 3 — Debts + Ghost + Fixed Costs + Investments
Status: ⬜ Pending
Dependencies: Phase 03b

## Objective
UI cho công nợ khách hàng, công nợ lab, chi phí cố định, tài sản đầu tư, Ghost scan tích hợp.

---

## Files to Create

### Customer Debts
| File | Mục đích |
|---|---|
| `app/(protected)/finance/debts/page.tsx` | Server component → `fallbackData` |
| `components/finance/debts/debts-client.tsx` | SWR list + aging filter (tab-pill) + pagination |
| `components/finance/debts/debt-form-modal.tsx` | `<UnifiedModal>` CRUD |

### Lab Debts
| File | Mục đích |
|---|---|
| `app/(protected)/finance/lab-debts/page.tsx` | Server component |
| `components/finance/lab-debts/lab-debts-client.tsx` | SWR list grouped by lab |

### Fixed Costs & Investments
| File | Mục đích |
|---|---|
| `app/(protected)/finance/fixed-costs/page.tsx` | Server component |
| `components/finance/fixed-costs/fixed-costs-client.tsx` | CRUD + "Generate tháng" |
| `app/(protected)/finance/investments/page.tsx` | Server component |
| `components/finance/investments/investments-client.tsx` | CRUD + maintenance log |

### Ghost Scan
| File | Mục đích |
|---|---|
| `components/finance/integrity/ghost-scan-widget.tsx` | Widget nhỏ: "X ghost payments". Click → navigate integrity. |

---

## SSOT Acceptance Criteria (Phase 03c)

> **Checklist kiểm được — PHẢI pass 100% trước Phase 03d**

- [ ] Page wrapper dùng `main-container`
- [ ] Debt cards / clickable items dùng `card-interactive`
- [ ] Aging filter tab dùng `tab-pill` + `tab-pill-active/inactive`
- [ ] Aging badge 0-30 ngày: `badge badge-success`
- [ ] Aging badge 31-60 ngày: `badge badge-warning`
- [ ] Aging badge 61-90 ngày: `badge badge-accent`
- [ ] Aging badge 90+ ngày: `badge badge-error`
- [ ] Overdue row indicator: `overdue-indicator` class
- [ ] Warning row: `inset-warning` class
- [ ] Debt CRUD modal dùng `<UnifiedModal>` size `"lg"`
- [ ] Amount input dùng `<CurrencyInput>` — KHÔNG `<input type="number">`
- [ ] Form inputs: `input-base`, `label-base`, `form-grid-2col`
- [ ] "Generate tháng" CTA: `btn-interactive`
- [ ] Ghost scan result: `badge badge-error` (issues) / `badge badge-success` (clean)
- [ ] Fixed cost / Investment cards: `accent-card accent-card-gold` hoặc `card-base`
- [ ] Desktop tables dùng `<TableWrapper>` + `<THead/TBody/TH/TD/TR>`
- [ ] Pagination dùng `<Pagination>`
- [ ] Loading: `<SkeletonTable>` hoặc `<SkeletonCard>`
- [ ] Section headings: `section-title`
- [ ] Table header text: via `<TH>` (auto `table-header` styling)
- [ ] Entrance animation: `stagger-item`
- [ ] Mọi cột tiền: `tabular-nums`
- [ ] Không hardcoded colors
- [ ] Không custom modal
- [ ] Không tạo CSS mới
- [ ] Mọi file < 250 lines
- [ ] Icons chỉ từ `lucide-react`

---

## SWR Cache Strategy (Phase 03c)

| Data | Cache Key | Revalidation |
|------|-----------|--------------|
| Debts list | `cacheKeys.debts()` | Sau create/update/delete debt |
| Lab debts | `cacheKeys.labDebts()` | Sau lab payment recorded |
| Fixed costs | `cacheKeys.financeFixedCosts()` | Sau create/update/generate |
| Investments | `cacheKeys.financeInvestments()` | Sau create/update/delete |

**Rules**:
- Debts: server-side pagination + aging filter → params trong SWR key
- Lab debts: grouped query (NO N+1) — xem Performance Contract 4.5
- Server component fetch initial → `fallbackData`
- Submit button: `disabled` + spinner
- Cache keys trong `lib/swr.ts` — KHÔNG hardcode

---

## Business Logic

### Aging Analysis
- Aging tính server-side: `CURRENT_DATE - contracts.due_date` (hoặc `debts.due_date`)
- API trả `aging_bucket: "0-30" | "31-60" | "61-90" | "90+"` — client chỉ hiển thị

### Ghost Payment Scan
- Check `payment_plans` có `status = 'paid'` mà `receipt_id IS NULL` → FK `payments`
- **Canonical status**: `payment_plans.status = "paid"` (KHÔNG phải `"da_thu"`)
- Gọi `runManualIntegrityScan()` → hiển thị results từ `integrity_reports`

### Pagination
- Debts: default pageSize = 20, max 100
- Lab debts: grouped, không phân trang (số lab thường < 50)

---

## Implementation Steps
1. [ ] Tạo debts pages + components (verify B1 fix trước)
2. [ ] Tạo lab-debts pages + components
3. [ ] Tạo fixed-costs pages + components
4. [ ] Tạo investments pages + components
5. [ ] Tạo ghost-scan-widget → wire vào Dashboard
6. [ ] SSOT Acceptance Criteria checklist
7. [ ] `npm run build` pass

## Test/Verification Criteria
- [ ] `/finance/debts` hiển thị danh sách với aging badges
- [ ] Aging filter works (click "61-90" → filtered)
- [ ] `/finance/lab-debts` hiển thị grouped list
- [ ] Ghost scan button → results display
- [ ] `/finance/fixed-costs` → "Generate tháng" → auto expenses
- [ ] SSOT checklist 100% pass
- [ ] `npm run build` pass

---
Next Phase: `phase-03d-ui-payroll.md`
