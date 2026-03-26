@[/code]Phase 3: Final Verification + Suggestions — Dresses Module

## Context
- Phase 1 (3 Critical) + Phase 2 (2 Warning) + item_code optimize — ĐÃ FIX XONG
- Supabase project_id: mnoqeluywookswpcykha
- Còn lại: 3 Suggestions (S1, S2, S3) từ audit report

## S1: DressItem.status type safety (types/dress.ts)

File: types/dress.ts, khoảng L28

Hiện tại `status: string | null` → đổi thành `status: DressStatus | null` để compile-time safety. Check xem `DressStatus` enum đã export trong file chưa, nếu có thì dùng luôn.

## S3: Thêm composite index (inventory_item_id, status)

Supabase migration (project: mnoqeluywookswpcykha):

    CREATE INDEX IF NOT EXISTS idx_reservations_item_status
    ON inventory_reservations (inventory_item_id, status);

Lý do: releaseReservation() query `WHERE inventory_item_id = X AND status IN ('reserved','rented')` — index hiện tại chỉ cover (inventory_item_id, start_date, end_date).

## S2: SKIP (inventory_reservations.status varchar → enum)
Lý do: cần migration phức tạp, risk cao, lợi ích thấp cho scale studio. Để backlog.

## W1: SKIP (getDressStats over-fetch)
Lý do: false positive — data scale nhỏ, chỉ select 1 column lightweight.

## W2: SKIP (transaction cho releaseReservation)
Lý do: cần RPC phức tạp, deferred to backlog.

## Verification
1. npx tsc --noEmit — zero errors
2. Mở browser /dresses → click dress → drawer hiển thị đúng reservations
3. Test upload ảnh dress (bucket đã tạo Phase 1)
4. Test tìm kiếm nhập % → KHÔNG match tất cả
