# Phase 03: Frontend (SSR + Hydration)
Status: ✅ Done
Dependencies: Phase 02

## Objective
Thay đổi file `[id]/page.tsx` từ "Thin Server Shell" sang "Server Component có fetch data", truyền `initialData` vào Client Component. Điều này giúp loại bỏ Skeleton Load khi user copy link truy cập trực tiếp.

## Requirements
### Functional
- [ ] Mở `app/(protected)/contracts/[id]/page.tsx`
- [ ] Gọi hàm `getContractDetail(id)` trực tiếp trên Server.
- [ ] Bắt lỗi (nếu ID không tồn tại thì `notFound()`).
- [ ] Sửa `ContractDetailClient` nhận prop `initialData`.
- [ ] Pass `initialData` vào SWR trong `useContractDetail`.

### Non-Functional
- [ ] Time to Interactive (TTI) và LCP cải thiện đáng kể cho load trang lần đầu.

## Implementation Steps
1. [ ] Cập nhật `app/(protected)/contracts/[id]/page.tsx`.
2. [ ] Sửa `ContractDetailClient` và custom hook `useContractDetail` để nhận `fallbackData`.

## Files to Modify
- `app/(protected)/contracts/[id]/page.tsx`
- `components/contracts/detail/contract-detail-client.tsx`
- `lib/hooks/use-contracts.ts` - [Sửa useContractDetail]

---
Next Phase: Phase 04
