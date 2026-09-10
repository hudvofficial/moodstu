---
title: "Bẫy — dữ liệu & cache"
tags: [bay, du-lieu]
cap-nhat: 2026-08-31
trang-thai: da-kiem-2026-08-31
doi-chieu: agent/SYSTEM_MAP.md §5-§6 · agent/system-map/05-gallery-moodie.md · agent/system-map/06-nen-tang.md
---

# Bẫy dữ liệu & cache

Lỗi **đã thật sự xảy ra**, không phải phòng xa. Đọc trước khi viết spec đụng dữ liệu.

## 1. PostgREST cắt 1000 dòng — im lặng

`supabase-js` `.limit(20000)` vẫn chỉ trả **1000 dòng**, không lỗi, không cảnh báo. Đếm phía client sẽ ra số sai mà trông rất thuyết phục.

**Cách đúng:** `.range(from, from+999)` lặp cho tới hết, hoặc `count: 'exact', head: true` nếu chỉ cần số.

Đang còn nợ (đo 31/08/2026): `getAllHeartedImagesForAction` · `getGalleryComments` · `getCommentCountsPerImage` · `getClientReactions` · `getGalleryMetadataAll` — đều select một phát, không phân trang.
✅ Đã trả: `getReactionCounts` và `getGallerySummariesByContract` nay dùng `selectAllRows`. (Trang này trước ghi `getReactionCounts` còn nợ — sai địa chỉ, không sai bản chất.)

## 2. PostgREST giới hạn header 16KB

`.in('id', [~500 uuid])` sinh URL ~19.700 ký tự → `HTTP headers exceeded server limits`. Vỡ ở khoảng **400 phần tử**.

✅ Chỗ từng dính — chế độ lọc "tim" của gallery — **đã vá**: `initDriveCopyJob` đổi sang `selectAllRows` + lọc bằng `Set` trong JS. Giới hạn vẫn còn đó, chỉ là hết call-site đã biết; đừng dựng lại `.in()` trên danh sách không chặn số lượng.

## 3. Optimistic-remove khi server "về hưu" thay vì xoá

`delete_dress_atomic`: váy có lịch sử thuê → `status='retired'`, `deleted_at` vẫn NULL → **vẫn nằm trong list**. Optimistic-remove làm item biến mất rồi quay lại.

**Luật:** trước khi optimistic-remove, xác minh server **xoá thật**. Không chắc → "đóng modal + revalidate".

## 4. Không optimistic cho giá trị server tính

Mã tự sinh (`*_code`) · `recalc_contract_totals` · tồn kho bình quân · trạng thái `*_atomic` · mọi con số tiền.
Mẫu đúng: **đóng modal + revalidate**.

## 5. Cache SWR che props tươi khi tạo-mới-là-route-riêng

`/services/create` là route riêng → list unmount lúc invalidate; `revalidateOnMount: false` khiến cache mức module che props server → **thêm xong phải F5**.
Fix: `revalidateOnMount: true` + seed cache từ props server.
Module tạo-bằng-modal **không** dính. Kiểm trước, đừng suy từ module này sang module kia.

## 6. `revalidate(key, undefined)` gây nháy skeleton

Dùng `revalidateByPrefixes`. SWR array-key `[ns, filters]` match bằng `cacheKeyMatchesPrefix`, đừng so key tuyệt đối.

## 7. Realtime "SUBSCRIBED" nhưng không có event

Publication `supabase_realtime` từng **rỗng hoàn toàn** — mọi hook realtime trong app subscribe thành công nhưng chưa từng nhận event, suốt nhiều tháng không ai biết.

**Verify bằng event thật end-to-end**, không phải trạng thái channel.

## 8. Tab ẩn giết SWR

`document.hidden = true` → SWR 0 fetch, `loadingMore` kẹt `true` → nhìn y hệt bug app. Hay gặp khi verify trong browser pane.
Muốn test: giả `visibilityState='visible'` + dispatch `visibilitychange`. `IntersectionObserver` vẫn chết.

## 9. Guard bằng state không chặn cùng-tick

