# T-20260715-drawer-events-ui — Drawer "Sự kiện": hiển thị đủ + tick trạng thái

**Owner:** Codex · **Spec:** Claude · **Status:** approved (user chọn scope 1–5)
**Locks:** `components/contracts/drawer-event-timeline.tsx`, `components/contracts/drawer-tab-content.tsx` (chỉ chỗ gọi DrawerEventTimeline), `lib/client-direct/contract-drawer.ts`, `app/actions/contract-queries.ts` (chỉ select events), `app/actions/contract-event-actions.ts` (chỉ THÊM action mới), `lib/hooks/use-contract-queries.ts` (chỉ 2 helper self-mutation), `components/contracts/drawer-checklist.tsx` + `components/contracts/contract-drawer.tsx` + `components/contracts/contracts-list-client.tsx` (chỉ đổi tên helper + thêm bảng vào điều kiện chặn echo).

## Bối cảnh
Tab "Sự kiện" trong contract drawer (component `DrawerEventTimeline`) hiện thiếu: event đã Xong bị ẩn ngày; event chưa có ngày thì trống trơn; không hiển thị giờ (`start_time`/`end_time`) và hạn (`deadline`) dù DB có; không đổi được trạng thái tại drawer.

Nền tảng BẮT BUỘC đọc trước khi code:
- `components/contracts/drawer-checklist.tsx` — mẫu chuẩn optimistic + chặn echo (công thức native-feel, commit 31aaaff).
- `lib/hooks/use-contract-queries.ts` — helper `markChecklistSelfMutation`/`isRecentChecklistSelfMutation` (module-scope timestamp) + `contractKeys.drawerExtra`.
- Realtime là **Signal ≠ Data**: payload KHÔNG có row data, không patch từ payload được.

## Task A — Query: select thêm field (additive)
1. `lib/client-direct/contract-drawer.ts` (~dòng 40): thêm `start_time, end_time, deadline, sort_order` vào select của `contract_events`.
2. `app/actions/contract-queries.ts` (~dòng 586, query events trong getContractById): thêm y hệt `start_time, end_time, deadline, sort_order`.
3. Interface `ContractEvent` local trong `drawer-event-timeline.tsx`: thêm `start_time?: string | null; end_time?: string | null; deadline?: string | null;` (sort_order đã có).

## Task B — Hiển thị (`drawer-event-timeline.tsx`)
1. **Event đã Xong (nhánh compact 1 dòng):** thêm ngày trước location: `{event.event_date && <span className="text-tiny text-text-muted shrink-0">· {formatDate(event.event_date)}</span>}`.
2. **Event chưa có ngày (nhánh full):** khi `!event.event_date` render thay chỗ ngày: Calendar icon + `<span className="text-tiny text-text-muted italic">Chưa xếp lịch</span>`.
3. **Giờ:** khi có `start_time`, nối sau ngày: `08:00` hoặc `08:00–17:00` khi có cả `end_time`. Format: `t.slice(0, 5)` (Postgres time "HH:MM:SS").
4. **Deadline:** với event chưa `hoan_thanh`/`da_huy` và có `deadline`: dòng/chip riêng Clock icon (lucide, w-3 h-3) + `Hạn: {formatDate(event.deadline)}`.
5. **Cảnh báo trễ:** 
   ```ts
   const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD giờ local
   const isOverdue =
     event.status !== "hoan_thanh" && event.status !== "da_huy" &&
     ((event.deadline ?? event.event_date ?? "").slice(0, 10) !== "" &&
      (event.deadline ?? event.event_date ?? "").slice(0, 10) < todayStr);
   ```
   `isOverdue` → text ngày/deadline dùng `text-error` thay `text-text-secondary`. Không thêm badge mới.

## Task C — Tick trạng thái tại drawer
1. **Server action mới** trong `app/actions/contract-event-actions.ts`:
   ```ts
   export async function updateEventStatus(
     eventId: string,
     status: "chua_lam" | "dang_lam" | "hoan_thanh",
   ) {
     return withAuth(async (supabase, userId) => {
       await requireContractWriteAccess(supabase, userId);
       // Hot path (tick từ drawer): CHỈ update status. KHÔNG revalidatePath /
       // invalidateContractPaths / google sync / recalc — client optimistic patch
       // + trailing reconcile lo đồng bộ (xem drawer-checklist.tsx).
       const { error } = await supabase
         .from("contract_events")
         .update({ status, updated_at: new Date().toISOString() })
         .eq("id", eventId)
         .neq("status", "da_huy");
       if (error) throw new Error(`Lỗi cập nhật trạng thái sự kiện: ${error.message}`);
       return { id: eventId, status };
     });
   }
   ```
   Match style action hiện có trong file (withAuth import sẵn).
