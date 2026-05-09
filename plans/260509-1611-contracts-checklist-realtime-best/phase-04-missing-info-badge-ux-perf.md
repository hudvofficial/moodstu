# Phase 04: MissingInfoBadge UX/Perf
Status: Done

## Objective
Lam badge thong tin tren table nhe va ro hon. Khong render/group tooltip nang cho tat ca rows neu user khong hover.

## Design
- Badge render primary state tu summary:
  - total = 0: neutral `Chua co`
  - missing = 0: success `Day du`
  - missing > 0: error/warning `Thieu {missing}`
- Tooltip chi build grouped missing items khi co hover/focus va co `items`.
- Neu khong co `items`, tooltip hien summary ngan hoac trigger lazy fetch sau nay.
- Component `MissingInfoBadge` nen `memo` neu props on dinh.

## Tasks
1. [ ] Sua `components/contracts/missing-info-badge.tsx` de support `summary`.
2. [ ] Lazy compute grouped missing bang `useMemo` chi khi tooltip active.
3. [ ] Them keyboard/focus behavior de tooltip khong chi dung hover.
4. [ ] Giam string/type inline trong `contracts-table.tsx` bang type helper rieng.
5. [ ] Kiem tra mobile card neu cung dung badge.

## Acceptance Criteria
- Table 20 rows render khong group checklist cua tat ca rows ngay lap tuc.
- Badge text ro, khong bi raw/encoding moi.
- Hover/focus van xem duoc missing items neu co data.
- Visual consistent voi earth-tone UI hien co.

## Risk
- Lazy tooltip state co the gay layout shift. Can giu fixed width/position nhu hien tai.
