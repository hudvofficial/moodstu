---
title: "Module Dịch vụ & báo giá"
tags: [module, dich-vu]
cap-nhat: 2026-08-07
---

# Module Dịch vụ & báo giá

Catalog gói dịch vụ dùng làm nguyên liệu cho hợp đồng. Quyền: admin, manager.

Quy mô: 18 dịch vụ, 7 danh mục. `service_bundles`, `service_relations`, `price_rules`, `promotions` hiện **rỗng** — đã dựng, chưa dùng.

## Route

`/services` · `/services/create` (**route riêng, không phải modal**) · `/services/[id]` · `/services/[id]/quote` (báo giá)

## ⚠️ `/services/create` là route riêng → bẫy cache

Vì tạo mới là **route riêng**, danh sách bị unmount lúc invalidate. Cộng với `revalidateOnMount: false`, SWR cache mức module giữ dữ liệu cũ và che props tươi từ server → **thêm dịch vụ xong phải F5 mới thấy**. Đo prod: quay lại danh sách 0 refetch.

Fix đã áp: `revalidateOnMount: true` + seed cache từ props server.

**Module tạo-bằng-modal không dính lỗi này.** Đừng suy pattern từ chỗ này sang chỗ khác — kiểm route hay modal trước.

## `service_type` — cạm bẫy 4 SSOT

`service_type_enum` 13 giá trị: `studio · ngay_cuoi · combo · baby · gia_dinh · sinh_nhat · bau · concept · couple · ky_yeu · media · outsource · khac`

Thêm một giá trị phải sửa **4 chỗ**:
1. `types/contract.ts`
2. `types/service-constants.ts`
3. `contract.schema.ts`
4. `types/database.types.ts` (**2 vị trí**)

`SERVICE_TYPE_GROUPS` (mảng) và `database.types.ts` **compiler không bắt lỗi** → rất dễ sót. Sự kiện mẫu sửa ở `fallbackEventTemplates`.

## Bảng & action

[[luoc-do-dich-vu]] — `services`, `service_categories`, `service_bundles`, `service_relations`, `price_rules`, `promotions`

`service-queries.ts` · `service-mutations.ts` (`save_service_atomic`, `delete_service_atomic`) · `category-actions.ts` · `builder-actions.ts` (`service_relations`, `price_rules`)

Ghi qua RPC atomic — đừng insert tay.

## Liên quan

[[hop-dong]] · [[bay-du-lieu]]