Hai lời gọi trong cùng một tick đều thấy `loading === false` → chạy cả hai. Dùng **`useRef`**.
Dedupe phải làm **bên trong** `setState(prev => …)`, không so với snapshot closure — closure luôn cũ.

## 10. `CASE` trên enum phải ép `::text`

Không ép → `22P02`, và **lỗi bị nuốt**. Đã làm chi phí vendor thiếu suốt 18 ngày mà không có gì báo đỏ.

## 11. Cột không tồn tại như mình tưởng

Đã đoán nhầm: `galleries.share_links` (thật ra là `custom_slug`), `gallery_images.deleted_at` (không có soft-delete), `employees.user_id`.

**Tra [[bang-doc-ghi]] hoặc `30-du-lieu/luoc-do-*.md` trước khi viết query.**

**Đo lại 31/08/2026 — `types/database.types.ts` lệch ít hơn lời đồn, nhưng KHÔNG phủ hết DB:**

| | Số |
|---|---:|
| Hàm thật trên DB (`pg_proc`, đo 31/08) | **149** |
| Hàm `types/database.types.ts` liệt kê | **124** |
| Hàm lệch ở mức **chữ ký** | **1** (`sync_employee_salary_paid`, thêm ở M5 sau lần sinh types cuối) |
| Bảng · view · enum | 93 · 2 · 16 — **khớp** |

Nghĩa là: types **không sai** ở chỗ nó có, nó chỉ **không có đủ**. Phần vắng gồm hàm trigger (PostgREST không phơi ra — vắng là đúng) và hàm chỉ được SQL khác gọi. Thân đầy đủ của cả 149 hàm nằm ở `30-du-lieu/than-ham/<nhóm>.md`; hàm không được code gọi ở [[ham-mo-coi]]. → [[canh-bao-schema]]

## 12. `employee_salaries` hard delete là cố ý

Dữ liệu dẫn xuất, tái sinh được, không có `deleted_at`. Đừng "sửa" thành soft delete — phá chức năng tái tạo và làm sai tổng.

## 13. Đừng viết rủi ro đồng thời khi không có tác nhân thứ hai

Từng viết vào spec rằng phân trang offset "có thể lệch nếu có người upload trong lúc khách cuộn" → sai **ở thời điểm đó**.

**Luật:** trước khi ghi một rủi ro concurrency vào spec, **grep xem ai thật sự ghi được vào bảng đó** ([[bang-doc-ghi]] + [[rls-va-quyen]]). Không có tác nhân thứ hai → **xoá hẳn ghi chú**, đừng để lại dạng "khả năng thấp". Rủi ro tưởng tượng đẩy giải pháp nặng hơn mức cần.

⚠️ **Nhưng đừng chép lại kết luận cũ — danh sách người ghi thay đổi theo thời gian.** Câu "chỉ admin ghi `gallery_images`, đúng 3 nơi" của bản cũ **nay đã sai** (đo 31/08/2026): khách có select-token ghi `is_starred`/`starred_at`; `createMultiFolderGalleries` là nơi INSERT thứ tư; và **Moodie** INSERT được ảnh qua tool `sync_drive_gallery` sau khi user duyệt. Vẫn không có cron/webhook — nhưng đã có tác nhân thứ hai **có người duyệt**. → [[luong-gallery]]

⇒ Bài học thật không phải "bảng này an toàn", mà là **grep lại mỗi lần, đừng tin ghi chú cũ về ai ghi vào đâu.**

**Đã tốn tiền thật một lần:** commit `f1b96d6` (29/05) xây nguyên Phase 3 "cursor-based pagination" cho gallery với lý do ghi trong code — *"Prevents data shift when images are uploaded during browsing"*. Vấn đề đó **không tồn tại** vì chỉ admin upload được. Kết cục: 197 dòng SQL + 90 dòng action, migration chưa từng apply, action không ai import, tồn tại 70 ngày rồi bị xoá ngày 2026-08-07 mà không mất gì.

## 14. Seed E2E rò vào production

Test E2E chạy trên DB chung; dọn dẹp chỉ ở `afterAll` → fail một lần là nhân sự "E2E" active lọt vào mọi picker thật.
Fix: quét tự lành có giới hạn thời gian ở `beforeAll`.

