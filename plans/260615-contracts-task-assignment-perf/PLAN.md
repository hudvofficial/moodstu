# PLAN — Tối ưu perf "giao task / giao nhân viên" (`/contracts/[id]` → EventTaskModal)

> Nguồn: `reports/contracts-task-assignment-performance-report.md`
> **Bản v2** (sau review lần 2): bổ sung Phase 1 `withAuthRead` (nguồn chậm #1 trên mobile mà report + plan v1 bỏ sót), tách điều kiện prefetch cold-open, reframe RPC theo "form đơ khi Lưu".
> Người soạn plan chỉ lên kế hoạch + review. Người thực thi: Claude Code (claw).
> Trạng thái report gốc: **một phần lỗi thời/sai** — đọc mục **REVIEW REPORT** TRƯỚC. Bám plan này, KHÔNG làm theo report nguyên văn.

---

## 0. REVIEW REPORT (đối chiếu code thật)

| Claim report | Thực tế code | Kết luận |
|---|---|---|
| (report **không nhắc**) auth overhead | `checkEmployeeTimeOverlap`, `getActiveVendors`, `getTasksByEvent` đều dùng `withAuth` = `getVerifiedUser()` → **network getUser() ~200-800ms/lần trên mobile** ([auth_utils.ts:424-432](../../lib/auth_utils.ts)). `withAuthRead` (local JWT, đã dùng cho `getContractDetail`) bỏ được round-trip này. | **NGUỒN CHẬM #1, report bỏ sót.** ROI cao nhất, rủi ro thấp nhất → **Phase 1**. |
| #1 Mở modal chậm vì fetch vendor | Nhánh prefetch ([event-task-modal.tsx:110](../../components/contracts/detail/event-task-modal.tsx)) set `loading=false` **trước** `await getActiveVendors()` → vendor fetch chạy nền, không block paint, ở tab ẩn. | **Phóng đại.** Cache vendor vẫn nên làm (bỏ 1 server-action/lần mở) nhưng không phải lý do "mở chậm". Phase 2. |
| #3 Bỏ fetch task thừa khi có `prefetchedTasks` | **ĐÃ LÀM** — nhánh prefetch không gọi `getTasksByEvent`. **NHƯNG** điều kiện đòi luôn `prefetchedEmployees?.length`; nếu employees chưa cache → rớt xuống nhánh refetch cả 3 + spinner. | Phần chính đã xong; chỉ cần **tách điều kiện** (Phase 2.5). |
| #4/#5 Lưu xong invalidate full detail (client) | ĐÚNG. `onSaved`→`onRefresh`→`refreshContractCaches(_,true)`→`revalidateContractDetailCaches` → refetch **RPC nặng `get_contract_detail_v2`** ([contract-queries.ts:487](../../app/actions/contract-queries.ts)) + drawerExtra. | **ĐÚNG — bottleneck lớn nhất.** Phase 4. |
| #4 "Server + client invalidation đều thừa" | Server `revalidatePath('/contracts/[id]')` chỉ làm mới SSR cho lần sau, KHÔNG trigger refetch client. Hai lớp khác nhau. | **KHÔNG bỏ `revalidatePath` server** (ràng buộc CLAUDE.md). Chỉ tối ưu lớp client. |
| #6 Overlap check không debounce | ĐÚNG, có cả race kết quả cũ. | **ĐÚNG.** Phase 3. |
| #8 Cần 4 index | Đã có: `work_tasks(contract_id)`, `(assigned_to,status,deadline)`, `(contract_id,status,deadline)`, `contract_events(contract_id,sort_order)`, `(contract_id,event_date) WHERE deleted_at IS NULL`. **THIẾU duy nhất `work_tasks(event_id)`.** | **Chỉ thêm 1 index.** ĐỪNG tạo lại cái đã có. Phase 5. |
| #7 Gộp RPC mutation | `addTask` ~3-4 query tuần tự. Latency này **làm đơ form/nút Lưu** tới khi xong (form reset sau `await`). | Defer/optional, nhưng reframe: đây là lý do "bấm Lưu thấy chờ". Phase 6. |

### Hạ tầng SẴN CÓ phải tái dùng (report bỏ sót)
- `contract-detail-client.tsx`: đã có `updateContractDetailOptimistic` + `applyTaskStatusOptimistic` (patch work_tasks + recompute event status) + `muteRealtimeEcho`. Status task ĐÃ optimistic. **Add/Delete thì chưa** → Phase 4 chỉ thêm callback theo đúng khuôn đó.
- Realtime: `patchTaskRealtimePayload` **return false cho INSERT** ([contract-detail-client.tsx:199](../../components/contracts/detail/contract-detail-client.tsx)) → INSERT work_tasks qua realtime kích full refetch. Callback add MỚI **bắt buộc `muteRealtimeEcho()`** để chặn echo.

### Nguyên nhân chậm thật (xếp mức độ)
1. **Auth round-trip** trên mỗi read server-action (mobile ~200-800ms/lần) → Phase 1.
2. **Full refetch RPC** sau mỗi add/delete → Phase 4.
3. **Overlap không debounce** spam server-action → Phase 3.
4. **Form đơ** trong lúc `addTask` chạy → Phase 6 (optional).
5. **1 getActiveVendors/lần mở** (không block paint) → Phase 2.

> **Khuyến nghị thứ tự thực thi:** Phase 1 → 4 trước (ROI cao nhất), rồi 2/3/5. Phase 1 độc lập, có thể làm + deploy ngay để đo cải thiện mobile.

---

## QUY TẮC THỰC THI (bắt buộc)
- **Đọc `plans/260603-native-feel-performance/LESSONS.md` trước.**
- 1 task / 1 module. File shared (`use-contract-queries.ts`, `server-cache-invalidation.ts`, `auth_utils.ts`) **chỉ additive / đổi tại call-site**, không sửa logic wrapper.
- **GIỮ `revalidatePath` server-side** trong `work-task-actions.ts`. KHÔNG đụng.
- Prop mới = optional + additive, có fallback `onSaved`.
- Match style hiện có. Deploy = `git push origin main` (KHÔNG `vercel --prod`).
- Success criteria mỗi phase: build pass + render OK (chrome-devtools) + **đo Network** thấy cải thiện.

---

## PHASE 0 — Baseline đo trước (5')
- [ ] `/contracts/[id]` (hợp đồng nhiều event/task), chrome-devtools Network (Fetch/XHR), **bật Slow 4G throttling** để thấy rõ auth round-trip.
- [ ] Thao tác: mở modal → chọn NV on-set → đổi giờ 2-3 lần → Lưu → xóa 1 task.
- [ ] Ghi: thời gian từng server-action (`checkEmployeeTimeOverlap`, `getActiveVendors`, `getTasksByEvent`, `addTask`), có request RPC detail + drawerExtra sau Lưu không, tổng time click-Lưu → ổn định, thời gian nút Lưu bị disabled.
- **Verify:** có số liệu so sánh sau mỗi phase.

---

## PHASE 1 — Chuyển hot read actions sang `withAuthRead` (ƯU TIÊN #1, rủi ro thấp)
Mục tiêu: bỏ network `getUser()` (~200-800ms/lần mobile) khỏi các READ trong flow. Authz vẫn enforce bằng `requireContractAccess` sẵn có.

> An toàn: `withAuthRead` dùng `getClaimsUser()` (JWT local, middleware đã gate) + `createAdminClient()` + chạy action y hệt. Pattern đã chạy prod ở `getContractDetail`.
> **Trước khi sửa:** grep usage 3 hàm này xác nhận đều là read path (không có nhánh ghi nào dựa vào `withAuth` của chúng).

### Task 1.1 — `checkEmployeeTimeOverlap` (gọi lặp nhiều nhất)
File: `app/actions/task-overlap-actions.ts`
- [ ] Import: đổi `import { requireContractAccess, withAuth } from "@/lib/auth_utils";` → thêm `withAuthRead`:
```ts
import { requireContractAccess, withAuthRead } from "@/lib/auth_utils";
```
- [ ] Dòng 18: `return withAuth(async (supabase, userId) => {` → `return withAuthRead(async (supabase, userId) => {`
- [ ] (Cùng file) `checkEmployeeDeadlineOverlap` (dòng 51) cũng là read + `requireContractAccess` → đổi `withAuth`→`withAuthRead` luôn cho nhất quán. Sửa import còn lại nếu `withAuth` không còn dùng trong file.
- **Verify:** build pass; chọn NV → Network thấy `checkEmployeeTimeOverlap` nhanh hơn baseline rõ rệt (mất phần ~200-800ms auth).

### Task 1.2 — `getActiveVendors`
File: `app/actions/vendor-actions.ts`
- [ ] Import `withAuthRead` từ `@/lib/auth_utils` (đang import `withAuth, withAdmin`).
- [ ] Dòng 40 `getActiveVendors`: `return withAuth(...)` → `return withAuthRead(...)`. (Hàm này không có `requireXAccess` — chỉ cần authenticated; withAuthRead giữ nguyên hành vi đó.) **CHỈ đổi `getActiveVendors`**; `quickAddVendor`/admin actions giữ `withAuth`/`withAdmin` (write/privileged).
- **Verify:** build pass; vendor list vẫn đúng.

### Task 1.3 — `getTasksByEvent`
File: `app/actions/work-task-actions.ts`
- [ ] Import thêm `withAuthRead` (đang import `requireContractAccess, requireContractWriteAccess, withAuth`).
- [ ] Dòng 89 `getTasksByEvent`: `return withAuth(...)` → `return withAuthRead(...)`. (Vẫn gọi `requireContractAccess`.) **TUYỆT ĐỐI KHÔNG** đổi `addTask`/`deleteTask`/`toggleTaskStatus`/`generateWorkTasksForContract`/`copyTasksFromPreviousEvent` — đó là WRITE, giữ `withAuth`.
- **Verify:** build pass; mở modal cold (employees chưa cache) → `getTasksByEvent` nhanh hơn.

> (Optional, lower priority) `getActiveEmployees` dùng `withEmployeeDirectoryAccess`→`withAuth`. Có thể thêm biến thể read, nhưng employees đã cache 10' nên tần suất thấp → **mention thôi, để Phase sau nếu cần.**

---

## PHASE 2 — Cache vendor list (rủi ro thấp)
### Task 2.1 — Hook `useActiveVendors` (additive)
File: `lib/hooks/use-contract-queries.ts`
- [ ] Import:
```ts
import { getActiveVendors } from "@/app/actions/vendor-actions";
import type { Vendor } from "@/types/vendor";
```
- [ ] Thêm key (sau `employees: () => ["active-employees"] as const,`):
```ts
  vendors: () => ["active-vendors"] as const,
```
- [ ] Thêm hook (sau `useActiveEmployees`):
```ts
/** Fetch active vendors (for "Thợ ngoài" assignment dropdown) */
export function useActiveVendors() {
  const { data } = useQuery({
    queryKey: contractKeys.vendors(),
    queryFn: async () => {
      const result = await getActiveVendors();
      if (!result.success) return [];
      return result.data as Vendor[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  return (data || []) as Vendor[];
}
```
- **Verify:** build pass.

### Task 2.2 — Đẩy cached vendors xuống modal
File: `components/contracts/detail/contract-detail-client.tsx`
- [ ] Import thêm `useActiveVendors` từ `@/lib/hooks/use-contract-queries`.
- [ ] Sau `const activeEmployees = useActiveEmployees();`: `const activeVendors = useActiveVendors();`
- [ ] `layoutProps`: thêm `activeVendors,`

File: `components/contracts/detail/detail-layout-sections.tsx`
- [ ] `LayoutProps`: thêm `activeVendors?: Vendor[];` + `import type { Vendor } from "@/types/vendor";`
- [ ] `DesktopLayout` + `MobileLayout`: destructure `activeVendors,`; cả 2 `<EventTimeline>` thêm `activeVendors={activeVendors}`.

File: `components/contracts/detail/event-timeline.tsx`
- [ ] `import type { Vendor } from "@/types/vendor";`; `Props` thêm `activeVendors?: Vendor[];`; destructure `activeVendors,`; `<EventTaskModal>` thêm `prefetchedVendors={activeVendors}`.

File: `components/contracts/detail/event-task-modal.tsx`
- [ ] `Props` thêm `prefetchedVendors?: Vendor[];`; destructure `prefetchedVendors,`.
- [ ] Nhánh prefetch ([:116-124]) thay khối vendor:
```ts
      if (prefetchedVendors?.length) {
        setVendors(prefetchedVendors as Vendor[]);
        return;
      }
      try {
        const vendorResult = await getActiveVendors();
        if (vendorResult?.success && vendorResult.data) {
          setVendors(vendorResult.data as Vendor[]);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Loi tai danh sach tho ngoai");
      }
      return;
```
- [ ] Nhánh fallback `Promise.all` ([:129]) thay `getActiveVendors(),`:
```ts
        prefetchedVendors?.length
          ? Promise.resolve({ success: true as const, data: prefetchedVendors })
          : getActiveVendors(),
```
- [ ] Thêm `prefetchedVendors` vào deps `loadData`.
- **Verify (chrome-devtools):** mở modal từ lần 2 → KHÔNG còn `getActiveVendors`; dropdown "Thợ ngoài" vẫn đủ.

### Task 2.3 — Tách điều kiện prefetch cold-open (sửa claim #3 còn sót)
File: `components/contracts/detail/event-task-modal.tsx`
- [ ] Hiện tại nhánh prefetch đòi `prefetchedTasks && prefetchedEmployees?.length`. Tách để **dùng prefetchedTasks kể cả khi employees chưa có**, chỉ fetch phần thiếu. Sửa đầu `loadData`:
```ts
    // Có prefetchedTasks → hiện task ngay, không refetch task; chỉ fetch phần còn thiếu (employees/vendors).
    if (!forceRefresh && !usedPrefetchRef.current && prefetchedTasks) {
      setTasks(prefetchedTasks as unknown as TaskRow[]);
      if (prefetchedEmployees?.length) setEmployees(prefetchedEmployees as unknown as Employee[]);
      setLoading(false);
      usedPrefetchRef.current = true;

      const needEmployees = !prefetchedEmployees?.length;
      const needVendors = !prefetchedVendors?.length;
      if (needEmployees || needVendors) {
        try {
          const [empResult, vendorResult] = await Promise.all([
            needEmployees ? getActiveEmployees() : Promise.resolve({ success: true as const, data: prefetchedEmployees }),
            needVendors ? getActiveVendors() : Promise.resolve({ success: true as const, data: prefetchedVendors }),
          ]);
          if (empResult?.success && empResult.data) setEmployees(empResult.data as unknown as Employee[]);
          if (vendorResult?.success && vendorResult.data) setVendors(vendorResult.data as Vendor[]);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Loi tai du lieu");
        }
      } else if (prefetchedVendors?.length) {
        setVendors(prefetchedVendors as Vendor[]);
      }
      return;
    }
```
  (Thay cho khối prefetch + khối vendor ở Task 2.2 — gộp lại; Task 2.2 vendor giữ cho nhánh fallback `Promise.all`.)
- **Verify:** mở modal khi vừa vào trang (employees chưa cache) → task list hiện **ngay**, không spinner; dropdown NV/vendor điền sau ở nền.

---

## PHASE 3 — Debounce overlap check (rủi ro thấp)
File: `components/contracts/detail/event-task-modal.tsx`
- [ ] Thêm ref (cạnh `formRef`):
```ts
  const conflictTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conflictReqIdRef = useRef(0);
```
- [ ] Thay `doConflictCheck` ([:174-197]):
```ts
  // Overlap check (debounce 300ms + race-guard).
  const doConflictCheck = useCallback(
    (empId: string, startT: string, endT: string) => {
      if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);
      if (!isOnSet || !empId || !startT || !endT || !event.event_date) {
        setConflicts([]);
        return;
      }
      const reqId = ++conflictReqIdRef.current;
      conflictTimerRef.current = setTimeout(async () => {
        try {
          const result = await checkEmployeeTimeOverlap(empId, event.event_date!, startT, endT);
          if (reqId !== conflictReqIdRef.current) return; // bỏ kết quả cũ
          if (result.success && result.data?.hasConflict) setConflicts(result.data.conflicts as ConflictItem[]);
          else setConflicts([]);
        } catch {
          if (reqId === conflictReqIdRef.current) setConflicts([]);
        }
      }, 300);
    },
    [isOnSet, event.event_date]
  );
```
- [ ] Cleanup khi unmount:
```ts
  useEffect(() => () => { if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current); }, []);
```
- [ ] Đầu `handleAdd` (sau `if (submitting) return;`): `if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);`
- **Verify:** đổi NV + gõ giờ liên tục → chỉ 1 `checkEmployeeTimeOverlap` sau khi ngừng ~300ms; cảnh báo trùng vẫn đúng.

---

## PHASE 4 — Patch React Query cache khi add/delete (rủi ro vừa, IMPACT CAO)
Mục tiêu: add/delete KHÔNG full refetch RPC. Patch `contractKeys.detail(id)` theo khuôn `applyTaskStatusOptimistic`. GIỮ `revalidatePath` server.

### Task 4.1 — Callback patch ở parent
File: `components/contracts/detail/contract-detail-client.tsx` (sau `applyTaskStatusOptimistic`)
- [ ] Add:
```ts
  const applyTaskAddedOptimistic = useCallback((task: WorkTask) => {
    if (!task?.id || !task.event_id) { void revalidateContractDetailCaches(queryClient, id); return; }
    muteRealtimeEcho();
    updateContractDetailOptimistic((current: any) => {
      const base = current ?? renderedDetailRef.current;
      if (!base.contract) return current;
      const tasks = base.contract.work_tasks || [];
      const nextTasks = tasks.some((t: WorkTask) => t.id === task.id)
        ? tasks.map((t: WorkTask) => (t.id === task.id ? { ...t, ...task } : t))
        : [...tasks, task];
      const nextEvents = (base.contract.contract_events || []).map((event: ContractEvent) =>
        event.id === task.event_id && event.status !== "da_huy" && event.status !== "dang_lam"
          ? { ...event, status: "dang_lam" } : event);
      return { ...base, contract: { ...base.contract, work_tasks: nextTasks, contract_events: nextEvents } };
    });
  }, [id, muteRealtimeEcho, queryClient, updateContractDetailOptimistic]);
```
- [ ] Delete (recompute event status như server `checkAndCompleteEvent`):
```ts
  const applyTaskDeletedOptimistic = useCallback((taskId: string, eventId: string) => {
    muteRealtimeEcho();
    updateContractDetailOptimistic((current: any) => {
      const base = current ?? renderedDetailRef.current;
      if (!base.contract) return current;
      const nextTasks = (base.contract.work_tasks || []).filter((t: WorkTask) => t.id !== taskId);
      const eventTasks = nextTasks.filter((t: WorkTask) => t.event_id === eventId);
      const allDone = eventTasks.length > 0 && eventTasks.every((t: WorkTask) => t.status === "hoan_thanh");
      const anyInProgress = eventTasks.some((t: WorkTask) => t.status === "dang_lam");
      const nextEventStatus: TaskStatus = allDone ? "hoan_thanh" : anyInProgress ? "dang_lam" : "chua_lam";
      const nextEvents = (base.contract.contract_events || []).map((event: ContractEvent) =>
        event.id === eventId && event.status !== "da_huy" ? { ...event, status: nextEventStatus } : event);
      return { ...base, contract: { ...base.contract, work_tasks: nextTasks, contract_events: nextEvents } };
    });
  }, [muteRealtimeEcho, updateContractDetailOptimistic]);
```
- [ ] `layoutProps`: thêm `onTaskAdded: applyTaskAddedOptimistic,` `onTaskDeleted: applyTaskDeletedOptimistic,`

### Task 4.2 — Thread callback
File: `detail-layout-sections.tsx` → `LayoutProps` thêm `onTaskAdded?: (task: WorkTask) => void;` `onTaskDeleted?: (taskId: string, eventId: string) => void;` (import `WorkTask`); destructure + truyền cho cả 2 `<EventTimeline>`.
File: `event-timeline.tsx` → `Props` thêm 2 prop trên; destructure; truyền `<EventTaskModal>`.

### Task 4.3 — Modal dùng patch thay full refetch
File: `event-task-modal.tsx`
- [ ] `Props` + destructure thêm `onTaskAdded`, `onTaskDeleted`.
- [ ] `handleAdd` đoạn success, thay `onSaved();`:
```ts
      toast.success("Đã thêm nhân sự!");
      setForm((prev) => ({ ...prev, assigned_to: "", vendor_id: "", cost: 0 }));
      setConflicts([]);
      if (onTaskAdded && result.data) onTaskAdded(result.data as unknown as WorkTask);
      else onSaved();
```
- [ ] `handleDelete` thay `onSaved();`:
```ts
      if (onTaskDeleted) onTaskDeleted(taskId, event.id);
      else onSaved();
```
- [ ] **GIỮ `onSaved()` ở DatePicker change** ([:406]) — đổi ngày hiếm + ảnh hưởng sort, để full refresh.
- **Verify (quan trọng nhất, chrome-devtools):**
  - Bấm Lưu → Network **KHÔNG** còn RPC `get_contract_detail_v2` + drawerExtra ngay sau; chỉ còn `addTask`. Task hiện ngay trong modal; đóng modal → progress bar/đếm timeline + hrCost FinancialDashboard cập nhật đúng.
  - Xóa task: không full refetch; card + tổng tiền cập nhật ngay.
  - Đợi >2s (hết mute) → realtime echo KHÔNG kích full refetch.
  - **Hard reload (F5)** sau add/delete → task + event status đúng (chứng minh server insert + revalidatePath OK, không chỉ cache).
  - Regression: đổi status task vẫn chạy; đổi ngày trong modal vẫn refresh.

---

## PHASE 5 — Thêm index `work_tasks(event_id)` (additive)
- [ ] Migration mới `supabase/migrations/20260615120000_work_tasks_event_id_index.sql`:
```sql
-- work_tasks query theo event_id ở getTasksByEvent / addTask(check unassigned) /
-- deleteTask / checkAndCompleteEvent. Chưa có index event_id (chỉ contract_id, assigned_to+status,
-- calendar deadline/start_date). Thêm để bỏ seq scan theo event.
CREATE INDEX IF NOT EXISTS idx_work_tasks_event ON public.work_tasks (event_id);
```
- [ ] Áp migration theo quy trình repo (plain `CREATE INDEX IF NOT EXISTS`, KHÔNG `CONCURRENTLY` trong migration).
- **Verify:** migration chạy ok; (optional) `EXPLAIN ANALYZE ... WHERE event_id = '...'` dùng index.
- **ĐỪNG** tạo lại các index đã có (xem bảng review #8).

---

## PHASE 6 — (OPTIONAL) Giảm "form đơ khi Lưu" — chỉ làm nếu vẫn khó chịu sau Phase 1+4
Vấn đề: form reset + nút Lưu disabled cho tới khi `addTask` (~3-4 query tuần tự) xong. Phase 4 bỏ full refetch nhưng KHÔNG bỏ latency này.
- [ ] **Đo lại** thời gian `addTask` sau Phase 1 (đã bớt auth). Nếu < ~300ms prod (sin1) → **dừng, không làm.**
- [ ] Nếu còn chậm, chọn 1 trong 2 (ưu tiên A, rủi ro thấp hơn):
  - **A. Reset form optimistic:** clear `assigned_to/vendor_id/cost` + đóng `submitting` NGAY khi đẩy optimistic task (trước `await`), khôi phục form nếu `addTask` fail (cạnh `setTasks(previousTasks)` ở catch). Cảm giác Lưu instant, không cần đổi server.
  - **B. Gộp RPC `add_work_task`:** 1 round-trip atomic (assert + check unassigned + insert/update + update event status + return row). Client vẫn patch bằng row trả về (Phase 4 đã sẵn nhận `result.data`). Rủi ro cao hơn — ràng buộc CLAUDE.md: optimistic KHÔNG patch giá trị server recalc atomic; phải verify status/audit đúng.
- **Verify:** Lưu không còn đơ form; (B) row trả về đủ join employees/vendors, event status + audit đúng.

---

## SELF-REVIEW PLAN
- **Spec coverage:** mọi đề xuất report map vào Phase + đính chính (#1 phóng đại, #3 đã làm/tách điều kiện, #4 giữ revalidatePath, #7→Phase6, #8 chỉ 1 index) + bổ sung auth (Phase 1) report bỏ sót. ✅
- **Placeholder scan:** không "TBD/TODO/implement later"; mọi step có path + code thật. ✅
- **Type consistency:** `onTaskAdded(task: WorkTask)` / `onTaskDeleted(taskId, eventId)` nhất quán xuyên 4 file; `useActiveVendors(): Vendor[]`; `withAuthRead` cùng chữ ký `withAuth`. ✅
- **Ràng buộc:** giữ revalidatePath server; shared file chỉ đổi call-site/additive; muteRealtimeEcho chặn echo INSERT; withAuthRead chỉ cho READ (write giữ withAuth). ✅
- **Rủi ro/thứ tự:** 1 (thấp,ROI cao) → 4 (vừa,impact cao) → 2/3 (thấp) → 5 (additive) → 6 (optional). ✅
- **Điểm cần claw chú ý:** trước Phase 1 grep usage 3 hàm read xác nhận không có nhánh ghi; shape `result.data` từ `addTask` chỉ cần `event_id/status/cost` cho parent cache (timeline/finance không đọc `employees`) → mismatch join không ảnh hưởng.

## THỨ TỰ COMMIT (mỗi phase 1 commit, verify trước khi sang phase sau)
1. `perf(contracts): use withAuthRead for task-assign read actions (cut GoTrue round-trip)`
2. `perf(contracts): patch detail cache on task add/delete (no full refetch)`
3. `perf(contracts): cache active vendors + use prefetchedTasks on cold open`
4. `perf(contracts): debounce employee time-overlap check`
5. `perf(db): add work_tasks(event_id) index`
6. (optional) `perf(contracts): optimistic form reset on task add` / hoặc RPC
