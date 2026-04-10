# Phase 03: LeadCareLog → Compact Mode
Status: ✅ Completed
Dependencies: Phase 01 + SSOT Lookup Table (plan.md)

## Objective
Nén `lead-care-log.tsx` từ form khổng lồ (~40% viewport) thành dạng Compact Chat-like — **dùng SSOT tokens**.

## ⚠️ SSOT ENFORCEMENT
> Input: `input-base`. Label: `label-base`. Button: `<Button>`. KHÔNG inline.

---

## Checklist Thay Đổi

### 1. Compact Input Bar
- [ ] **Thay** Textarea 3 rows → Input 1 dòng (`input-base` + `h-10`) + nút Send icon tròn
  - ❌ Xoá: `<Textarea rows={3} className="w-full resize-none text-base sm:text-sm bg-surface">` (L76-82)
  - ❌ Xoá: `style={{ fontSize: '16px' }}` inline (L82) — sử dụng `text-base` class
  - ✅ Dùng: `<Input className="input-base" placeholder="..." />` hoặc Textarea 1 row auto-expand
- [ ] **Auto-expand khi focus**: `rows=1` → `rows=3` on focus (CSS transition `max-height`)

### 2. Select Type → Compact
- [ ] **Giảm kích thước** SelectForm — giữ lại nhưng nằm cùng dòng với input
  - Layout: `[SelectForm compact] [Input expanding] [Send btn]`
- [ ] Hoặc ẩn vào dropdown icon nếu quá chật

### 3. Section Label → SSOT
- [ ] ❌ Xoá: `className="text-xs font-semibold text-text-muted uppercase tracking-wider"` inline (L65)
- [ ] ✅ Dùng: `className="label-base"` **(SSOT token)** hoặc `section-title`

### 4. Form Container → SSOT
- [ ] Kiểm tra `border border-border/50` → OK (Lesson #64: V2 dùng shadow, nhưng container section cho phép border nhẹ)
- [ ] Giữ `shadow-xs rounded-xl` → OK

### 5. SWR Mutate → Đã OK
- [ ] `globalMutate(cacheKeys.leadDetail(leadId))` — ✅ đã chuẩn SSOT

### 6. Timeline History
- [ ] Giữ nguyên timeline dot layout (đã OK)
- [ ] Nếu > 5 entries → collapse, hiện nút "Xem thêm"

---

## Files to Modify
- `components/crm/lead-care-log.tsx` — Compact refactor

## SSOT Violation Checklist (POST-WRITE grep)
```bash
grep "style={{" lead-care-log.tsx
# Kết quả PHẢI = 0 matches (ban đầu có 1: fontSize inline)
```

## Test Criteria
- [ ] Form input chiếm ≤ 60px cao khi chưa focus
- [ ] Khi focus: mở rộng mượt (transition)
- [ ] Gửi log hoạt động (SWR mutate OK)
- [ ] Label dùng `label-base`, KHÔNG inline
- [ ] ESLint: 0 errors, 0 warnings

---
Next Phase: phase-04-verify.md
