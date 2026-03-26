@[/code]# Phase 1: Fix 3 Critical Bugs — Dresses Module

## Plan: implementation_plan.md (đã duyệt)
## DB project: mnoqeluywookswpcykha

## DB Schema SSOT (đã verify Supabase)
- inventory_reservations: id, inventory_item_id, contract_id, contract_item_id, customer_id, start_date, end_date, export_type, status, notes, created_at, updated_at
- KHÔNG CÓ: item_id, rental_price, is_addon
- contract_items: id, contract_id, is_addon (bool), unit_price (numeric), inventory_item_id, ...
- Storage buckets: RỖNG

## C2: Rename item_id → inventory_item_id

Tìm TẤT CẢ `.eq("item_id"` và `reservation.item_id` trong 2 file server action → đổi thành `inventory_item_id`. Đồng thời xóa `rental_price` khỏi mọi `.select()` trên bảng `inventory_reservations`.

Files + vị trí:
- app/actions/dress-queries.ts — L78 (select: xóa rental_price, thêm inventory_item_id), L79, L131
- app/actions/dress-mutations.ts — L134, L177 (select đổi thành: "id, inventory_item_id, contract_id, contract_item_id, status"), L195, L205
- types/dress.ts — L82: item_id → inventory_item_id

## C1: Addon billing rewrite

File: app/actions/dress-mutations.ts L209-227

Block cũ dùng reservation.rental_price và reservation.is_addon (KHÔNG TỒN TẠI). Xóa block cũ, thay bằng:

    if (reservation.contract_item_id && reservation.contract_id) {
      const { data: contractItem } = await supabase
        .from("contract_items")
        .select("is_addon, unit_price")
        .eq("id", reservation.contract_item_id)
        .single();

      if (contractItem?.is_addon && contractItem.unit_price > 0) {
        const { data: contract } = await supabase
          .from("contracts")
          .select("total_amount, remaining_amount")
          .eq("id", reservation.contract_id)
          .single();

        if (contract) {
          await supabase.from("contracts").update({
            total_amount: Math.max(0, contract.total_amount - contractItem.unit_price),
            remaining_amount: Math.max(0, contract.remaining_amount - contractItem.unit_price),
            updated_by: userId, updated_at: now,
          }).eq("id", reservation.contract_id);
        }
      }
    }

## C3: Tạo storage bucket

Chạy Supabase migration (project mnoqeluywookswpcykha):

    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('dresses', 'dresses', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']);

    CREATE POLICY "Authenticated upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'dresses');
    CREATE POLICY "Public view" ON storage.objects FOR SELECT TO public USING (bucket_id = 'dresses');
    CREATE POLICY "Authenticated delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'dresses');

## Verification
1. npx tsc --noEmit — zero errors
2. Grep: không còn "item_id" trong dress-queries.ts và dress-mutations.ts
3. Mở browser /dresses → click dress → drawer hiển thị reservations
