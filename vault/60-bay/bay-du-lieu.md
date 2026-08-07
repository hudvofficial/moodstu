---
title: "Bẫy — dữ liệu & cache"
tags: [bay, du-lieu]
cap-nhat: 2026-08-07
---

# Bẫy dữ liệu & cache

Lỗi **đã thật sự xảy ra**, không phải phòng xa. Đọc trước khi viết spec đụng dữ liệu.

## 1. PostgREST cắt 1000 dòng — im lặng

`supabase-js` `.limit(20000)` vẫn chỉ trả **1000 dòng**, không lỗi, không cảnh báo. Đếm phía client sẽ ra số sai mà trông rất thuyết phục.

**Cách đúng:** `.range(from, from+999)` lặp cho tới hết, hoặc `count: 'exact', head: true` nếu chỉ cần số.

Đang còn nợ: `getReactionCounts`, query tim của admin gallery.

## 2. PostgREST giới hạn header 16KB

`.in('id', [~500 uuid])` sinh URL ~19.700 ký tự → `HTTP headers exceeded server limits`. Vỡ ở khoảng **400 phần tử**.

Chỗ đang dính: chế độ lọc "tim" của gallery.

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

**Tra [[bang-doc-ghi]] hoặc `30-du-lieu/luoc-do-*.md` trước khi viết query.** `types/database.types.ts` **đang lệch DB** → [[canh-bao-schema]].

## 12. `employee_salaries` hard delete là cố ý

Dữ liệu dẫn xuất, tái sinh được, không có `deleted_at`. Đừng "sửa" thành soft delete — phá chức năng tái tạo và làm sai tổng.

## 13. Đừng viết rủi ro đồng thời khi không có tác nhân thứ hai

Từng viết vào spec rằng phân trang offset "có thể lệch nếu có người upload trong lúc khách cuộn" → sai: **chỉ admin ghi được `gallery_images`** (đúng 3 nơi, không cron, không webhook).

**Luật:** trước khi ghi một rủi ro concurrency vào spec, **grep xem ai thật sự ghi được vào bảng đó** ([[bang-doc-ghi]]). Không có tác nhân thứ hai → **xoá hẳn ghi chú**, đừng để lại dạng "khả năng thấp". Rủi ro tưởng tượng đẩy giải pháp nặng hơn mức cần.

**Đã tốn tiền thật một lần:** commit `f1b96d6` (29/05) xây nguyên Phase 3 "cursor-based pagination" cho gallery với lý do ghi trong code — *"Prevents data shift when images are uploaded during browsing"*. Vấn đề đó **không tồn tại** vì chỉ admin upload được. Kết cục: 197 dòng SQL + 90 dòng action, migration chưa từng apply, action không ai import, tồn tại 70 ngày rồi bị xoá ngày 2026-08-07 mà không mất gì.

## 14. Seed E2E rò vào production

Test E2E chạy trên DB chung; dọn dẹp chỉ ở `afterAll` → fail một lần là nhân sự "E2E" active lọt vào mọi picker thật.
Fix: quét tự lành có giới hạn thời gian ở `beforeAll`.

## 15. `.rpc()` không hiện trong bản đồ đọc/ghi

[[bang-doc-ghi]] chỉ bắt `.from().insert/update/delete`. Ghi qua RPC **vô hình** ở đó. Tra thêm [[rpc-va-enum]] — phần lớn thao tác ghi quan trọng của app đi bằng RPC atomic.

## Liên quan

[[cache-va-realtime]] · [[bay-ui-react]] · [[bay-trien-khai]]
