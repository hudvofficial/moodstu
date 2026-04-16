# Plan: Fix Category Type Case Mismatch
Created: 2026-04-15 18:56
Status: 🟡 In Progress

## Overview
Bug: Bảng `transaction_categories` trong DB lưu `type = "chi"/"thu"` (viết thường),
nhưng **toàn bộ codebase** dùng `"Chi"/"Thu"` (viết Hoa đầu) để query và filter.
→ Dropdown danh mục trong form Phiếu thu/Phiếu chi luôn trống.

## Root Cause
- Form tạo danh mục gửi `type: "Chi"` (Hoa đầu) → nhưng DB lưu thành `"chi"` (thường)
- Có thể do DB trigger, migration seed, hoặc manual insert đã lowercase hóa data

## Impact Analysis (12 chỗ bị ảnh hưởng)

### Backend Actions (7 chỗ)
| File | Dòng | Filter | Ảnh hưởng |
|------|------|--------|-----------|
| `finance-operations-queries.ts` | 80,88 | `.eq("type", "Chi"/"Thu")` | Phiếu thu + Phiếu chi không load danh mục |
| `expense-actions.ts` | 266 | `.eq("type", "Chi")` | Phiếu chi auto-category fail |
| `payment-actions.ts` | 160 | `.eq("type", "Thu"/"Chi")` | Thanh toán không load danh mục |
| `printing-mutations.ts` | 49 | `.eq("type", "Chi")` | In ấn auto-expense fail |
| `goal-budget-actions.ts` | 272 | `.eq("type", "Chi")` | Ngân sách không load danh mục chi |
| `finance-category-actions.ts` | 12,25,65 | Type literal `"Thu"/"Chi"` | Tạo danh mục gửi Hoa đầu |

### Frontend Components (5 chỗ)
| File | Dòng | Filter | Ảnh hưởng |
|------|------|--------|-----------|
| `expense-form-modal.tsx` | 71 | `item.type === "Chi"` | Dropdown trống |
| `receipt-form-modal.tsx` | 104 | `item.type === "Thu"` | Dropdown trống |
| `category-form-modal.tsx` | 20-21 | `value: "Thu"/"Chi"` | Tạo mới gửi Hoa đầu |
| `categories-client.tsx` | 40-41,110 | `cacheKeys`, badge display | Hiển thị badge |
| `ledger-desktop-table.tsx` | 43 | Display text | Hiển thị label |

## Fix Strategy

> **Approach: Normalize DB data → Code giữ nguyên**
> Lý do: Code nhất quán 100% dùng "Chi"/"Thu". Fix 1 query SQL đơn giản hơn sửa 12 chỗ code.

### Phase 01: Normalize DB
- Chạy SQL `UPDATE transaction_categories SET type = 'Chi' WHERE type = 'chi'`
- Chạy SQL `UPDATE transaction_categories SET type = 'Thu' WHERE type = 'thu'`
- Verify bằng `SELECT DISTINCT type`

### Phase 02: Verify All Modules
- Mở Phiếu chi → check dropdown danh mục
- Mở Phiếu thu → check dropdown danh mục
- Mở Settings → check danh mục thu chi hiển thị đúng
- Mở Ngân sách → check category filter

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Code Fix for Category Case | ✅ Complete | 100% |
