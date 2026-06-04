# LESSONS — Nhật ký lỗi & quy tắc tránh tái phạm

> **Đọc TRƯỚC mỗi task. Gặp lỗi mới → ghi NGAY vào mục A. Bài học lâu dài → nâng lên `~/.claude/.../memory/` + link ở đây.**
> File này sống cùng `PLAN.md`. Mục đích: không lặp lại sai lầm cũ khi triển khai Cấp 1/2.

---

## A. Lỗi ĐÃ gặp (cập nhật liên tục)

### A1. 4 lần deploy hỏng vì không verify *(lịch sử — nav fix)*
- **Lỗi:** deploy thẳng thay đổi layout/nav mà chưa render kiểm tra → hỏng 4 lần liên tiếp.
- **Quy tắc:** CSS/layout/nav phải **render + screenshot bằng chrome-devtools** TRƯỚC deploy. Deploy bằng `npx vercel --prod`.
- **Đã ghi memory:** `verify-before-deploy.md`.

### A2. Plan v1 "bịa" helper optimistic *(phiên phân tích 2026-06-03)*
- **Lỗi:** plan v1 đề xuất viết helper `optimisticPatch/Remove` mới, trong khi codebase **đã có** `runOptimisticMutation` ([lib/optimistic-mutation.ts:19](../../lib/optimistic-mutation.ts)) dùng rộng rãi.
- **Quy tắc:** trước khi viết util/helper mới → **grep xem đã có chưa**. Tái dùng > tạo mới.

### A3. Plan v1 giả định "1 recipe cho mọi module" *(phiên phân tích 2026-06-03)*
- **Lỗi:** suy từ Dresses (SWR + form-modal) ra cả app. Sai: Contracts dùng **React Query**, Leads/Calendar dùng **dnd-kit**, Finance **0 realtime**, Employees/Dashboard là **RSC**.
- **Quy tắc:** không generalize từ 1 module. Mỗi module xác nhận lib + UI + realtime TRƯỚC khi áp pattern.

### A4. ESLint `preserve-manual-memoization` ở dress-form-modal là PRE-EXISTING *(2026-06-04)*
- **Triệu chứng:** verify Task 1.2/1.3 → eslint báo 2 lỗi `react-hooks/preserve-manual-memoization` (`validateItemCode` dòng 115 — KHÔNG đụng, và `handleSubmit`).
- **Cách xác định:** `git stash push -- <3 file đổi>` → lint bản HEAD → HEAD **cũng** 2 lỗi y hệt → pre-existing (React Compiler + optional-chaining `editItem?.id` trong useCallback deps).
- **Quy tắc:** gặp lint/test fail → **kiểm baseline (HEAD) TRƯỚC khi nhận lỗi**. Chỉ chịu trách nhiệm lỗi MỚI mình thêm. Pre-existing → mention, ĐỪNG tự sửa (Surgical, ngoài scope).

### A5. Optimistic DELETE sai vì server có thể RETIRE thay vì xóa *(2026-06-04, bắt trước khi ship)*
- **Triệu chứng (sẽ là):** optimistic `removeFromListCache` ở dress delete → item mất → revalidate → dress **quay lại** nếu server RETIRE.
- **Nguyên nhân:** `delete_dress_atomic` (migration `20260429110000_dresses_audit_fix.sql:609-616`) → dress CÓ lịch sử thuê/`contract_items` → `status='retired'` (`deleted_at` NULL) → **vẫn trong** `fetchDressList`. Client không biết trước kết cục (XÓA vs RETIRE).
- **Fix:** delete dùng **"đóng modal + revalidate"** (§11), KHÔNG optimistic-remove. `removeFromListCache` giữ trong `lib/swr.ts` cho module Phase 2 nơi delete = xóa-thật.
- **Quy tắc:** trước khi optimistic-remove → **xác minh server delete = XÓA THẬT** (không retire/soft-archive còn hiển thị trong list query).

### A6. Dev server 404 "ma" do `.next` cache cũ — KHÔNG phải lỗi code *(2026-06-04)*
- **Triệu chứng:** sau khi sửa code + `pnpm dev`, MỌI route protected (`/dashboard`, `/dresses`) trả **404**, dù tsc pass + `/login` OK.
- **Nguyên nhân:** start dev đè lên `.next` build cache từ phiên trước (code khác) → Turbopack serve route-manifest cũ → 404 ma.
- **Cách xác định (phép thử 2 biến):** `git stash` code → **HEAD + clean `.next`** → OK; **code mình + clean `.next`** → cũng OK ⇒ loại trừ logic, thủ phạm = cache.
- **Fix:** `rm -rf .next` + restart sạch. ⚠️ `TaskStop` KHÔNG kill node con → port 3000 còn bị giữ + khóa `.next`; phải `taskkill //F //PID <pid>` (lấy PID từ `netstat -ano | grep :3000`) trước khi `rm`.
- **Quy tắc:** TRƯỚC khi verify runtime (nhất là sau khi sửa code/đổi nhánh) → **`rm -rf .next`** để tránh 404 ma + hiểu lầm "code làm sập app". Và đừng vội nhận lỗi logic khi 404 toàn cục — chạy phép thử 2 biến trước.

