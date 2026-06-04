# Kế hoạch v2: Làm mood-studio "mượt như native" (mô hình mcoffe)

> **Trạng thái:** Phân tích — chưa code. Bản v2 đã hợp nhất sau 4 vòng kiểm chứng codebase (đã verify tận mắt).
> **Ngày:** 2026-06-03
> **Bối cảnh:** Mọi thao tác (chuyển menu, thêm/sửa/xóa) đều "xoay vòng" rồi đợi. `mcoffe` (`C:\Users\Admin\Desktop\Ai\mcoffe`) cùng stack nhưng mượt như native.

## TIẾN ĐỘ (cập nhật 2026-06-04)
- ✅ **Phase 0 (Task 0.1)** + **Phase 1 (1.1 blurhash, 1.2 update/delete, 1.3 create)** — code xong, tsc 0 lỗi, **verify runtime chrome-devtools PASS** (create/update/delete mượt, 0 console error, server action 200).
- ⚙️ **Điều chỉnh khi thực thi:** (a) blurhash backfill dùng **`after()`** (đảm bảo chạy trên serverless) thay vì `.catch()` trần như plan; (b) **DELETE = "đóng + revalidate"** (KHÔNG optimistic-remove) vì `delete_dress_atomic` có thể RETIRE → xem LESSONS A5; (c) **Task 1.4 BỎ** (push back) — sau optimistic, `revalidatePath` chạy nền vô hại + force-dynamic vô hiệu hóa lợi ích nav; bỏ `/dresses/rentals` revalidate sẽ vi phạm nguyên tắc realtime.
- ✅ **Phase 2 — Task 2.1 (CRM-customers)** — verify runtime PASS (create + update optimistic). Thêm primitive generic **`mutateListCache(namespace, updater)`** vì shape list mỗi module khác nhau (dress `{data,count}` vs customer `{customers,total}`) — mỗi module tự viết updater. **ĐÃ THÊM delete UI cho customer** (wire `onDelete`→drawer + ConfirmDialog + optimistic-remove qua `mutateListCache`; customer soft-delete nên remove an toàn) — verify runtime PASS (create/update/delete đều mượt).
- ⏭️ **Tiếp theo:** 2.2 Inventory (⚠️ tồn kho server-computed → create/stock dùng đóng+revalidate) · 2.3 Services+Printing+Productivity · 2.4 Contracts (React Query — `setQueryData`) · 2.5 Leads+Calendar (dnd-kit) · 2.6 Finance (GIỮ revalidate).

## TỔNG QUAN: 5 phase · 16 task

| Phase | Mục tiêu | Task | Bắt buộc? | Risk |
|---|---|---|---|---|
| **0 — Nền chung** | Helper patch SWR list-cache (additive) | 1 | ✅ | 🟢 ~0 |
| **1 — Pilot Dresses** | Làm mẫu end-to-end 1 module | 4 | ✅ | 🟢 thấp |
| **2 — Nhân rộng Cấp 1** | Áp pattern đã kiểm chứng cho các module khác | 6 | ✅ | 🟡 theo module |
| **3 — Navigation/shared** | Bỏ spinner xoay, dùng toploader | 2 | ⬜ nên | 🟢 thấp |
| **4 — Cấp 2 client-direct** | Navigation instant như mcoffe | 3 | ⬜ tùy chọn | 🔴 cần audit RLS |

- **Cấp 1** (Phase 0–3) trị **"đợi khi thêm/sửa/xóa"** — không đổi kiến trúc, không đụng bảo mật. ~70-80% độ mượt.
- **Cấp 2** (Phase 4) trị **"chuyển menu chậm"** — hiệu quả cao nhất nhưng cần audit RLS trước (quyết định bảo mật).

---

## 1. Chẩn đoán cốt lõi

Cùng stack (Next 15/16 + React 19 + SWR + Supabase + PWA). Khác nhau ở **3 quyết định kiến trúc**:

| Khía cạnh | mcoffe (mượt) | mood-studio (xoay vòng) |
|---|---|---|
| **Đường lấy data** | Supabase **thẳng từ browser** (`createBrowserClient`) — 1 chặng, song song | Mọi thứ qua **Server Action** (`"use server"`) — 2 chặng, Next **chạy tuần tự** |
| **Khi thêm/sửa/xóa** | **Optimistic** — sửa UI ngay, gọi server ngầm, lỗi thì hoàn lại | **Đợi server xong mới đóng modal**; nút kẹt "Đang xử lý..." |
| **Sau mutate** | `mutate(key)` — làm mới ngầm, giữ data cũ | `revalidatePath()` nuke cache |

---

## 2. Nguyên nhân gốc (xếp theo tác động)

