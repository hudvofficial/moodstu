# PLAN: Tablet Table — Row Distinction + Remove Borders

**Date:** 2026-06-20  
**Lead:** Claude (planning + review)  
**Coder:** Codex  
**Status:** 🔴 TODO

---

## Bối cảnh & Vấn đề

Playwright đo @834px (iPad):
- `scrollWidth` = 800, `clientWidth` = 764 → overflow chỉ 36px
- `group-even:bg-bg-base/40` chỉ apply trên 2 sticky cells, **không apply 3 TD giữa** → rows trông như nhau
- Sticky cells có `border-r border-border` / `border-l border-border` — vi phạm mood design system (no borders)

## Mục tiêu

1. Xóa border trên sticky cells
2. Extend zebra stripe ra tất cả TD (stripe mạnh hơn: `/60` thay `/40`)
3. Thêm service color accent strip bên trái mỗi row → row có màu sắc theo loại dịch vụ
4. Thu nhỏ status column `w-[238px]` → `w-[200px]` → xóa 36px overflow, fit vừa 764px

**File duy nhất cần sửa:** `components/contracts/contracts-tablet-table.tsx`

---

## TASK 1 — Sticky left cell: xóa border, thêm strip, upgrade stripe

**Tìm (lines ~103–105):**
```tsx
<TD className="sticky left-0 z-10 w-[124px] bg-surface group-even:bg-bg-base/40 group-hover:bg-bg-hover transition-colors py-4 px-3 font-semibold text-text-main border-r border-border">
  <span className="block truncate">{getStr(c, "contract_code")}</span>
</TD>
```

**Thay thành:**
```tsx
<TD className="sticky left-0 z-10 w-[124px] relative bg-surface group-even:bg-bg-base/60 group-hover:bg-bg-hover transition-colors py-4 px-3 font-semibold text-text-main">
  <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${serviceBadge.bg}`} />
  <span className="block truncate pl-1">{getStr(c, "contract_code")}</span>
</TD>
```

**Thay đổi:**
- Xóa `border-r border-border`
- `group-even:bg-bg-base/40` → `group-even:bg-bg-base/60`
- Thêm `relative` để position strip
- Thêm `<div>` strip màu service (3px, rounded, dùng `serviceBadge.bg`)
- Thêm `pl-1` vào span để text không đè strip

---

## TASK 2 — 3 TD giữa: extend zebra + resize status col

**Tìm (line ~106):**
```tsx
<TD className="w-[220px] py-4 px-3">
```
**Thay thành:**
```tsx
<TD className="w-[220px] py-4 px-3 group-even:bg-bg-base/60 group-hover:bg-bg-hover transition-colors">
```

**Tìm (line ~124):**
```tsx
<TD className="w-[170px] py-4 px-3 text-right">
```
**Thay thành:**
```tsx
<TD className="w-[170px] py-4 px-3 text-right group-even:bg-bg-base/60 group-hover:bg-bg-hover transition-colors">
```

**Tìm (line ~132):**
```tsx
<TD className="w-[238px] py-3 px-3">
```
**Thay thành:**
```tsx
<TD className="w-[200px] py-3 px-3 group-even:bg-bg-base/60 group-hover:bg-bg-hover transition-colors">
```

---

## TASK 3 — Sticky right cell: xóa border, upgrade stripe

**Tìm (line ~135):**
```tsx
<TD className="sticky right-0 z-10 w-[48px] bg-surface group-even:bg-bg-base/40 group-hover:bg-bg-hover transition-colors py-3 px-2 text-center border-l border-border">
```
**Thay thành:**
```tsx
<TD className="sticky right-0 z-10 w-[48px] bg-surface group-even:bg-bg-base/60 group-hover:bg-bg-hover transition-colors py-3 px-2 text-center">
```

**Thay đổi:**
- Xóa `border-l border-border`
- `group-even:bg-bg-base/40` → `group-even:bg-bg-base/60`

---

## Verify (tổng cộng 3 column widths sau sửa)

| Column | Width |
|--------|-------|
| Strip | 3px (inside sticky left) |
| Sticky left (contract code) | 124px |
| Customer | 220px |
| Amount | 170px |
| Status | 200px |
| Sticky right (chevron) | 48px |
| **Total** | **762px** ≤ clientWidth 764px ✅ |

---

## Review Checklist (Claude verify sau Codex)

- [ ] T1: Không còn `border-r border-border` trên sticky left TD
- [ ] T1: `serviceBadge.bg` strip hiện đúng màu theo service type
- [ ] T2: Cả 3 TD giữa có `group-even:bg-bg-base/60`
- [ ] T2: Status column = `w-[200px]`
- [ ] T3: Không còn `border-l border-border` trên sticky right TD
- [ ] Playwright @834px: `scrollWidth` ≤ `clientWidth` (không còn horizontal scroll)
- [ ] Playwright @834px: even rows rõ ràng khác odd rows
- [ ] `pnpm build` pass, 0 error

---

## Ghi chú cho Codex

- Chỉ sửa **1 file**: `components/contracts/contracts-tablet-table.tsx`
- `serviceBadge` đã có sẵn ở scope của `TabletTableRow` (line ~93) — không cần thêm import hay biến mới
- KHÔNG sửa `MobileCardRow`, `DesktopTable`, hay bất kỳ file nào khác
- KHÔNG đổi `estimateSize` trong virtualizer (vẫn = 64 cho `h-16`)
