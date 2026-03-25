# Phase 3: Update Gates & Enforcement

## CONTEXT
Phase 1 tạo `module-blueprint.md` (8 sections) ✅
Phase 2 tạo `action-template.md` (5 sections) ✅
Phase 3 = khóa lại: update gates để enforce responsive + build + lint checks.

## TASK 3.1 — Update `tasks/gates/after-edit.md`

### Layer 1: Thêm `npm run build` check
Hiện tại Layer 1 chỉ có `npm run dev`. Cần thêm:
```markdown
- [ ] `npm run build` — production build pass (catch lỗi dev mode bỏ qua)
```

### Layer 2: Thêm responsive verify
Hiện tại Layer 2 chỉ nói "screenshot UI" nhưng KHÔNG specify viewport.
Thêm 2 items:
```markdown
- [ ] Test ở **Desktop (1440px)** — layout grid, bảng đầy đủ
- [ ] Test ở **Mobile (375px)** — 1 cột, card view, FAB
```

### Layer 2: Thêm console check
```markdown
- [ ] Mở DevTools Console → không có `console.error` mới
```

### Red Flags: Thêm 2 items mới
```markdown
| Desktop OK nhưng chưa test mobile | Gap 8 |
| Action thiếu try-catch hoặc withAuth | action-template.md |
```

---

## TASK 3.2 — Update `tasks/gates/before-edit.md`

### Thêm reference đến module-blueprint + action-template
```markdown
- [ ] Nếu tạo MODULE MỚI → đã đọc `tasks/module-blueprint.md`
- [ ] Nếu tạo ACTION MỚI → đã đọc `tasks/action-template.md`
```

---

## LƯU Ý:
- KHÔNG thay đổi structure hiện tại của gates
- CHỈ THÊM items mới vào đúng vị trí (Layer 1, Layer 2, Red Flags)
- Giữ format checkbox `- [ ]` nhất quán
