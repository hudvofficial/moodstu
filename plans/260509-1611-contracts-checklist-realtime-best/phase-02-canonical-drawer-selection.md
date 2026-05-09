# Phase 02: Canonical Drawer Selection
Status: Done

## Objective
Drawer khong giu object contract snapshot cu. Khi list SWR cache duoc patch, drawer dang mo phai nhan contract moi ngay.

## Current Problem
`contracts-list-client.tsx` dang luu:
```ts
const [selectedContract, setSelectedContract] = useState<ContractListItem | null>(null);
```
Object nay duoc tao tai thoi diem click row. Sau do list cache co doi thi drawer van co the giu object cu, tuy extra drawer co the da update.

## Design
Doi sang canonical id:
```ts
const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
const selectedContract = useMemo(
  () => contracts.find((contract) => contract.id === selectedContractId) ?? lastSelectedFallback,
  [contracts, selectedContractId, lastSelectedFallback],
);
```

Fallback:
- Giu `lastSelectedFallback` de drawer khong bien mat neu filter/pagination lam row khong con trong current list.
- Khi contract ton tai trong SWR list, uu tien version moi tu cache.

## Tasks
1. [ ] Sua state drawer trong `components/contracts/contracts-list-client.tsx`.
2. [ ] Tao helper build `ContractListItem` tu record de dung lai cho current row/fallback.
3. [ ] Dam bao `handleView`, `handleEdit`, `handleHover` khong doi behavior.
4. [ ] Kiem tra close drawer reset id va fallback dung luc.
5. [ ] Kiem tra drawer tab checklist an data moi sau cache patch.

## Acceptance Criteria
- Drawer dang mo va tick checklist: header/content khong stale.
- Table update va drawer update cung nguon cache.
- Filter/sort/pagination khong lam crash drawer.
- Khong tang fetch moi khi chi mo drawer.

## Risk
- Neu selected row bi loc ra khoi list, drawer co the mat data. Fallback phai giu data cu cho UX on dinh.
