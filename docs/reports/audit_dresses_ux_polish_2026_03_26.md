# 🏥 Audit Report — UX Polish Module /dresses

**Ngày:** 2026-03-26
**Scope:** Cursor pointer, hover states, interactive affordance  
**Files scanned:** 13 components, 3 CSS files

---

## Summary
- 🔴 Critical: **1** (drawer icon buttons thiếu cursor)
- 🟡 Warning: **0**
- 🟢 Suggestions: **3** (minor polish)

---

## 🔴 Critical — Drawer Icon Buttons thiếu `cursor-pointer`

**File:** `dress-drawer.tsx` L44-L59

**Vấn đề:** Nút Edit (bút chì) và QR trên drawer header dùng inline class `p-1.5 rounded-md hover:bg-hover transition-colors` — **THIẾU `cursor-pointer`**. Mouse hover hiện default arrow thay vì hand pointer.

**Root cause:** Không dùng token `btn-icon` có sẵn (đã có `cursor: pointer`). Viết inline class.

**Ảnh hưởng:** User không nhận ra đây là nút bấm được → UX confusion.

> Cùng pattern lỗi cũng tồn tại ở `contract-drawer.tsx` L92, L101 (ngoài scope /dresses).

**Fix:** Thêm `cursor-pointer` vào class, hoặc chuyển sang dùng `btn-icon` token.

---

## 🟢 Đã Kiểm Tra — PASS

| Component | Element | Token | Status |
|-----------|---------|-------|:------:|
| `dress-card.tsx` | Card toàn bộ | `card-interactive` (cursor:pointer) | ✅ |
| `dresses-list-client.tsx` | Toolbar buttons | `btn btn-outline` / `btn-primary` | ✅ |
| `dress-drawer-content.tsx` | Action buttons | `btn btn-primary` / `btn-ghost` | ✅ |
| `standalone-rentals-client.tsx` | Cards + table buttons | `card-interactive` / `btn-ghost` | ✅ |
| FAB | Mobile add button | `fab` token | ✅ |

---

## 🟢 Suggestions

| # | Suggestion | Effort |
|---|-----------|--------|
| S1 | Thêm global `button { cursor: pointer; }` CSS rule → fix toàn hệ thống | ~1 min |
| S2 | Verify drawer close button (X) cursor | ~2 min |
| S3 | Fix luôn `contract-drawer.tsx` cùng pattern | ~2 min |

---

## Next Steps

```
1️⃣ Fix ngay: dress-drawer.tsx + contract-drawer.tsx (thêm cursor-pointer)
2️⃣ Hoặc: Thêm global CSS rule button { cursor: pointer; }
3️⃣ /code — áp dụng fix
```
