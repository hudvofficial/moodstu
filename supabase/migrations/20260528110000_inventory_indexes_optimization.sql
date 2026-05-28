-- Khởi tạo các Index tối ưu tốc độ cho phân hệ Inventory (Kho vật tư)
-- Giúp giảm tải DB khi fetch list, filter và thống kê số liệu.

-- 1. Tối ưu cho bảng inventory_items
-- Lọc theo trạng thái và ngày xoá (Dùng trong inventory_list và inventory_stats)
CREATE INDEX IF NOT EXISTS idx_inventory_items_status_deleted 
ON public.inventory_items (status, deleted_at);

-- Lọc theo danh mục (Dùng trong inventory_list)
CREATE INDEX IF NOT EXISTS idx_inventory_items_category 
ON public.inventory_items (category) 
WHERE deleted_at IS NULL;

-- 2. Tối ưu cho bảng inventory_transactions
-- Đếm giao dịch trong tháng (Dùng trong inventory_stats)
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at 
ON public.inventory_transactions (created_at);

-- Lọc theo loại giao dịch
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type 
ON public.inventory_transactions (transaction_type);

-- Lấy lịch sử theo sản phẩm (Dùng trong trang chi tiết sản phẩm)
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id 
ON public.inventory_transactions (item_id);

-- Lấy lịch sử giao dịch phát sinh con (Dùng khi tính toán order fulfillments)
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_parent_id 
ON public.inventory_transactions (parent_transaction_id)
WHERE parent_transaction_id IS NOT NULL;
