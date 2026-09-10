---
title: "Module Váy cưới"
tags: [module, vay-cuoi]
cap-nhat: 2026-08-31
trang-thai: da-kiem-2026-08-31
doi-chieu: agent/system-map/03-in-kho-vay.md · vault/30-du-lieu/than-ham/vay-cuoi.md
---

# Module Váy cưới

Kho váy, cho thuê (gắn hợp đồng hoặc thuê lẻ), đặt giữ. Quyền xem: admin, manager, sale.

Quy mô (**ảnh chụp**, số sống ở [[luoc-do-vay-cuoi]]): **2 váy, 0 lượt thuê, 0 đặt giữ.** Module đã dựng đầy đủ nhưng gần như chưa vận hành.

## Route

`/dresses` · `/dresses/rentals`

## Guard hai tầng

| Guard | Ai |
|---|---|
| `requireDressesAccess` | admin, manager, sale (theo ma trận) |
| `requireDressesBookingAccess` | admin, manager, sale — đặt/thuê |
| `requireDressesCatalogWriteAccess` | **admin, manager** — sửa catalog |

Sale đặt được váy nhưng không sửa được danh mục.

## ⚠️ Xoá váy có thể là "về hưu", không phải xoá

`delete_dress_atomic`: váy **có lịch sử thuê hoặc nằm trong `contract_items`** → chuyển `status = 'retired'`, `deleted_at` **vẫn NULL** → **vẫn nằm trong `fetchDressList`**.

Hệ quả: optimistic-remove sẽ làm item biến mất rồi **quay lại** sau revalidate. Client không đoán trước được kết cục.

→ **Xoá váy dùng "đóng modal + revalidate", không optimistic-remove.**
Quy tắc chung: trước khi optimistic-remove ở bất kỳ đâu, xác minh server **xoá thật**, không retire/archive mà vẫn hiện trong list.

## Hàm DB của module

**RPC ghi (atomic):** `create_dress_contract_reservation_atomic` · `create_standalone_dress_rental_atomic` · `start_dress_rental_atomic` · `return_dress_rental_atomic` · `mark_dress_cleaned_atomic` · `cancel_dress_rental_atomic` · `release_dress_reservation_atomic` · `update_dress_reservation_status_atomic` · `refresh_dress_status_atomic` · `delete_dress_atomic`

**Hàm đọc (`STABLE`, KHÔNG phải RPC atomic):** `dress_list` · `dress_stats` · `dress_rental_list` · `is_dress_available` — `20260429110000…:112,129,206`. Bản cũ của trang này xếp nhầm 4 hàm này vào nhóm atomic.

Vòng đời váy: **đặt giữ → bắt đầu thuê → trả → giặt xong → sẵn sàng**. Mỗi bước một RPC riêng — **hãy đi qua RPC**, đó là nguyên tắc đúng.

Nhưng đừng tin câu "không có UPDATE `status` tay": code **có**. `return_dress_rental_atomic:499-504` ghi thẳng `dresses.status = 'cleaning'` bên trong hàm; ngoài ra 3 nhánh fallback trong app cũng ghi tay khi RPC vắng mặt (`dress-mutations.ts:110-113`, `rental-mutations.ts:230-233,272-275`). Debug trạng thái váy sai thì phải soi cả 4 chỗ này.

> ⚠️ CHƯA KIỂM (2026-08-31): nhánh fallback `isMissingRpc` (`dress-mutations.ts:32-35`, `rental-mutations.ts`) phủ 9 RPC váy. Nếu RPC luôn tồn tại thì đây là ~250 dòng mã chết; nếu không thì là lỗ hổng bỏ qua mọi kiểm tra atomic. Chỉ chốt được bằng `pg_proc`.

## Hai trạng thái không có ai ghi

- **`dress_rentals.status = 'overdue'`** — quét toàn `app/`, `lib/`, `components/`, `supabase/migrations/` chỉ thấy **đọc** (`dress-mutations.ts:25,103`; `rental-queries.ts:131`) và **kiểm tra**, không một `UPDATE … SET status='overdue'` nào. ⇒ nhánh `overdue` của `refresh_dress_status_atomic:292-296` không bao giờ chạy; bộ lọc "Quá hạn" (`standalone-rentals-client.tsx:54`) luôn rỗng.
- **`dresses.status = 'maintenance'`** — chỉ xuất hiện trong **điều kiện chặn** (`20260429110000…:89,288,384,485,665`) và nhãn UI (`types/dress-constants.ts:23`). Không tìm thấy đường ghi nào.

> ⚠️ CHƯA KIỂM (2026-08-31): chưa loại trừ job ngoài repo (Vercel cron / Supabase Edge Function) đặt hai trạng thái này.

## Bảng

[[luoc-do-vay-cuoi]] — `dresses` · `dress_rentals` · `dress_rental_accessories` · `dress_reservations`

`dress_rental_accessories` 0 dòng và **không tìm thấy server action / RPC nào INSERT** vào nó — thực tế phụ kiện được ghi vào cột text `dress_rentals.accessories` (`create_standalone_dress_rental_atomic:399`). Nhiều khả năng là di sản chưa dùng.

## Kỹ thuật

SWR (4 file) + realtime qua **signal** ở 3 file client (5 lời gọi `useRealtimeSignal`: `dresses-list-client.tsx:97-99`, `rental-history-client.tsx:132`, `standalone-rentals-client.tsx:82`) — `dresses` bị REVOKE SELECT khỏi `authenticated` (nếu grant lại thì `purchase_price` lộ cho mọi nhân viên qua payload realtime). → [[cache-va-realtime]]

Huỷ hợp đồng có `cancel_contract_cascade` chạm `dress_reservations` + `dresses` → [[hop-dong]] (~~nghi vấn `printing_orders.status='da_huy'` vs CHECK~~ — ✅ **đã sửa 07/09/2026, #13 R1**: hàm ghi `huy_don`).

⚠️ **`lib/hooks/use-prefetch-on-hover.ts:90-99` query thẳng bảng `dresses` từ trình duyệt** (và select cả `purchase_price`, `:53`) — trong khi `dresses` đã bị `REVOKE ALL … FROM PUBLIC, anon, authenticated` (`20260429110000_dresses_audit_fix.sql:10`, không có GRANT lại ở migration nào sau). Prefetch này sẽ nhận `42501`; đừng lấy nó làm mẫu.

## Liên quan

[[hop-dong]] · [[bay-du-lieu]]
