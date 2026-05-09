# Phase 03: Checklist Summary for List
Status: Done

## Objective
Giam payload va render cost cua `/contracts` list. Table khong nen can full `contract_checklists` array chi de hien `Day du` hay `Thieu tin`.

## Design
Them summary field vao list result:
```ts
type ChecklistSummary = {
  total: number;
  done: number;
  missing: number;
};
```

Moi contract list item co:
```ts
checklist_summary?: ChecklistSummary;
contract_checklists?: ContractChecklist[]; // fallback/tooltip compatibility
```

Server action:
- Trong `getContractList`, khi query checklist cho contracts hien tai, tinh total/done/missing theo `contract_id`.
- Co the van return `contract_checklists` trong phase dau de fallback tooltip.
- Sau khi `MissingInfoBadge` ho tro lazy detail, co the bo full array khoi list payload.

Client cache:
- `updateContractListChecklistCache` cap nhat ca array neu co va summary neu co.
- Khi item doi false -> true: `done + 1`, `missing - 1`.
- Khi true -> false: `done - 1`, `missing + 1`.
- Clamp trong `[0,total]`.

## Tasks
1. [ ] Them type summary trong `lib/hooks/use-contracts.ts` hoac type gan contract list item.
2. [ ] Sua `app/actions/contract-queries.ts` de tinh summary khi load list.
3. [ ] Sua `updateContractListChecklistCache` de patch summary.
4. [ ] Sua `MissingInfoBadge` props de nhan `summary` + optional `items`.
5. [ ] Sua `contracts-table.tsx` truyen summary neu co.
6. [ ] Giu fallback: neu khong co summary thi tinh tu `items` nhu hien tai.

## Acceptance Criteria
- Table badge dung khi co summary.
- Tooltip van co thong tin neu full items con duoc truyen.
- Khi tick checklist, summary table update ngay khong refetch.
- Khong break contract drawer/detail.

## Risk
- Neu query summary sai khi filter/pagination, badge se sai. Can smoke data co ca contract du/thieu/khong co checklist.
