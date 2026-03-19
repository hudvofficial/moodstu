# V2 Design System — CSS Classes Reference

> **SSOT file:** `app/design-system.css`
> **Tokens file:** `app/globals.css` `@theme` block

---

## 📝 Typography

| Class | Khi nào dùng | Size | Weight |
|-------|-------------|------|--------|
| `.text-display` | Hero sections | 36px (responsive) | 700 |
| `.text-h1` | Page title (Dashboard, CRM) | 28px (responsive) | 600 |
| `.text-h2` | Section title, stat values | 22px (responsive) | 600 |
| `.text-h3` | Card title, modal title, names | 18px | 600 |
| `.text-body` | Content text | 16px | 400 |
| `.text-body-sm` | Secondary content | 14px | 400 |
| `.text-caption` | Timestamps, footnotes | 12px | 400 |
| `.text-label` | Form labels, stat labels | 13px | 500 |
| `.text-page-title` | Header module name | 22px (responsive) | 700 |
| `.text-page-subtitle` | Header module description | 12px | 400 |

### ❌ KHÔNG BAO GIỜ hardcode:

```
❌ text-xl font-bold text-dark tracking-tight     → ✅ text-h3
❌ text-2xl font-bold text-text-primary            → ✅ text-h1
❌ text-[11px] font-semibold uppercase             → ✅ text-label
❌ text-3xl font-bold text-dark                    → ✅ text-h1
❌ text-lg font-bold text-text-primary             → ✅ text-h3
```

---

## 🃏 Cards

| Class | Khi nào dùng |
|-------|-------------|
| `.card-base` | Static card (không click) |
| `.card-interactive` | Clickable card (hover lift + active scale) |
| `.stats-card` | Dashboard KPI cards |
| `.skeleton-card` | Loading card placeholder |

---

## 🔘 Buttons

| Class | Khi nào dùng |
|-------|-------------|
| `.btn` | Base (dùng kèm variant) |
| `.btn-primary` | Primary action (Tạo mới, Lưu) |
| `.btn-secondary` | Secondary action (Huỷ, Đóng) |
| `.btn-danger` | Destructive action (Xoá) |
| `.btn-ghost` | Subtle action (Filter, Toggle) |

---

## 🏷️ Badges

| Class | Khi nào dùng |
|-------|-------------|
| `.badge` | Base badge (dùng kèm variant) |
| `.badge-success` | Hoàn thành, Active |
| `.badge-warning` | Đang xử lý, Pendng |
| `.badge-error` | Lỗi, Huỷ |
| `.badge-info` | Thông tin |
| `.badge-neutral` | Default, Draft |
| `.badge-primary` | Brand highlight |
| `.badge-accent` | Gold/VIP |

---

## 📐 Layout

| Class | Khi nào dùng |
|-------|-------------|
| `.main-container` | Page wrapper (max-w-1600px, responsive padding) |
| `.section-title` | Section header (icon + text + dashed border) |
| `.label-base` | Form label (Sentence case!) |
| `.input-base` | Form input (44px min-height, focus ring) |

---

## ✨ Animations

| Class | Khi nào dùng |
|-------|-------------|
| `.entrance` + `.entrance-1..8` | Staggered card entrance |
| `.stagger-item` | List item fade-up (auto delay by nth-child) |
| `.card-entrance` | Single card zoom-in |
| `.skeleton` | Branded shimmer loading |
| `.skeleton-text` | Text placeholder |
| `.skeleton-title` | Title placeholder |

---

## 🔍 Grep cheat — Tìm hardcode cần fix

```bash
# Typography hardcode
grep -rn "text-(xl|2xl|3xl).*font-bold" components/ app/

# Uppercase labels (violation lesson #51)
grep -rn "uppercase tracking-wider" components/ app/

# Font-serif (violation lesson #50)
grep -rn "font-serif" components/ app/
```
