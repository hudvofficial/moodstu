# 🏥 FULL Audit Report: Mobile Contract Detail vs Stitch SSOT
**Date:** 2026-03-18
**Scope:** 1:1 visual comparison — TOÀN BỘ trang mobile 375px, từ trên xuống dưới
**Stitch Screen:** `16c286beb8df4ebab01a1541c59ee273`

---

## Summary
- 🔴 Critical Issues: 3
- 🟡 Warnings: 5
- 🟢 OK (đã khớp): 6

---

## So sánh 1:1 — Từ trên xuống dưới

### 1️⃣ HEADER (sticky bar)
| Property | Stitch | Code | Match? |
|----------|--------|------|--------|
| Layout | ← [Mã HĐ centered] ⋯ | ← [Mã HĐ centered] ⋯ | ✅ |
| Height | ~56px | `h-14` (56px) | ✅ |
| Background | Solid white 100% | `bg-bg-primary` | ✅ (đã fix) |
| Font weight | Semibold (600) | `font-bold` (700) | 🔴 → `font-semibold` |
| Behavior: auto-hide | Ẩn khi scroll down | `sticky` trong overflow container | 🔴 Bị "hở" |
| Shadow | Subtle bottom shadow | `shadow-xs` | ✅ |

**🔴 CRITICAL #1: Header gap**
- Root cause: `sticky` trong `overflow-y-auto` → `translate-y: -100%` để gap
- Fix: Đổi sang `fixed top-0 left-0 right-0` + thêm spacer `pt-14`

**🔴 CRITICAL #2: Font weight**
- `font-bold` (700) → `font-semibold` (600) theo Stitch

---

### 2️⃣ BADGES + CUSTOMER NAME (SummaryCard mobile)
| Property | Stitch | Code | Match? |
|----------|--------|------|--------|
| Badge status | ĐÃ CỌC (cam) pill | ✅ pill + dot color | ✅ |
| Badge service | CƯỚI (xám) pill | ✅ `bg-slate-100` | ✅ |
| Customer name | Bold, text-xl | `text-xl font-bold` | ✅ |
| Spacing | gap-2 giữa badges, mb-3 trước name | gap-2, mb-3 | ✅ |

**Verdict: ✅ OK — khớp Stitch**

---

### 3️⃣ FINANCIAL DASHBOARD (FinancialDashboard mobile)
| Property | Stitch | Code | Match? |
|----------|--------|------|--------|
| Title | "TỔNG GIÁ TRỊ HỢP ĐỒNG" uppercase muted | ✅ | ✅ |
| Amount | 25.000.000₫ bold lớn | ✅ | ✅ |
| Progress bar | Cam, full width | ✅ | ✅ |
| Labels | "ĐÃ THU" / "CÒN NỢ" | ✅ | ✅ |
| Thu tiền button | Orange full-width rounded-xl | ✅ `bg-interactive` | ✅ |
| Card bg | Tách biệt, có shadow | card-base | ✅ |

**Verdict: ✅ OK — khớp Stitch**

---

### 4️⃣ WORKFLOW STEPPER (Mobile dots)
| Property | Stitch | Code | Match? |
|----------|--------|------|--------|
| Title | "TIẾN ĐỘ THỰC HIỆN" uppercase | ✅ uppercase tracking-widest | ✅ |
| Right label | "Bước 1/6" cam | ✅ text-interactive | ✅ |
| Dots style | Cam for completed, xanh lá ✅ for done | Xanh lá (emerald) completed, cam interactive current | 🟡 |
| Connecting line | Thin line giữa dots | ✅ 2px line | ✅ |
| Labels | 9px text dưới mỗi dot | ✅ `fontSize: 9px` | ✅ |

**🟡 WARNING #1: Màu dots**
- Stitch: dots completed = cam/nâu đậm, current = cam ring
- Code: completed = `bg-emerald-500`, current = `bg-interactive` ring
- Stitch rõ ràng dùng **cam đồng nhất** cho cả completed + current, không phải xanh lá
- Fix: `bg-emerald-500` → `bg-interactive` cho completed dots, line cũng → `bg-interactive`

---

### 5️⃣ TAB NAV (MobileTabNav)
| Property | Stitch | Code | Match? |
|----------|--------|------|--------|
| Layout | Scroll ngang, pills | ✅ flex gap-2 overflow-x-auto | ✅ |
| Active style | Cam bg, white text | ✅ `bg-interactive text-white` | ✅ |
| Inactive style | Light bg, muted text | ✅ `bg-bg-card text-text-secondary` | ✅ |
| Font | Bold | ✅ font-bold | ✅ |
| Sticky | Sticky dưới header | `sticky top-14` | 🔴 Cần update |
| Background | Solid | `bg-bg-primary/95 backdrop-blur-sm` | 🟡 Nên 100% |
| Tab labels | Chi tiết, Lịch trình, In ấn, Checkout | Chi tiết, Lịch trình, In ấn, Checklist, Thao tác | 🟡 |
| Scroll offset | Scroll to section | Dùng `window.scrollY` | 🔴 Phải dùng `#main-scroll` |

**🔴 CRITICAL #3: MobileTabNav scroll logic dùng `window.scrollY`**
- Line 32: `el.getBoundingClientRect().top + window.scrollY` → SAI
- Line 33: `window.scrollTo(...)` → SAI, phải dùng `scrollEl.scrollTop` + `scrollEl.scrollTo()`
- Giống bug header, scroll container là `#main-scroll` không phải `window`

