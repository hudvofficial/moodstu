# Plan: Fix ComboboxSearch — Inline Scrollable List
Created: 2026-03-28
Status: 🟡 In Progress

## Overview
Refactor `ComboboxSearch` từ `createPortal` dropdown overlay → inline scrollable list.
Giải quyết triệt để lỗi dropdown không hiển thị trong modal.

## Root Cause
```
.modal-card { overflow: hidden; will-change: transform }
  → Nhốt position:fixed lẫn position:absolute
  → createPortal bị React Compiler + Turbopack cache
```

## Solution: Inline List (Option C từ Audit)
- Bỏ `createPortal`, bỏ `position: fixed/absolute`
- List kết quả render trong **normal document flow**
- Modal-body tự scroll → KHÔNG bị clip

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Refactor ComboboxSearch | ✅ Complete | 100% |
| 02 | UX: Search Autocomplete | ✅ Complete | 100% |

---

# Phase 02: UX: Search Autocomplete
- **Tình trạng:**
  - 🔍 Icon search `Search` tự động ẩn khi input được `focus`.
  - ⌨️ Kết quả (`Dropdown list`) chỉ xuất hiện khi `query.length > 0` (user bắt đầu gõ có data).
  - ✅ Ngăn chặn việc list bị xổ dài ngay khi vừa focus. Mượt mà, chống giật UI.
  - 🔄 Đã cập nhật `isFocused` state để handle icon toggle.

---

# Phase 01: Refactor ComboboxSearch

## Files to Modify
- `components/ui/combobox-search.tsx` — **REWRITE**

## Files NOT Modified
- `components/inventory/stock-in-modal.tsx` — interface giữ nguyên
- `app/styles/components.css` — KHÔNG đụng modal overflow

## Implementation Steps

### Step 1: Remove imports & portal logic
- [ ] Bỏ `import { createPortal } from "react-dom"`
- [ ] Bỏ state `dropdownPos` (không cần tính position nữa)
- [ ] Bỏ `useLayoutEffect` tính position
- [ ] Bỏ `DropdownPortal` component

### Step 2: Inline list JSX (tham khảo Contract pattern)
- [ ] Container: `<div className="relative w-full">`
- [ ] Input trigger: giữ nguyên (search icon + input + clear + chevron)
- [ ] List: `{isOpen && <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border ...">}`
  - Nằm trong normal flow (KHÔNG dùng absolute/fixed)
  - `max-h-48` + `overflow-y: auto` cho scroll riêng
  - Background: `bg-bg-card`, border: `border`, shadow: `shadow-md`
  - Items: `<button>` giống pattern Contract
- [ ] Empty state: "Không tìm thấy kết quả"

### Step 3: Keep existing logic
- [ ] Giữ nguyên: `filtered` (search logic)
- [ ] Giữ nguyên: `handleKeyDown` (keyboard navigation)
- [ ] Giữ nguyên: `selectItem` callback
- [ ] Giữ nguyên: `handleClear`
- [ ] Close on click outside: simplify (chỉ check containerRef)

### Step 4: Verify
- [ ] Kill port 3000 + xóa .next + restart dev
- [ ] Mở browser → /inventory → Nhập kho → type "a"
- [ ] Dropdown list hiển thị bên dưới input
- [ ] Click item → chọn được → form fields hiện
- [ ] Keyboard: Arrow + Enter work

## Interface Contract (KHÔNG ĐỔI)
```tsx
interface ComboboxSearchProps {
  options: ComboboxOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}
```

## Test Criteria
- [ ] Dropdown hiển thị khi click input hoặc type
- [ ] Filter hoạt động (type "a" → chỉ hiện items chứa "a")
- [ ] Chọn item → input hiện tên item, gọi onChange
- [ ] Clear → reset về trống
- [ ] Keyboard navigation (↑↓ Enter Escape)
- [ ] Click outside → đóng list
- [ ] List scroll khi nhiều items