2. **UI cycle:** trong `DrawerEventTimeline`, vùng status (icon + label) thành `<Button unstyled>` bấm được, cycle `chua_lam → dang_lam → hoan_thanh → chua_lam` (map `NEXT_STATUS`). Event `da_huy` giữ render tĩnh. Thêm `cursor-pointer active:scale-95 transition-transform` cho feedback. Component nhận thêm prop `contractId?: string` — truyền từ chỗ gọi trong `drawer-tab-content.tsx` (giống DrawerChecklist đang nhận contractId).
3. **Optimistic — theo ĐÚNG mẫu `drawer-checklist.tsx`:**
   - `runOptimisticMutation` (lib/optimistic-mutation).
   - `apply`: gọi helper self-mutation (xem Task D) rồi patch cache drawerExtra:
     ```ts
     queryClient.setQueryData(contractKeys.drawerExtra(contractId), (old: DrawerExtraShape | undefined) =>
       old ? { ...old, events: old.events.map((e) => e.id === event.id ? { ...e, status: next } : e) } : old,
     );
     ```
     ⚠️ Đọc queryFn của drawerExtra trong `use-contract-queries.ts` để xác nhận shape cache thật (`{ events, checklists, workTasks, paymentPlans }`) và type — chỉnh generic cho khớp, KHÔNG dùng `any`.
   - `rollback`: patch ngược về status cũ.
   - `action`: `updateEventStatus(event.id, next)`.
   - KHÔNG `onSuccess` invalidate. `onError`: `toast.error(...)` (sonner).
4. KHÔNG patch list cache (list không embed contract_events — đã xác minh).

## Task D — Mở rộng chặn echo cho contract_events
1. `lib/hooks/use-contract-queries.ts`: đổi tên `markChecklistSelfMutation` → `markContractSelfMutation`, `isRecentChecklistSelfMutation` → `isRecentContractSelfMutation` (giữ nguyên thân hàm + comment, chỉ generalize tên vì giờ dùng chung checklist + events).
2. Cập nhật 3 call site:
   - `drawer-checklist.tsx`: import + gọi tên mới.
   - `contract-drawer.tsx` (`handleDrawerRealtime`): điều kiện thành `(payload.table === "contract_checklists" || payload.table === "contract_events") && isRecentContractSelfMutation()` — giữ nguyên trailing reconcile 3500ms.
   - `contracts-list-client.tsx` (`handleContractRealtime`): điều kiện tương tự với 2 bảng, giữ trailing reconcile.
3. `drawer-event-timeline.tsx` `apply` gọi `markContractSelfMutation()` TRƯỚC khi patch cache (giống checklist).

## Ràng buộc cứng
- KHÔNG đổi kiến trúc, KHÔNG thêm dependency, KHÔNG sửa file ngoài danh sách locks.
- Match style hiện có (comment tiếng Việt, semantic token `text-error`/`text-success`/`text-text-muted` — CẤM màu arbitrary `text-[#...]`).
- KHÔNG dùng `<button>` native — dùng `<Button unstyled>` (`@/components/ui/button`), rule `react/forbid-elements`.
- KHÔNG thêm `revalidatePath` vào bất kỳ hot path nào.
- Labels status lấy từ `TASK_STATUS_MAP` (SSOT `types/contract-constants.ts`), không hardcode.

## Verify (bắt buộc trước khi báo xong)
1. `npx eslint components/contracts/drawer-event-timeline.tsx app/actions/contract-event-actions.ts lib/client-direct/contract-drawer.ts lib/hooks/use-contract-queries.ts components/contracts/drawer-checklist.tsx components/contracts/contract-drawer.tsx components/contracts/contracts-list-client.tsx` → 0 error.
2. `npm run build` → pass.
3. Báo cáo: liệt kê thay đổi theo từng Task A–D + kết quả lint/build.
