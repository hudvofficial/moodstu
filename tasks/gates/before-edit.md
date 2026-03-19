# 🚧 GATE: Before Edit (MANDATORY)

> **BẮT BUỘC thực hiện TRƯỚC KHI edit BẤT KỲ file code nào.**
> Không tick đủ = KHÔNG ĐƯỢC EDIT CODE.

---

## ✅ Checklist (5 items — PHẢI TICK HẾT)

### 1. 👁️ SEE IT FIRST
- [ ] Đã mở browser + chạy dev server
- [ ] Đã screenshot UI **hiện tại** (trước khi sửa)

### 2. 🎯 COMPARE WITH DESIGN
- [ ] Đã so sánh UI hiện tại vs **Stitch mockup** (nếu có)
- [ ] Đã ghi ra **danh sách sai lệch** visual (spacing, color, font, layout)
- [ ] Nếu KHÔNG có Stitch → ghi rõ "Không có Stitch cho trang này"

### 3. 🏗️ CHECK SSOT CLASSES
- [ ] Đã đọc `design-system.css` → list classes dùng được
- [ ] Đã grep `components/ui/` → list shared components có sẵn
- [ ] KHÔNG viết inline nếu SSOT class đã tồn tại

### 4. 📋 PLAN BEFORE FIX
- [ ] Đã viết plan (dù ngắn) liệt kê: file nào → sửa gì
- [ ] Anh (user) đã **duyệt plan** trước khi code

### 5. 🧠 READ LESSONS
- [ ] Đã đọc `tasks/lessons.md` (scan nhanh relevant entries)
- [ ] Đã đọc `tasks/pre-code-checklist.md`

---

## ❌ DỪNG LẠI NẾU:
- Chưa mở browser xem UI thực tế → **DỪNG**
- Chưa so sánh vs Stitch design → **DỪNG**
- Chưa có plan được duyệt → **DỪNG**
- Đang "hưng phấn" muốn fix ngay → **DỪNG, hít thở, plan trước**

---

## 🔑 Nguyên tắc cốt lõi

> **"Đúng class" ≠ "Đúng design"**
>
> Grep code tìm inline violations chỉ là step 1.
> Step 0 là MỞ UI LÊN XEM + SO VỚI STITCH.
> Nếu skip step 0 → fix mù → fix sai.
