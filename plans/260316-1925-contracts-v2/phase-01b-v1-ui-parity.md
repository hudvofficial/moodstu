# Phase 01b: V1 UI Parity — Contracts List Page
Status: ⬜ Pending
Dependencies: Phase 01 (basic table — ✅ done)

## Objective
Port 100% V1 contracts list features vào V2, giữ V2 architecture (Lucide, strict types, URL hooks, CSS SSOT).

## V1 vs V2 Gap Analysis

### V1 có 43 files, V2 có 3 files. Phase này chỉ focus LIST PAGE (không phải Create/Detail).

### V1 List Page Components:
| V1 Component | Lines | V2 Status | Phase này? |
|---|---|---|---|
| `ContractsTable.tsx` | 426 | ✅ Ported (avatar, badge, chevron) | Bổ sung |
| `ContractsStats.tsx` | ~80 | ✅ KPICard (giữ V2) | — |
| `ContractsHeader.tsx` | ~60 | ✅ Page header (giữ V2) | — |
| `ContractsPagination.tsx` | ~50 | ✅ Shared Pagination | — |
| `ContractsFilters.tsx` | ~150 | ❌ CHỈ CÓ tabs + search | ✅ Port |
| `MissingInfoBadge.tsx` | 125 | ❌ THIẾU | ✅ Port |
| `NextActionBadge.tsx` | 253 | ❌ THIẾU | ✅ Port |
| `ContractDrawer.tsx` | ~200 | ❌ Navigate thay drawer | Phase sau |

---

## Implementation Steps

### Task 1: Enrich Mock Data (contract_checklists + work_progress)
- [ ] Thêm `ChecklistItem[]` mock cho 5 contracts (mix complete/incomplete)
- [ ] Thêm `WorkTask[]` mock cho 5 contracts (mix done/pending/overdue)
- [ ] Export `MOCK_CHECKLISTS`, `MOCK_WORK_TASKS` từ `lib/mock/contracts.ts`
- [ ] Update `Contract` type để support `contract_checklists?` và `work_progress?`

### Task 2: Port MissingInfoBadge (V1 → V2)
- [ ] Tạo `components/contracts/missing-info-badge.tsx`
- [ ] Port logic: empty → "—", complete → "Đầy đủ", missing → "Thiếu tin" + count
- [ ] Hover tooltip: grouped by stage → category
- [ ] Swap Material Symbols → Lucide (Clock, CheckCircle, ChevronDown)
- [ ] V2 earth-tone colors thay V1 rainbow
- [ ] Max ~120 lines

### Task 3: Port NextActionBadge (V1 → V2)
- [ ] Tạo `components/contracts/progress-badge.tsx` (renamed cho rõ ràng)
- [ ] Port logic: progress bar + "3/8" fraction + color by status
- [ ] Row 2: "Hoàn tất" / "→ Retouch" / "Chờ phân công"
- [ ] Overdue warning icon (AlertTriangle from Lucide)
- [ ] Hover tooltip: grouped by Tiền kỳ / Sản xuất / Hậu kỳ
- [ ] V2 earth-tone colors
- [ ] Max ~200 lines (complex tooltip)
- [ ] `getProgressInfo()` helper exported for mobile cards

### Task 4: Add 2 Columns to Desktop Table
- [ ] Thêm cột "Thông tin" (MissingInfoBadge) sau "Còn nợ"
- [ ] Thêm cột "Tiến độ" (ProgressBadge) sau "Thông tin"
- [ ] Wire mock data: `MOCK_CHECKLISTS[contractId]`, `MOCK_WORK_TASKS[contractId]`
- [ ] Table giữ ≤ 250 lines (split nếu cần)

### Task 5: Enrich Mobile Cards
- [ ] Thêm progress fraction "2/4 ⏳" trong mobile footer
- [ ] Thêm overdue indicator (border-left red khi có task trễ)
- [ ] Stagger animation delay `idx * 40ms` (V1 pattern)

### Task 6: Port ContractsFilters (Advanced)
- [ ] Thêm dropdown "Dịch vụ" (Ngày Cưới / Studio / Combo / Baby / ...)
- [ ] Thêm dropdown "Tháng này" (time filter)
- [ ] Thêm nút "Lọc nâng cao" (toggle expanded filter panel)
- [ ] Update `useContractFilters` hook: `serviceType`, `timeRange` params
- [ ] Wire filters vào URL search params

---

## Files to Create/Modify

### Tạo mới:
- `components/contracts/missing-info-badge.tsx` — Port V1 MissingInfoBadge
- `components/contracts/progress-badge.tsx` — Port V1 NextActionBadge

### Sửa:
- `lib/mock/contracts.ts` — Thêm mock checklists + work_progress
- `types/contract.ts` — Thêm ChecklistItem, WorkTask interfaces
- `components/contracts/contracts-table.tsx` — Thêm 2 cột + mobile progress
- `components/contracts/contracts-list-client.tsx` — Wire filters + pass data
- `hooks/useContractFilters.ts` — Thêm serviceType, timeRange

---

## V1 Source Files (Reference Only — LOGIC, NOT COLORS):
- `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\components\contracts\MissingInfoBadge.tsx`
- `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\components\contracts\NextActionBadge.tsx`
- `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\components\contracts\ContractsFilters.tsx`
- `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\components\contracts\ContractsTable.tsx`

## Test Criteria
- [ ] Desktop table hiển thị 9 cột (Mã HĐ, Khách, Ngày ký, Tổng cộng, Còn nợ, Thông tin, Tiến độ, Trạng thái, Thao tác)
- [ ] Progress bar hiện đúng color (green 100%, red overdue, blue >50%, orange <50%)
- [ ] MissingInfoBadge hover tooltip hiện grouped items
- [ ] Dropdown filters lọc đúng theo service type + time range
- [ ] Mobile cards có progress fraction + overdue border
- [ ] Build pass, 0 TypeScript errors
- [ ] Screenshot match V1 layout (9 columns visible)

---
Next Phase: phase-02 (Contract Detail page)
