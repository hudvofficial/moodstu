---
title: "Quy ước code"
tags: [nen-tang, quy-uoc]
cap-nhat: 2026-08-07
---

# Quy ước code

## Đặt tên file

| Loại | Mẫu | Ví dụ |
|---|---|---|
| Trang | `app/(protected)/<module>/page.tsx` | `finance/expenses/page.tsx` |
| API | `app/api/<...>/route.ts` | `api/push/send/route.ts` |
| Action đọc | `app/actions/<module>-queries.ts` | `contract-queries.ts` |
| Action ghi | `app/actions/<module>-mutations.ts` | `inventory-mutations.ts` |
| Action gộp | `app/actions/<module>-actions.ts` | `expense-actions.ts` |
| Component | `components/<module>/<ten-kebab>.tsx` | `contracts/contract-drawer.tsx` |
| Hook | `hooks/use-<ten>.ts` | `hooks/use-realtime-signal.ts` |

Tách `-queries` / `-mutations` **không nhất quán toàn app** — module cũ dùng `-actions.ts` gộp. Theo file đang có, đừng đổi.

## Kết quả server action

Mọi action trả `ActionResult<T>`:
```ts
{ success: true, data: T } | { success: false, error: string }
```
Thông báo lỗi viết **tiếng Việt**, hướng người dùng ("Bạn không có quyền truy cập Tài chính"). Đừng ném raw error ra UI.

## Giao diện toàn tiếng Việt

Nhãn, nút, toast, thông báo lỗi — tất cả tiếng Việt. Comment code cũng chủ yếu tiếng Việt. Giữ nguyên phong cách này.

⚠️ **Mã hoá:** PowerShell 5.1 đọc UTF-8-không-BOM theo codepage ANSI 1258 → text tiếng Việt hiển thị bể qua console **không có nghĩa file bể**. Verify bằng byte, đừng tin console. `npm run verify:utf8` có sẵn.

## Toast

Dùng `lib/toast-manager.ts` + `lib/toast-messages.ts` (có file `.examples.ts` kèm). Nền là `sonner`. Đừng gọi thẳng `sonner` ở component mới.

## Trước khi viết helper mới → grep

Đã từng suýt viết lại `runOptimisticMutation` vì không kiểm. Helper sẵn có đáng nhớ:

| Việc | Helper |
|---|---|
| Optimistic + rollback | `lib/optimistic-mutation.ts` |
| Invalidate SWR theo tiền tố | `lib/swr.ts` → `revalidateByPrefixes`, `cacheKeyMatchesPrefix` |
| Invalidate cache server | `lib/server-cache-invalidation.ts` |
| Kiểm quyền | `lib/auth_utils.ts` → `withAuth*`, `require*Access` |
| Ngày giờ studio | `lib/studio-date.ts` |
| Tiền & định dạng tài chính | `lib/finance-utils.ts`, `lib/finance-constants.ts` |
| Breakpoint | `lib/breakpoints.ts` |
| Rung haptic | `lib/haptic.ts` |
| Ghi audit | `lib/audit.ts` |

## File dùng chung — chỉ additive

`lib/swr.ts` · `components/layout/bottom-nav.tsx` · `lib/server-cache-invalidation.ts`
Sửa những file này chỉ được **thêm**, hoặc phải verify nhiều module. Một task = một module.

## Kỷ luật sửa code

- Mỗi dòng đổi phải trace thẳng về yêu cầu. Không "cải thiện" code lân cận, không refactor cái không hỏng.
- Match style file đang sửa, kể cả khi mình thích kiểu khác.
- Dead code không liên quan → **nêu ra, đừng xoá**. Chỉ gỡ import/biến mà chính thay đổi của mình làm thừa.

⚠️ Có file trùng tên là **dead code**: `header-v2.tsx`, `header-old.tsx` — bản đang chạy là `header.tsx` (app-shell import `./header`). **Grep import trước khi sửa file trùng tên.**

## Lint

CI chỉ lint **file thay đổi** (repo còn nợ ~195 lỗi cũ). Nghĩa là **đụng file nào là nhận cổng lint của file đó**.

**`eslint` exit ≠ 0 → KHÔNG push.** Đã vi phạm một lần với lý do "lỗi có sẵn" → CI đỏ.

Gặp lint fail: kiểm baseline HEAD trước (`git stash` file mình đổi → lint lại). Lỗi pre-existing → nêu ra, đừng tự sửa (ngoài scope).

## Cạm bẫy 4-SSOT khi thêm `service_type`

Thêm một giá trị `service_type` phải sửa **4 chỗ**: `contract.ts` + `service-constants.ts` + `contract.schema.ts` + `database.types.ts` (2 vị trí). `SERVICE_TYPE_GROUPS` (mảng) và `database.types.ts` **compiler không bắt lỗi** → rất dễ sót. Event mẫu sửa ở `fallbackEventTemplates`.

## Ô nhập số

`Number("") === 0` làm ô số kẹt khi xoá trắng. Dùng **state kiểu string + `placeholder="0"`** (mẫu ở `stock-in-modal`).

## Liên quan

[[responsive-3-tier]] · [[bay-ui-react]] · [[trien-khai-va-verify]]