### A7. Navigate từ drawer/modal: KHÔNG `onClose()` TRƯỚC `router.push()` *(2026-06-04, user báo)*
- **Triệu chứng:** bấm "Chi tiết hợp đồng" trong contract drawer → quay về list, phải bấm **lần 2** mới mở chi tiết. (Cùng pattern: nút Sửa, Theo dõi thanh toán.)
- **Nguyên nhân:** `onViewDetail/onEdit/onTrackPayment` gọi `onClose()` (set state → unmount drawer) RỒI `router.push()` cùng tick → **race**: drawer unmount nuốt navigation lần 1.
- **Fix:** bỏ `onClose()`, chỉ `router.push()` — điều hướng sang route khác (`/contracts/[id]`) tự unmount list+drawer. (`contract-drawer.tsx`)
- **Lưu ý chẩn đoán:** automation (synthetic click) KHÔNG reproduce (không có animation/timing như pointer thật) — đừng kết luận "không có bug" chỉ vì automation pass; tin user + sửa nguyên nhân race.
- **Quy tắc:** navigate-away từ drawer/modal → `push` thẳng, KHÔNG `onClose()` trước push.

### A8. Drawer/modal skeleton dù data đã có ở list → seed `placeholderData` *(2026-06-04, user báo)*
- **Triệu chứng:** contract drawer mở → tabs Sự kiện/Checklist/Nhân sự hiện **skeleton + đợi**, dù list query đã JOIN sẵn events/checklists/work_tasks (data tạo badge "4/5" ngoài list).
- **Nguyên nhân:** `useContractDrawerExtra` fetch riêng (React Query) → `isLoadingExtra=true` → `OperationsTabs` (drawer-tab-content.tsx:273) hiện skeleton, che mất data fallback đã có (dòng 100-104). Comment file ghi "0ms drawer" nhưng ai đó thêm fetch riêng → phá.
- **Fix:** truyền list data làm **`placeholderData`** cho `useQuery` → `isLoading=false` → hiện ngay, fetch full ở nền rồi thay. (`use-contract-queries.ts` + `contract-drawer.tsx`)
- **Quy tắc:** drawer/modal preview có data sẵn ở list query → seed `placeholderData`/`fallbackData`, ĐỪNG fetch+skeleton lại. (Notes vẫn skeleton nếu list KHÔNG JOIN notes — chỉ seed được cái list đã có.)

### A9. *(chừa sẵn — bổ sung khi code gặp lỗi thật)*

---

## B. Cạm bẫy ĐÃ BIẾT — checklist bắt buộc trước khi commit mỗi task

**Optimistic / data:**
- [ ] KHÔNG patch optimistic giá trị **server tính lại** (mã tự sinh `item_code`/`*_code`, `recalc_contract_totals`, tồn kho bình quân, `*_atomic` status) → dùng **"đóng modal + revalidate"**.
- [ ] Mọi `runOptimisticMutation`: **`onSuccess → revalidate`, `onError → rollback`** (server là chân lý; bug tệ nhất chỉ nháy <1s, không ghi sai DB).
- [ ] SWR array-key `[ns, filters]`: match bằng **`cacheKeyMatchesPrefix`**, KHÔNG so key tuyệt đối.
- [ ] revalidate: KHÔNG truyền `data=undefined` (gây flash skeleton — [swr.ts:160](../../lib/swr.ts)) → dùng `revalidateByPrefixes`.

**Cache invalidation / module:**
- [ ] **Finance: GIỮ `revalidatePath`** (0 realtime — bỏ là số tiền stale). Tuyệt đối không đụng.
- [ ] Chỉ bỏ revalidate khi **trang đích có realtime** cho bảng đó.
- [ ] KHÔNG đụng `invalidateContractPaths` cascade khi đang làm module khác.
- [ ] Đụng file **shared** (`lib/swr.ts`, `bottom-nav.tsx`, `server-cache-invalidation.ts`) → chỉ **additive** hoặc verify đa module.

**Quy trình:**
- [ ] Làm **1 module / 1 task một lúc** (tách module, không liên đới).
- [ ] Chạy **`verify:<module>`** + chrome-devtools trước khi deploy.
- [ ] Node: prepend `C:\Users\Admin\.nodejs\...` vào PATH rồi mới `pnpm` (xem memory `node-toolchain-not-on-path.md`).

**Surgical Changes (Karpathy — xem `CLAUDE.md`):**
- [ ] **Mỗi dòng đổi trace thẳng về yêu cầu** — không refactor cái không hỏng, không "cải thiện" code lân cận.
- [ ] **Match style hiện có** của file đang sửa (dù mình thích kiểu khác).
- [ ] Dead code không liên quan → **mention, ĐỪNG xóa**. Chỉ gỡ orphan do thay đổi của mình tạo ra.
- [ ] **Trước khi viết util mới → grep đã có chưa** (tái dùng > tạo mới — bài học A2).

---

## C. Cơ chế (cam kết)
1. **Trước mỗi task:** đọc file này + `MEMORY.md`.
2. **Khi gặp lỗi:** ghi vào mục A ngay (triệu chứng → nguyên nhân gốc → cách fix → quy tắc tránh) trước khi đi tiếp.
3. **Bài học lâu dài / xuyên dự án:** nâng lên `~/.claude/projects/.../memory/` và link lại ở đây.
4. **Khác** [PLAN.md §8 Playbook]: §8 là lỗi *dự đoán*; file này là lỗi *thực tế đã gặp* + checklist phòng ngừa.
