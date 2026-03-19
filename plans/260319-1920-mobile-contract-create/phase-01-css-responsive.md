# Phase 01: CSS Grid Responsive
Status: ⬜ Pending
Dependencies: None

## Objective
Chuyển `.detail-grid` từ grid 12 cột cố định → mobile flex column + desktop @media grid.
Giải quyết 5/5 lỗi critical trong audit.

## File: `app/styles/pages.css` (dòng 11-30)

## Implementation

### Before (hiện tại):
```css
.detail-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: var(--spacing-lg, 24px);
  margin-top: var(--spacing-lg, 24px);
}
.detail-main {
  grid-column: span 8 / span 8;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg, 24px);
}
.detail-sidebar {
  grid-column: span 4 / span 4;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg, 24px);
}
```

### After (fix):
```css
/* Mobile-first: 1 cột */
.detail-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg, 24px);
  margin-top: var(--spacing-lg, 24px);
}
.detail-main {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg, 24px);
}
.detail-sidebar {
  display: none;
  flex-direction: column;
  gap: var(--spacing-lg, 24px);
}

/* Desktop: grid 12 cột */
@media (min-width: 1024px) {
  .detail-grid {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
  .detail-main {
    grid-column: span 8 / span 8;
  }
  .detail-sidebar {
    display: flex;
    grid-column: span 4 / span 4;
  }
}
```

## Lessons Applied
- #57: CSS class `display` override Tailwind responsive → fix at CSS level
- #55: Custom CSS class không hỗ trợ responsive prefix → dùng @media
- #63: Mobile responsive = override, giữ nguyên desktop

## Impact Assessment
- ✅ Desktop ≥1024px: Y HỆT code cũ (@media restore grid)
- ✅ Mobile <1024px: 1 cột, sidebar ẩn
- ✅ Applies to: contract create, edit, detail pages (cùng dùng class)

## Test Criteria
- [ ] Desktop 1920px: grid 8/4 column hiện đúng
- [ ] Mobile 375px: 1 cột, sidebar ẩn
- [ ] Contract detail page: desktop đúng, mobile 1 cột

---
Next Phase: phase-02-s4s5-inline.md
