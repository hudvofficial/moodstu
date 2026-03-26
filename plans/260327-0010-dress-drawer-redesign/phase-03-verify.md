# Phase 03: Verify + Build
Status: ⬜ Pending
Dependencies: Phase 02 (Layout done)

## Objective
Xác minh layout mới đúng Stitch + build clean + visual check.

## Steps

### 1. [ ] Build check
- `npm run build` — zero errors/warnings
- `npx tsc --noEmit` — TypeScript clean

### 2. [ ] Visual verification
- Mở browser → `/dresses` → click 1 dress → drawer mở
- Screenshot "after" layout
- So sánh "before" vs "after" vs Stitch HTML

### 3. [ ] Checklist visual
- [ ] Ảnh + info nằm cùng hàng (flex row) ✅
- [ ] Badges (mã + tình trạng) hiển thị inline ✅
- [ ] Grid 2 cột cho metadata (Category, Size, Color) ✅
- [ ] Giá thuê nổi bật (text-lg, bold, primary) ✅
- [ ] Notes card có bg tonal rounded-xl ✅
- [ ] 4 sections đều hiển thị đúng ✅

### 4. [ ] Update walkthrough
- Ghi lại kết quả verify vào walkthrough.md

## Output
- Build pass ✅
- Screenshot "after" lưu artifacts
- Walkthrough updated

---
Plan complete! 🎯
