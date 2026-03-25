# 🛡️ GATE: After Edit (MANDATORY — Trước khi báo "DONE")

> **BẮT BUỘC thực hiện SAU KHI code xong, TRƯỚC KHI báo user "done".**
> Không tick đủ = KHÔNG ĐƯỢC NÓI "DONE" hoặc "HOÀN TẤT".

---

## ✅ Layer 1: Build & Type Safety

- [ ] `npm run dev` — không compile error
- [ ] `npm run build` — production build pass (catch lỗi dev mode bỏ qua)
- [ ] Không có TypeScript `any` mới (grep `any` trong files vừa sửa)
- [ ] Không có `eslint-disable` mới (trừ có lý do rõ ràng + comment)

## ✅ Layer 2: Visual Verification (UI)

- [ ] Mở browser → navigate đến trang vừa sửa
- [ ] Screenshot UI **sau** khi sửa
- [ ] So sánh **trước vs sau** → không regression visual
- [ ] Nếu có Stitch → so sánh **sau vs Stitch** → khớp design
- [ ] Test ở **Desktop (1440px)** — layout grid, bảng đầy đủ
- [ ] Test ở **Mobile (375px)** — 1 cột, card view, FAB
- [ ] Mở DevTools Console → không có `console.error` mới

## ✅ Layer 3: Business Logic

- [ ] Data hiển thị đúng (tên, số tiền, trạng thái, ngày tháng)
- [ ] Hành động CRUD hoạt động (tạo/sửa/xóa nếu liên quan)
- [ ] Enum/constant dùng **snake_case DB** (KHÔNG tiếng Việt) — Lesson #65
- [ ] FK references đúng bảng (`auth.users` cho `*_by`) — Lesson #72
- [ ] Currency format đồng bộ (input + output đều qua `formatCurrency`) — Lesson #75

## ✅ Layer 4: Side-Effects & Blast Radius

- [ ] Grep **tất cả files** import/dùng component vừa sửa → không break
- [ ] Nếu đổi ID/name/enum → grep toàn codebase tìm ref cũ — Lesson #52, #73
- [ ] Nếu sửa shared component → test ≥2 trang dùng nó
- [ ] Nếu sửa CSS token → check các component dùng token đó

## ✅ Layer 5: SSOT Compliance

- [ ] Không viết inline class khi đã có SSOT token — Lesson #67
- [ ] Không dùng native `<select>` khi có `<SelectForm>` — Phase 3 standard
- [ ] Mọi component mới = FC + Hooks (KHÔNG class component)
- [ ] Logic phức tạp đặt trong `actions/` hoặc `utils/` (KHÔNG trong component)

---

## ❌ RED FLAGS — Nếu thấy bất kỳ cái nào, DỪNG + FIX:

| Red Flag | Lesson |
|----------|--------|
| Fix 1 file nhưng cùng pattern lỗi còn ở file khác | #73 |
| Compile OK nhưng chưa mở browser xem | #69 |
| Dùng `any` hoặc type assertion `as any` | Checklist |
| Inline Tailwind mà token đã tồn tại | #67 |
| Sửa shared component mà chỉ test 1 trang | #52 |
| Báo "done" mà chưa screenshot sau khi sửa | V-GATE |
| Desktop OK nhưng chưa test mobile (375px) | Gap 8 |
| Action mới thiếu try-catch hoặc withAuth | action-template.md |

---

## 🔑 Nguyên tắc

> **"Compile OK ≠ Done"**
>
> Build pass chỉ là Layer 1/5.
> Phải verify visual + logic + side-effects + SSOT trước khi giao.