## 15. `.rpc()` không hiện trong bản đồ đọc/ghi — bẫy nguy hiểm nhất trang này

[[bang-doc-ghi]] chỉ bắt `.from().insert/update/delete`. Ghi qua RPC **vô hình** ở đó.

**Vì sao nó nguy hiểm hơn các bẫy khác:** phần lớn thao tác ghi **quan trọng nhất** của app đi bằng RPC atomic — `save_contract_atomic`, `process_contract_payment_v2`, `record_payee_payment_atomic`, `cancel_contract_cascade`, `create_printing_order_atomic`, `inventory_stock_in_atomic`… Tra bảng đọc/ghi rồi kết luận "bảng này không ai ghi" là **đúng quy trình mà ra kết luận sai**, và đó chính là lớp lỗi đã đẻ ra bẫy #13.

**Cách tra đủ, theo thứ tự:**
1. [[bang-doc-ghi]] — đường `.from()`
2. [[rpc-va-enum]] + `30-du-lieu/than-ham/<nhóm>.md` — **thân đầy đủ 149 hàm DB**, thấy hàm ghi vào bảng nào
3. [[rls-va-quyen]] — ai có quyền chạm qua anon key
4. [[ham-mo-coi]] — hàm còn sống nhưng không code nào gọi

## 16. Repo KHÔNG phản ánh database

Đo 31/08/2026, bốn bằng chứng độc lập:

- `process_contract_payment_v2`: file migration **mới nhất theo tên nghèo hơn** bản đang chạy (thiếu allocations, thiếu đợt `outside`).
- `recalc_contract_totals`, `get_contract_balance`: **không có `CREATE` trong `supabase/migrations/`** — chỉ có `ALTER`/`GRANT` và một dòng trong `types/database.types.ts`.
- `crm_leads`/`customers`: có 4 policy mỗi bảng trên DB, **không migration nào tạo chúng**.
- `types/database.types.ts` thiếu `sync_employee_salary_paid`.

**Nguyên nhân gốc:** `scripts/migrate-direct.mjs:57-64` bắt truyền **từng tên file** → migration áp thủ công → **thứ tự áp ≠ thứ tự tên file**, và có thứ được áp mà không qua file nào.

**Hệ quả:** không ai — người hay agent — kết luận đúng/sai về lược đồ **chỉ bằng cách đọc repo**. Mọi câu hỏi dạng "hàm X có tồn tại / làm gì" phải **hỏi DB** (`node scripts/db-q.mjs`) hoặc đọc `30-du-lieu/than-ham/` (sinh từ `pg_proc` thật). "Migration mới nhất theo tên" chỉ là *bằng chứng mạnh nhất có trong repo*, không phải bằng chứng.

## 17. `revalidateTag` không có producer = no-op im lặng

Ba tag được gọi `revalidateTag` nhưng **không producer nào gắn tag** (không `unstable_cache`/`fetch` nào khai):
`contract-list` · `contract-stats` (`lib/server-cache-invalidation.ts:4-5`) · `studio-info` (`settings-mutations.ts:262`).

Gọi xong không báo lỗi, không báo gì cả. Ai tin "invalidate xong là tươi" sẽ sai. → `agent/SYSTEM_MAP.md` §6 R5.

## 18. `.or()` cấp cha không được trộn cột bảng nhúng

`from("contracts").select("…, customers!inner(full_name)").or("contract_code.ilike.%x%,customers.full_name.ilike.%x%")` → PostgREST trả `failed to parse logic tree` **mỗi lần có chữ** — ô chọn HĐ của modal Xuất kho hỏng âm thầm nhiều tháng vì chỉ nhánh "gần đây" (không filter) chạy (`T-20260826-thiep-kho-ui`, 27/08/2026). Lọc cột nhúng phải đi `.or("full_name.ilike…,phone.ilike…", { referencedTable: "customers" })` (với `!inner` thì lọc cha theo con); cần OR giữa cha và con → **2 truy vấn rồi gộp** (hoặc RPC). Kiểm bằng script gọi thẳng supabase-js trước khi tin UI.

## Liên quan

[[cache-va-realtime]] · [[bay-ui-react]] · [[bay-trien-khai]]
