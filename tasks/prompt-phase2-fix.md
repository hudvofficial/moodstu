@[/code]# Phase 2: Fix 2 Warning Bugs — Dresses Module

## Plan: implementation_plan.md (đã duyệt)
## Supabase project_id: mnoqeluywookswpcykha

## W4: Search ILIKE không escape ký tự đặc biệt

File: app/actions/dress-queries.ts, khoảng L49-52

Hiện tại user nhập `%` hoặc `_` sẽ thành wildcard LIKE → kết quả tìm kiếm sai (match tất cả). Thêm escape trước khi pass vào ilike:

    if (filters.search?.trim()) {
      const s = filters.search.trim().replace(/%/g, '\\%').replace(/_/g, '\\_');
      query = query.or(`name.ilike.%${s}%,item_code.ilike.%${s}%`);
    }

## W3: item_code auto-gen race condition

File: app/actions/dress-mutations.ts, khoảng L26-60

Khi 2 user tạo dress cùng lúc, cả 2 count được cùng số → generate cùng item_code → 1 trong 2 sẽ bị unique violation error code `23505`. Thêm retry logic khi catch error 23505 cho trường hợp auto-gen (user không tự nhập code):

    if (error?.code === "23505" && !parsed.data.item_code?.trim()) {
      // Auto-gen conflict → retry with incremented number
      const retryCode = `${prefix}-${String((count || 0) + 2).padStart(3, "0")}`;
      const { data: retryData, error: retryErr } = await supabase
        .from("inventory_items")
        .insert({ ...insertData, item_code: retryCode })
        .select("id")
        .single();
      if (retryErr) throw new Error("Mã trang phục đã tồn tại, vui lòng thử lại");
      // continue with retryData.id
    }

Lưu ý: chỉ retry khi item_code là AUTO-GEN (user không tự nhập). Nếu user tự nhập mã trùng → vẫn báo lỗi bình thường.

## Verification
1. npx tsc --noEmit — zero errors
2. Test search: nhập `%` vào ô tìm kiếm → KHÔNG match tất cả
