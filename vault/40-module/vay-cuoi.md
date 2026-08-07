---
title: "Module Váy cưới"
tags: [module, vay-cuoi]
cap-nhat: 2026-08-07
---

# Module Váy cưới

Kho váy, cho thuê (gắn hợp đồng hoặc thuê lẻ), đặt giữ. Quyền xem: admin, manager, sale.

Quy mô hiện tại: **2 váy, 0 lượt thuê, 0 đặt giữ.** Module đã dựng đầy đủ nhưng gần như chưa vận hành.

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

## RPC atomic

`create_dress_contract_reservation_atomic` · `create_standalone_dress_rental_atomic` · `start_dress_rental_atomic` · `return_dress_rental_atomic` · `mark_dress_cleaned_atomic` · `cancel_dress_rental_atomic` · `release_dress_reservation_atomic` · `update_dress_reservation_status_atomic` · `refresh_dress_status_atomic` · `is_dress_available` · `dress_list` · `dress_stats` · `dress_rental_list`

Vòng đời váy: **đặt giữ → bắt đầu thuê → trả → giặt xong → sẵn sàng**. Mỗi bước một RPC riêng, đừng UPDATE `status` tay.

## Bảng

[[luoc-do-vay-cuoi]] — `dresses` · `dress_rentals` · `dress_rental_accessories` · `dress_reservations`

## Kỹ thuật

SWR (4 file) + 3 chỗ realtime qua **signal** — `dresses` bị REVOKE SELECT khỏi `authenticated` (nếu grant lại thì `purchase_price` lộ cho mọi nhân viên qua payload realtime). → [[cache-va-realtime]]

Huỷ hợp đồng có `cancel_contract_cascade` chạm `dress_reservations` + `dresses` → [[hop-dong]].

## Liên quan

[[hop-dong]] · [[bay-du-lieu]]
