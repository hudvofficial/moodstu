-- Gộp ô "Mô tả" (description) vào "Ghi chú nội bộ" (notes) — 1 ô duy nhất, KHÔNG in.
--
-- BỐI CẢNH (đo trên chính DB này 2026-07-23, 48 hợp đồng):
--   notes       : 0 hàng có dữ liệu  ← đây LẠI là ô đang được in ra hợp đồng khách
--   description : 3 hàng có dữ liệu  ← ô KHÔNG hiển thị ở đâu cả, nhưng là ô mọi người thật sự dùng
--   cả hai      : 0 hàng             ← nên copy thẳng, không lo ghi đè
--
-- Nội dung 3 hàng đó cho thấy người dùng coi ô này là SỔ TAY NỘI BỘ:
--   HĐ-2026-0026  "https://www.facebook.com/siem.thi.96"   (link tra khách)
--   HĐ-2026-0027  "Khách đen"                              (ghi chú nước da cho trang điểm/hậu kỳ)
--   HĐ-2026-0042  "Trừ áo cưới."                           (điều khoản — chỗ đúng là hạng mục dịch vụ)
--
-- Vì vậy ô gộp KHÔNG in: commit này gỡ luôn dòng in `contract.notes` khỏi
-- components/contracts/print/contract-template.tsx. An toàn tuyệt đối vì 0/48 hàng có notes
-- → không bản in cũ nào đổi nội dung.
--
-- Cột `description` GIỮ NGUYÊN trong schema (không DROP): dữ liệu gốc còn đó để đối chiếu.
-- Code thôi không đọc/ghi nó nữa.

UPDATE contracts
SET    notes = description
WHERE  description IS NOT NULL
  AND  btrim(description) <> ''
  AND  (notes IS NULL OR btrim(notes) = '');
