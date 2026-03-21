# Plan: Tối ưu Hiển thị Cô Dâu & Chú Rể — Kết hợp Stitch + Mood V2
Created: 2026-03-20T21:36:00+07:00
Updated: 2026-03-20T23:30:00+07:00
Status: 🟡 In Progress

## Context
- Stitch design: Dâu/rể là 2 field đơn giản trong grid chung "Thông tin hợp đồng"
- Mood V2 hiện tại: Couple Card riêng biệt (hearts, bg kem, tách biệt)
- Hướng đi: **KẾT HỢP** — lấy sự gọn gàng của Stitch + vị trí trong customer section của Mood V2

## Phase Summary

| Phase | Name | Status | 
|-------|------|--------|
| 01 | ✅ Backend data (SELECT bride/groom) | ✅ Done |
| 02 | ✅ Props truyền xuống component | ✅ Done |
| 03 | 🟡 UI: Sửa Couple Card → Clean Grid Style | 🟡 Current |

---

## Phase 01: Backend — ✅ DONE
- [x] `getContracts()` — thêm bride/groom vào customers select
- [x] `getContractById()` — thêm bride/groom + measurements vào select
- [x] Props truyền từ contract-detail-client → customer-info-block

## Phase 02: Props — ✅ DONE
- [x] CustomerInfoBlock nhận props: brideHeight, brideWeight, brideShoeSize, etc.
- [x] contract-detail-client truyền đúng data

## Phase 03: UI — Clean Grid Style (🟡 CURRENT)

### Mục tiêu
Thay thế Couple Card (hearts, bg kem) bằng 2 field đơn giản dạng `ContactRow`, 
nằm side-by-side 2 cột, cùng style với phone/email/address.

### Stitch Reference (SSOT)
```html
<!-- Line 187-194: stitch-contract-detail.html -->
<p class="text-xs text-slate-400 uppercase tracking-wider mb-1">Cô dâu</p>
<p class="text-sm font-medium">Ngọc Lan — 160cm, 50kg, giày 37</p>

<p class="text-xs text-slate-400 uppercase tracking-wider mb-1">Chú rể</p>
<p class="text-sm font-medium">Gia A — 175cm, 65kg, giày 42</p>
```

### Tasks
- [ ] **Task 3a**: Xóa Couple Card (heart icons, bg-[#FAF7F2], rounded-2xl)
- [ ] **Task 3b**: Thay bằng 2 `ContactRow` nằm trong grid 2 cột
  - Icon: `Heart` (nhỏ, muted) hoặc không icon — tuỳ anh
  - Label: "Cô dâu" / "Chú rể" 
  - Value: `Tên — chiều cao, cân nặng, giày size`
  - Format: dùng em-dash `—` và dấu phẩy `,` (theo Stitch)
- [ ] **Task 3c**: SĐT riêng (nếu có) hiện dòng phụ, text-primary
- [ ] **Task 3d**: Verify trên browser — đúng style, gọn gàng

### Files cần sửa
- `components/contracts/detail/customer-info-block.tsx` — ONLY FILE

### Verify
- [ ] Mở localhost → thấy dâu/rể dạng ContactRow, cùng style phone/email
- [ ] Format: "Y Linh — 155cm, 50kg, giày 39"
- [ ] Side-by-side 2 cột
- [ ] SĐT chú rể hiện nếu có
- [ ] Không bride/groom → ẩn (không crash)
