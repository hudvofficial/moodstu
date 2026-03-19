# Phase 02: Section 1 — Thông tin Hợp đồng Grid

**Status:** ⬜ Pending
**Dependencies:** Phase 01
**Files:** `ContractInfoSection.tsx`

## Objective

Cải thiện grid layout của Section 1 cho mobile — hiện tại sm:grid-cols-3 khiến 
mobile bị 1-col toàn bộ. Stitch Mobile Premium dùng 2-col cho một số fields.

## Current State

```tsx
// Row 1: 3-col desktop, 1-col mobile
<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

// Row 2: 3-col desktop, 1-col mobile (nhưng chỉ 2-3 fields)
<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
```

## Changes

### Row 1: Loại GD + Loại DV → 2-col trên mobile
```diff
- <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
+ <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
```
**Lý do:** Stitch Mobile Premium layout cho "Loại giao dịch | Loại dịch vụ" trên cùng hàng.
Ngày hợp đồng tràn xuống hàng tiếp theo trên mobile (vì 3 items vào 2-col grid).

### Row 2: Dates — cũng 2-col trên mobile
```diff
- <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
+ <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
```
**Giữ nguyên** — Row 2 có fields conditional (delivery_date), 1-col mobile OK.

## Test Criteria
- [ ] Mobile: Row 1 hiện 2-col (Loại GD + Loại DV cạnh nhau, Ngày HĐ xuống hàng)
- [ ] Desktop: vẫn 3-col như cũ
- [ ] Không break layout khi delivery_date ẩn/hiện
- [ ] GroupedSelect + SimpleSelect không bị cắt

## Risk: THẤP
- Chỉ thay 1 class CSS
- Không ảnh hưởng logic