1. **Mọi data qua Server Action → Next chạy tuần tự** *(nặng nhất)*. [dress-queries.ts:1](../../app/actions/dress-queries.ts), [dress-mutations.ts:1](../../app/actions/dress-mutations.ts) đều `"use server"`. SWR fetch list + stats bị **xếp hàng** thay vì song song.
2. **Form CRUD không optimistic** — [dress-form-modal.tsx:131-153](../../components/dresses/dress-form-modal.tsx): `setLoading(true)` → `await updateDress()` → đợi server → mới đóng.
3. **Blurhash nằm trong critical path** — [dress-mutations.ts:148-156](../../app/actions/dress-mutations.ts): server `fetch(ảnh)` + `sharp` ×2 *trước khi* insert. Chậm khủng khi có ảnh.
4. **`revalidatePath` nuke cache** sau mỗi mutation — [server-cache-invalidation.ts:37-41](../../lib/server-cache-invalidation.ts).
5. **Navigation:** spinner xoay [bottom-nav.tsx:204-205](../../components/layout/bottom-nav.tsx) + ~24 `loading.tsx`; prefetch data đã bị tắt (`prewarmRouteData` return luôn).

> **Navigation chậm gốc rễ là `force-dynamic`** (mọi list page) → server render lại mỗi lần vào. Cấp 1 chỉ bớt *cảm giác*; instant thật cần Cấp 2.

---

## 3. Độ phủ thật của hệ thống (đã khảo sát 12 module)

**Phát hiện then chốt:** app **đã có** helper optimistic chuẩn `runOptimisticMutation({apply, rollback, action, onSuccess, onError})` ([lib/optimistic-mutation.ts:19](../../lib/optimistic-mutation.ts)) và **đã dùng** ở dress-drawer ([dress-drawer-content.tsx:242](../../components/dresses/dress-drawer-content.tsx)), leads, printing, contracts. ⇒ Việc cần làm là **phủ nốt các form CRUD chính còn thiếu** (đầu tiên là `dress-form-modal`), KHÔNG phải giới thiệu pattern mới.

**4 nhóm module — không có "một recipe cho tất cả":**

| Nhóm | Module | Recipe optimistic |
|---|---|---|
| **A. SWR + form-modal** | Dresses, CRM-customers, Inventory, Services, Printing, Productivity | `runOptimisticMutation` + patch SWR list-cache. **Áp trực tiếp** |
| **B. React Query** | **Contracts** | `runOptimisticMutation` + `queryClient.setQueryData`/rollback (KHÔNG dùng SWR `mutate`) |
| **C. Drag-drop (dnd-kit)** | CRM-leads (kanban), Calendar | Optimistic local-state-override khi kéo, rollback khi drop fail |
| **D. RSC / read-only** | Employees, Dashboard | Employees: `router.refresh()`. Dashboard: read-only → **bỏ qua** |

---

## 4. Cạm bẫy: KHÔNG "đoán giá trị" khi server tính lại

Nhiều mutation có **side-effect server-computed** client không đoán đúng → patch optimistic sẽ hiện **số sai rồi nhảy về đúng**: mã tự sinh (`item_code`...), tổng tính lại (`recalc_contract_totals`), tồn kho bình quân (`inventory_stock_in/out_atomic`), trạng thái suy ra (`refresh_dress_status_atomic`).

**Quy tắc vàng:**
| Loại thao tác | Recipe |
|---|---|
| **Sửa field đơn** (tên/màu/giá/ảnh) | ✅ Optimistic **patch giá trị** |
| **Xóa** | ✅ Optimistic **remove** |
| **Tạo mới / mã tự sinh / recalc / tồn kho / tiền** | ⚠️ **"đóng modal + revalidate"** — không patch giá trị, đợi server trả thật |
| **Finance (mọi nơi)** | 🔴 **GIỮ `revalidatePath`** — finance **0 realtime** (đã verify), bỏ là số tiền stale |

---

## 5. Kế hoạch chi tiết theo phase/task

### PHASE 0 — Nền chung *(additive, an toàn tuyệt đối)*
**Task 0.1 — Thêm helper patch SWR list-cache** vào [lib/swr.ts](../../lib/swr.ts).
Bổ trợ cho `runOptimisticMutation` (dùng trong `apply`/`rollback`), không thay thế nó. Code: §6.
`Impact: nền cho nhóm A · Effort: ~30' · Risk: ~0 (hàm mới, chưa ai gọi)`

