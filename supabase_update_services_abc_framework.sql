-- 1. Chuyển đổi service_type từ ENUM -> TEXT
-- LƯU Ý: Phải CAST kiểu dữ liệu cũ (ENUM) sang TEXT
ALTER TABLE services 
  ALTER COLUMN service_type TYPE TEXT 
  USING service_type::text;

-- 2. Thêm các cột cho UI V2 Form (ABC Framework)
ALTER TABLE services 
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'dich_vu',
  ADD COLUMN IF NOT EXISTS fulfillment_type TEXT DEFAULT 'single';

-- 3. Thêm các cột Auditing & Soft Delete
ALTER TABLE services 
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
  
-- 4. Đồng bộ hóa dữ liệu cũ (Backfill)
UPDATE services 
SET 
  unit = 'dich_vu',
  fulfillment_type = 'single'
WHERE unit IS NULL OR fulfillment_type IS NULL;

-- 5. (Tùy chọn) Xóa bỏ ENUM cũ nếu không còn bảng nào dùng:
-- DROP TYPE IF EXISTS public.service_type_enum;
