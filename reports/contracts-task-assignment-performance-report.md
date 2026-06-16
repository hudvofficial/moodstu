# Contracts Task Assignment Performance Report

## Context

Module bi cham: giao task / giao nhan vien trong `/contracts/[id]`, cu the modal `EventTaskModal` mo tu event card trong `EventTimeline`.

Code lien quan chinh:

- `components/contracts/detail/event-task-modal.tsx`
- `components/contracts/detail/event-timeline.tsx`
- `components/contracts/detail/contract-detail-client.tsx`
- `components/contracts/detail/task-list-panel.tsx`
- `app/actions/work-task-actions.ts`
- `app/actions/task-overlap-actions.ts`
- `app/actions/employee-queries.ts`
- `app/actions/vendor-actions.ts`
- `lib/hooks/use-contract-queries.ts`

## Ket Luan Nguyen Nhan Cham

Chậm không chủ yếu do UI render, mà do flow fetch/mutation đang gọi nhiều server action + invalidate/refetch quá rộng.

### 1. Mo modal van fetch them vendor

Khi mo modal giao task:

- Neu co `prefetchedTasks` + `prefetchedEmployees`, modal van goi them `getActiveVendors()` tai `event-task-modal.tsx:117`.
- Neu thieu prefetch, modal goi song song 3 server action tai `event-task-modal.tsx:129`:
  - `getTasksByEvent(event.id)`
  - `getActiveEmployees()`
  - `getActiveVendors()`

Moi server action deu di qua auth/RLS/Supabase, nen latency phu thuoc network + Supabase + server action overhead.

### 2. Overlap check co the spam request

Khi chon nhan vien/doi gio:

- `checkEmployeeTimeOverlap()` duoc goi tai `event-task-modal.tsx:181`.
- Server query `work_tasks` join `contract_events` tai `task-overlap-actions.ts:15`.
- Chua thay debounce/cache, nen thao tac doi nhan vien/gio nhieu lan co the tao nhieu request lien tiep.

### 3. Luu task xong refetch qua rong

Khi bam luu task:

- `addTask()` tai `work-task-actions.ts:192` lam nhieu buoc:
  - auth/write access
  - verify event thuoc contract
  - check unassigned task
  - insert/update task
  - update status event
  - audit log
  - invalidate cache
- Sau luu, client goi `onSaved()` tai `event-task-modal.tsx:294`.
- `EventTimeline` chuyen thanh `onRefresh?.()` tai `event-timeline.tsx:441`.
- Detail page invalidate qua `revalidateContractDetailCaches()` tai `use-contract-queries.ts:401`, gom ca:
  - `contractKeys.detail(id)`
  - `contractKeys.drawerExtra(id)`

Tuc la luu 1 task xong lai keo lai full contract detail/drawer extra kha nang.

### 4. Co ca server-side va client-side invalidation

Server action con goi:

```ts
invalidateContractPaths(input.contractId, { detail: true, productivity: true })
```

Tai `work-task-actions.ts:262`, nen co ca server-side invalidation va client-side invalidation trong cung flow.

## Diem Da Toi Uu Mot Phan

- UI da co optimistic add task:
  - `setTasks((prev) => [...prev, optimisticTask])` truoc khi `addTask()` tra ve trong `event-task-modal.tsx`.
- Detail page da prefetch task theo event:
  - `prefetchedTasks={tasks.filter(t => t.event_id === modalEvent.id)}` o `event-timeline.tsx:438`.
- Employee list da co React Query hook cache:
  - `useActiveEmployees()` o `use-contract-queries.ts:328`.
- Vendor list chua co hook/cache tuong tu trong modal.

Vi vay cam giac cham con lai nhieu kha nang den tu:

- Modal loading ban dau.
- Vendor fetch moi lan mo modal.
- Overlap check khong debounce.
- Full refetch sau khi luu task.

## Plan Toi Uu De Xuat

### 1. Cache vendor list

Tao `useActiveVendors()` trong `lib/hooks/use-contract-queries.ts` hoac hook rieng, cache 10-30 phut tuong tu `useActiveEmployees()`.

Muc tieu:

- Tranh goi `getActiveVendors()` moi lan mo `EventTaskModal`.
- Modal mo nhanh hon vi vendor list lay tu React Query cache.

### 2. Truyen cached vendors vao EventTaskModal

Cap vendor cache tu parent/detail page vao `EventTaskModal`.

Neu vendor cache da co data:

- Set vendors ngay khi modal open.
- Khong block modal loading vi vendor fetch.

### 3. Khong fetch lai tasks khi da co prefetchedTasks

Khi co `prefetchedTasks`, khong goi lai `getTasksByEvent(event.id)` luc mo modal.

Hien tai detail page da truyen tasks theo event, nen nhieu truong hop query nay la thua.

### 4. Patch React Query cache sau addTask

Sau `addTask()` thanh cong, patch cache local thay vi invalidate full detail ngay.

Can patch:

- `contractKeys.detail(contractId)`:
  - them/cap nhat task trong `contract.work_tasks`
  - update status event tuong ung trong `contract.contract_events` neu can
- `contractKeys.drawerExtra(contractId)` neu drawer can dong bo

### 5. Han che onSaved invalidate full detail

Sau add task thanh cong:

- Khong nen mac dinh goi `onSaved()` de invalidate full detail.
- Chi fallback refetch khi:
  - server tra thieu data
  - mutation fail/rollback
  - cache patch khong ap dung duoc

### 6. Debounce overlap check

Debounce `checkEmployeeTimeOverlap()` khoang 250-400ms.

Chi chay khi du:

- `employeeId`
- ngay lam/event date
- `start_time`
- `end_time`

Muc tieu:

- Doi dropdown/time khong spam server action.
- Giam do tre cam nhan khi user thao tac nhanh.

### 7. Can nhac RPC/transaction neu van cham

Neu sau cac buoc tren van cham, can nhac gom mutation thanh RPC hoac server action nhe hon:

- insert/update task
- update event status
- return saved task + event status moi

Lam trong 1 transaction se giam round-trip va tranh trang thai lech.

### 8. Kiem tra DB index

Can verify cac index sau neu chua co:

- `work_tasks(event_id)`
- `work_tasks(contract_id)`
- `work_tasks(assigned_to, status)`
- `contract_events(contract_id, deleted_at, sort_order)`

Overlap query co the can index ho tro `assigned_to + start_date/event_date` tuy schema thuc te.

## Ky Vong Sau Toi Uu

- Mo modal gan nhu instant vi dung `prefetchedTasks`, `prefetchedEmployees`, cached vendors.
- Chon nhan vien/doi gio khong spam request.
- Bam "them nhan su" thay ket qua ngay va khong keo lai full contract detail.
- Supabase/server action calls giam dang ke trong flow giao task.

## Ghi Chu Cho Claude Plan

Uu tien plan theo thu tu it rui ro:

1. Them cache vendor list.
2. Bo fetch task thua khi da co `prefetchedTasks`.
3. Debounce overlap check.
4. Patch React Query cache sau add task.
5. Giam/refactor invalidation rong.
6. Sau cung moi tinh RPC/DB transaction neu can.