**🟡 WARNING #2: Tab background opacity**
- `bg-bg-primary/95 backdrop-blur-sm` → nên `bg-bg-primary` (solid 100%)

**🟡 WARNING #3: Tab labels khác Stitch**
- Stitch: 4 tabs `Chi tiết | Lịch trình | In ấn | Checkout`
- Code: 5 tabs `Chi tiết | Lịch trình | In ấn | Checklist | Thao tác`
- Cần xác nhận: giữ 5 tabs hay về 4 tabs theo Stitch?

**🟡 WARNING #4: Sticky position khi header chuyển fixed**
- Hiện `sticky top-14` — nếu header đổi sang `fixed`, cần verify tab nav cũng hoạt động đúng
- Tab nav cũng nên `fixed` hoặc `sticky` vẫn work vì nó trong scroll container

---

### 6️⃣ EVENT TIMELINE
| Property | Stitch | Code | Match? |
|----------|--------|------|--------|
| Title | "LỊCH TRÌNH SỰ KIỆN" + "Xem tất cả" | ✅ | ✅ |
| Event card | Tên event, date, location | ✅ | ✅ |
| Empty state | Calendar icon + text | ✅ | ✅ |

**Verdict: ✅ OK**

---

### 7️⃣ PRINT ORDERS (ĐƠN HÀNG IN ẤN)
| Property | Stitch | Code | Match? |
|----------|--------|------|--------|
| Title | "Đơn hàng in ấn" | ✅ | ✅ |
| Card content | Album name, lab, order code | ✅ | ✅ |
| Empty state | Printer icon + text | ✅ | ✅ |

**Verdict: ✅ OK**

---

### 8️⃣ CHECKLIST
| Property | Stitch | Code | Match? |
|----------|--------|------|--------|
| Title | "Checklist công việc" | ✅ "Checklist" | ✅ |
| Sub-tabs | Chụp, Ảnh, Phòng (Stitch) | Tất cả, Cần làm, Xong | 🟡 |
| Progress | 0/0 counter | ✅ | ✅ |
| Empty state | Checkbox icon + text | ✅ | ✅ |

**🟡 WARNING #5: Checklist sub-tabs khác Stitch**  
- Stitch: tabs theo task category (Chụp, Ảnh, Phòng)
- Code: tabs theo status (Tất cả, Cần làm, Xong)
- Cần xác nhận: giữ filter by status hay đổi sang filter by category?

---

### 9️⃣ QUICK ACTIONS
| Property | Stitch | Code | Match? |
|----------|--------|------|--------|
| Title | "THAO TÁC NHANH" uppercase | ✅ uppercase tracking-wider | ✅ |
| Grid | 2 cols × 3 rows | ✅ grid-cols-2 | ✅ |
| Icon style | Monochrome cam/nâu (Stitch) | Rainbow (user requested) | ✅ Giữ rainbow |
| Card style | No outer card (mobile) | ✅ no card wrapper | ✅ |
| Hover | Active scale | ✅ active:scale-[0.96] | ✅ |

**Verdict: ✅ OK (rainbow giữ theo yêu cầu user)**

---

### 🔟 BOTTOM BAR (MobileBottomBar)
| Property | Stitch | Code | Match? |
|----------|--------|------|--------|
| Layout | 2 buttons: Sửa + Thu tiền | ✅ | ✅ |
| Sửa | Ghost/outline style | ✅ outline text-only | ✅ |
| Thu tiền | Primary cam | ✅ bg-interactive | ✅ |
| Position | Fixed bottom | ✅ fixed bottom-0 | ✅ |
| Background | Solid | `bg-bg-primary/95` | 🟡 Nên 100% |

**🟡 Bottom bar cũng dùng `/95` → nên đổi solid**

---

## 📋 FULL ACTION PLAN — 3 Phases

### Phase 1: Fix Header + TokenChung (Critical)
| # | Task | File | Priority |
|---|------|------|----------|
| 1.1 | Khai CSS token `--header-mobile-h: 56px` | `design-system.css` | 🟢 |
| 1.2 | Mobile header: `sticky` → `fixed`, `font-bold` → `font-semibold` | `top-action-bar.tsx` | 🔴 |
| 1.3 | Thêm spacer `pt-14` cho mobile content | `contract-detail-client.tsx` | 🔴 |

### Phase 2: Fix MobileTabNav scroll + opacity (Critical)
| # | Task | File | Priority |
|---|------|------|----------|
| 2.1 | `window.scrollY` → `#main-scroll.scrollTop` | `mobile-tab-nav.tsx` L32-33 | 🔴 |
| 2.2 | `bg-bg-primary/95 backdrop-blur-sm` → `bg-bg-primary` | `mobile-tab-nav.tsx` L64 | 🟡 |
| 2.3 | Verify sticky position sau khi header đổi fixed | `mobile-tab-nav.tsx` | 🟡 |

### Phase 3: Style refinements (Warning)
| # | Task | File | Priority |
|---|------|------|----------|
| 3.1 | Workflow dots: `emerald-500` → `interactive` | `workflow-stepper.tsx` | 🟡 |
| 3.2 | Bottom bar: `bg-bg-primary/95` → `bg-bg-primary` | `mobile-bottom-bar.tsx` L26 | 🟡 |

### Cần xác nhận từ anh:
| # | Câu hỏi | Options |
|---|---------|---------|
| Q1 | Tab labels: giữ 5 tabs hay về 4 theo Stitch? | 4 tabs / 5 tabs |
| Q2 | Checklist sub-tabs: filter by status hay category? | Status / Category |
