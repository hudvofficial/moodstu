---
title: "Module Dịch vụ & báo giá"
tags: [module, dich-vu]
cap-nhat: 2026-08-31
trang-thai: da-kiem-2026-08-31
doi-chieu: agent/system-map/08-dichvu-muctieu-nangsuat.md · vault/30-du-lieu/than-ham/dich-vu.md
---

# Module Dịch vụ & báo giá

Catalog gói dịch vụ dùng làm nguyên liệu cho hợp đồng. Quyền: admin, manager.

Quy mô (**ảnh chụp**, số sống ở [[luoc-do-dich-vu]]): 18 dịch vụ, 7 danh mục.

Bốn bảng `service_bundles` · `service_relations` · `price_rules` · `promotions` đều **0 dòng** — nhưng mức "chưa dùng" của chúng **khác hẳn nhau**, đừng gộp một câu:

| Bảng | Thực trạng mã |
|---|---|
| `service_bundles` | đường ghi đầy đủ + UI (`ServiceBundleSection`) — chỉ thiếu dữ liệu |
| `price_rules` | có UI CRUD (`RuleManager.tsx`) |
| `service_relations` | **mã chết** — `getServiceRelations`/`upsertRelation` (`builder-actions.ts:15,54`) có **0 call-site**; `ServiceBundleSection.tsx:118-124` không truyền prop nên `BuilderMode` luôn nhận `preFetchedRelations = []` |
| `promotions` | **0 dòng mã** trong `app/`, `lib/`, `components/` → bảng chết |

## Route

`/services` · `/services/create` (**route riêng, không phải modal**) · `/services/[id]` · `/services/[id]/quote` (báo giá)

## ⚠️ `/services/create` là route riêng → bẫy cache

Vì tạo mới là **route riêng**, danh sách bị unmount lúc invalidate. Cộng với `revalidateOnMount: false`, SWR cache mức module giữ dữ liệu cũ và che props tươi từ server → **thêm dịch vụ xong phải F5 mới thấy**. Đo prod: quay lại danh sách 0 refetch.

Fix đã áp: `revalidateOnMount: true` + seed cache từ props server.

**Module tạo-bằng-modal không dính lỗi này.** Đừng suy pattern từ chỗ này sang chỗ khác — kiểm route hay modal trước.

## `service_type` — cạm bẫy 5 SSOT

`service_type_enum` 13 giá trị: `studio · ngay_cuoi · combo · baby · gia_dinh · sinh_nhat · bau · concept · couple · ky_yeu · media · outsource · khac`

⚠️ **Enum này KHÔNG gắn vào `services`.** `services.service_type` là kiểu **`text`** (`types/database.types.ts:5183`; [[luoc-do-dich-vu]] dòng 32) → bảng catalog **không có hàng rào DB nào**, giá trị lạ lọt vào mà DB không chặn. Enum chỉ gắn `contracts.service_type` (`types:760`) và `event_templates.service_type` (`types:1853`).

Thêm một giá trị phải sửa **5 chỗ**:
1. `types/contract.ts`
2. `types/service-constants.ts`
3. `contract.schema.ts`
4. `types/database.types.ts` (**2 vị trí**)
5. `scripts/normalize-services.mjs:46` — giữ danh sách hợp lệ **riêng**, và **đang sót `outsource`** sẵn

`SERVICE_TYPE_GROUPS` (mảng) và `database.types.ts` **compiler không bắt lỗi** → rất dễ sót. Sự kiện mẫu sửa ở `fallbackEventTemplates`.

## Bảng & action

[[luoc-do-dich-vu]] — `services`, `service_categories`, `service_bundles`, `service_relations`, `price_rules`, `promotions`

`service-queries.ts` · `service-mutations.ts` (`save_service_atomic`, `delete_service_atomic`) · `category-actions.ts` · `builder-actions.ts` (`service_relations`, `price_rules`)

Ghi qua RPC atomic **chỉ đúng cho `services` và `service_bundles`.** Bốn bảng còn lại ghi thẳng, không qua RPC: `upsertCategory`/`deleteCategory` INSERT/UPDATE/**DELETE cứng** `service_categories` (`category-actions.ts:75-91`, `:116`); `upsertRelation`/`upsertPriceRule` ghi thẳng `service_relations`/`price_rules` (`builder-actions.ts:70-72`, `:105-107`); `scripts/normalize-services.mjs:70-74` UPDATE thẳng `services`.

## Liên quan

[[hop-dong]] · [[bay-du-lieu]]