### PHASE 1 — Pilot Dresses *(làm mẫu end-to-end)*
**Task 1.1 — Blurhash ra khỏi critical path.** [dress-mutations.ts](../../app/actions/dress-mutations.ts): insert/update trước (blur=null), backfill nền theo pattern [gallery-drive-actions.ts:70-72](../../app/actions/gallery-drive-actions.ts). An toàn — [dress-card.tsx:43](../../components/dresses/dress-card.tsx) xử lý null (`placeholder="empty"`). `Impact: rất cao khi có ảnh · Effort: 1-2h · Risk: 🟢`
**Task 1.2 — Optimistic UPDATE & DELETE** ở [dress-form-modal.tsx](../../components/dresses/dress-form-modal.tsx) bằng `runOptimisticMutation` + patch/remove list-cache. Code: §6. `Impact: rất cao · Effort: 1h · Risk: 🟢`
**Task 1.3 — CREATE: đóng modal ngay + revalidate ngầm** (không patch — `item_code` server sinh). `Impact: cao · Effort: 1h · Risk: 🟢`
**Task 1.4 — Giảm `revalidatePath` của dress catalog.** Chỉ sửa `invalidateDressPaths` ([server-cache-invalidation.ts:37](../../lib/server-cache-invalidation.ts)) — đích (`/dresses`, `/dresses/rentals`) đều có realtime. **KHÔNG đụng** `invalidateContractPaths` cascade. `Impact: TB-cao · Effort: 1h · Risk: 🟡`
→ **Verify:** `verify:dresses` + chrome-devtools + đo Network trước/sau.

### PHASE 2 — Nhân rộng Cấp 1 *(mỗi task = 1 module, verify riêng)*
**Task 2.1 — CRM-customers** (nhóm A, giống Dresses).
**Task 2.2 — Inventory** (nhóm A; ⚠️ tồn kho server tính → create/stock dùng "đóng+revalidate", không patch số).
**Task 2.3 — Services + Printing + Productivity** (nhóm A).
**Task 2.4 — Contracts** (nhóm B — recipe React Query `setQueryData`; đã có optimistic vài chỗ, bổ sung form chính).
**Task 2.5 — CRM-leads kanban + Calendar** (nhóm C — drag-drop; đã có một phần).
**Task 2.6 — Finance** (🔴 **GIỮ revalidatePath**, chỉ thêm optimistic ở form — KHÔNG bỏ revalidate).
`Risk: 🟡 theo module · Employees/Dashboard: bỏ qua`

### PHASE 3 — Navigation/shared *(shared behavioral → để sau, verify đa route)*
**Task 3.1 — Bỏ spinner xoay ở bottom-nav** → dùng `nextjs-toploader`. [bottom-nav.tsx:204-205](../../components/layout/bottom-nav.tsx).
**Task 3.2 — Giảm flash của vài `loading.tsx`** (skeleton gọn hơn).
`Impact: TB (cảm giác) · Risk: 🟢 · Lưu ý: không làm nav nhanh hơn, chỉ bớt khó chịu`

### PHASE 4 — Cấp 2: client-direct *(TÙY CHỌN — cần audit RLS)*
**Task 4.1 — Audit RLS** các bảng định mở (dresses, dress_reservations...): SELECT policy khớp `ROLE_PERMISSIONS`? Có rò dữ liệu role thấp?
**Task 4.2 — Chuyển read queries Dresses sang client-direct** ([lib/supabase/client.ts](../../lib/supabase/client.ts) đã có), giữ mutation ở server action. Bật lại prewarm-on-hover.
**Task 4.3 — Nhân rộng** nếu RLS đủ chặt.
`Impact: rất cao (nav instant) · Effort: cao · Risk: 🔴 nếu RLS chưa chuẩn`

---

## 6. Code mẫu chuẩn (dùng `runOptimisticMutation` có sẵn)

```ts
// PHASE 0 — lib/swr.ts: helper bổ trợ (dùng trong apply/rollback)
type ListShape<T> = { data: T[]; count: number };
export function patchListCache<T extends { id: string }>(ns: string, id: string, patch: Partial<T>) {
  return mutate((key) => cacheKeyMatchesPrefix(key, ns),
    (cur: ListShape<T> | undefined) =>
      cur ? { ...cur, data: cur.data.map((it) => (it.id === id ? { ...it, ...patch } : it)) } : cur,
    { revalidate: false });
}
export function removeFromListCache<T extends { id: string }>(ns: string, id: string) {
  return mutate((key) => cacheKeyMatchesPrefix(key, ns),
    (cur: ListShape<T> | undefined) =>
      cur ? { ...cur, data: cur.data.filter((it) => it.id !== id), count: Math.max(0, cur.count - 1) } : cur,
    { revalidate: false });
}
```

