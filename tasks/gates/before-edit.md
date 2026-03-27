# 🚧 GATE: Before Edit (MANDATORY)

> **BẮT BUỘC thực hiện TRƯỚC KHI edit BẤT KỲ file code nào.**
> Không tick đủ = KHÔNG ĐƯỢC EDIT CODE.

---

## ✅ Checklist (7 items — PHẢI TICK HẾT)

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

### 6. 🚪 MODAL & ANIMATION RULES (Lesson #81-82)
- [ ] Modal mới PHẢI dùng `openModal()` — KHÔNG tự render `modal-backdrop` trong component
- [ ] Animation keyframe `to` state PHẢI dùng `transform: none` — KHÔNG `translateY(0)` hoặc `scale(1)`

### 7. 📘 MODULE BLUEPRINT — CLONE, KHÔNG TỰ VIẾT (BẮT BUỘC)
- [ ] **Đã đọc `tasks/module-blueprint.md`** (1 file duy nhất — SSOT)
- [ ] **CLONE file structure** từ employees/contracts → đổi entity name → đổi data
- [ ] Filter bar **TÁCH FILE RIÊNG** `[module]-filters.tsx` (KHÔNG viết inline)
- [ ] Stats bar **TÁCH FILE RIÊNG** `[module]-stats-bar.tsx` dùng shared `<StatsBar>`
- [ ] Mobile: `<TabsFilter variant="pills">` + `<SelectPill>` (KHÔNG SearchBar trong status bar)
- [ ] Desktop: `<TabsFilter>` + pills nhóm phải với `lg:justify-between`
- [ ] Form: `<SelectForm>` + `<CurrencyInput>` + `.form-grid-2col` (KHÔNG SelectPill, KHÔNG inline grid)
- [ ] **DIFF kiểm tra** structure phải giống hệt Gold Standard source
- [ ] Nếu tạo **ACTION MỚI** → đã đọc `tasks/action-template.md`

### 8. 🗄️ SCHEMA TYPE CHECK — ABC Rule (nếu có DB migration)
- [ ] Column status/type/category mới thuộc Group nào? **A / B / C**
- [ ] **Group A (DB ENUM):** chỉ khi system-level, ≤5 values, bất biến (role, gender, payment_method)
- [ ] **Group B (VARCHAR + TS enum):** business logic, có thể mở rộng → **mặc định dùng cái này**
- [ ] **Group C (Lookup table):** user-managed runtime, ≥10 values, cần metadata
- [ ] Nếu Group B → DB dùng `VARCHAR(N)`, TS có `const array` + `z.enum()` validate
- [ ] ❌ **KHÔNG** `CREATE TYPE ... ENUM` cho business field (category, status, condition)
- [ ] Nếu KHÔNG chắc → mặc định **Group B** (an toàn nhất)

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