```tsx
// PHASE 1 — dress-form-modal.tsx — UPDATE (optimistic patch)
if (editItem) {
  onClose();                                         // đóng modal NGAY
  await runOptimisticMutation({
    apply: () => patchListCache("dresses", editItem.id, form),
    rollback: () => void revalidateByPrefixes(cacheKeys.dresses()),   // kéo bản thật về
    action: () => updateDress({ id: editItem.id, updated_at: editItem.updated_at, data: { ...form } }),
    onSuccess: () => { toast("Cập nhật thành công", "success");
      void revalidateByPrefixes(cacheKeys.dresses()); void revalidate(cacheKeys.dressStats()); },
    onError: (e) => toast(e instanceof Error ? e.message : "Có lỗi", "error"),
  });
}
// DELETE: apply = removeFromListCache("dresses", id); phần còn lại tương tự.
// CREATE: KHÔNG optimistic apply (item_code server sinh) → onClose() + await createDress() + onSuccess revalidate.
```

```ts
// PHASE 1 — dress-mutations.ts — blurhash backfill nền (pattern gallery-drive-actions.ts)
const { data: result } = await supabase.from("dresses")
  .insert({ ...insertPayload, blur_hash: null, blur_data_url: null }).select("id").single();
if (data.image_url) {
  void backfillDressBlurHash(result.id, data.image_url).catch((e) => console.error("blurhash backfill", e));
}
return { id: result.id };
// backfillDressBlurHash = server action mới: generateBlurHashFromUrl → update dresses set blur_* where id.
```

---

## 7. Chiến lược: TÁCH theo module (không "liên đới")

Gần như **bắt buộc** vì nguyên tắc revalidate khác nhau giữa module: có realtime → bỏ revalidate an toàn; **finance không realtime** → sửa chung file shared sẽ vô tình làm số tiền stale. Củng cố: kiến trúc đã module hóa · có `verify:<module>` riêng · rollback khoanh vùng.

| Thay đổi | File | Phạm vi | Cách làm |
|---|---|---|---|
| Helper patch cache | `lib/swr.ts` | Shared **additive** | Làm 1 lần (Phase 0) — 0 rủi ro |
| Optimistic form, blurhash, giảm revalidate | theo module | Module-local | Phase 1-2, từng module |
| Nav spinner | `bottom-nav.tsx` | Shared **behavioral** | Phase 3, verify đa route |

---

## 8. Playbook chẩn đoán bug — "suy logic, không mò"

**Nguyên tắc nền:** mọi `runOptimisticMutation` đều `onSuccess → revalidate`, `onError → rollback`. Optimistic chỉ là **lớp hiển thị tạm; server là chân lý**. ⇒ Bug tệ nhất chỉ "hiện sai/nháy <1s rồi tự đúng" — **không bao giờ ghi sai DB**. Rủi ro bị nhốt ở tầng thị giác.

| Triệu chứng | Nguyên nhân gốc | Cách xác định | Fix đúng |
|---|---|---|---|
| Số đúng rồi **nhảy số khác** | Patch giá trị server tính lại (§4) | So `apply` vs sau `onSuccess` | Đổi sang "đóng + revalidate" |
| Item mới **nháy** | Create patch + revalidate | Có id giả không | Create dùng "đóng+revalidate" |
| **Finance** hiện số cũ | Bỏ revalidate trang không realtime | Tra: trang đó có realtime? | Khôi phục revalidate (finance luôn giữ) |
| Tab/người khác **không thấy** | `onSuccess` thiếu revalidate | Kiểm onSuccess | Luôn revalidate |
| **"Đã bị người khác cập nhật"** | `updated_at` mismatch ([dress-mutations.ts:231](../../app/actions/dress-mutations.ts)) | Lỗi server | rollback + revalidate + báo tải lại |
| Modal đóng, **list không đổi** | SWR array-key `[ns, filters]` không match | Kiểm cache key | Dùng matcher `cacheKeyMatchesPrefix` |
| **Flash skeleton** khi realtime | revalidate truyền `data=undefined` ([swr.ts:160](../../lib/swr.ts)) | Xem call revalidate | Dùng `revalidateByPrefixes` |

---

## 9. Verify & deploy
- DevTools Network: đếm request + thời gian "sửa trang phục có ảnh" (trước/sau Task 1.1).
- Quay video thêm/sửa/xóa (trước: "Đang xử lý" → sau: đóng tức thì).
- `verify:<module>` + `scripts/perf-*.mjs` đối chiếu.
- **Bắt buộc:** thay đổi CSS/layout → render + screenshot chrome-devtools **trước deploy** ([[verify-before-deploy]]); deploy `npx vercel --prod`.

## 10. Lưu ý rủi ro
- **Optimistic + realtime:** dresses có 3 realtime ([dresses-list-client.tsx:95-97](../../components/dresses/dresses-list-client.tsx), debounce ~900ms) → optimistic + realtime cùng hội tụ về server, chỉ thừa 1 fetch; `keepPreviousData` chống flash.
- **Cấp 2 là quyết định bảo mật**, không chỉ hiệu năng — không làm khi RLS chưa audit.
