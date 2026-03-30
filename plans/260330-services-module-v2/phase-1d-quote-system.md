# Phase 1d: Quote System
Status: ⬜ Pending
Dependencies: Phase 1a (queries), Phase 1c (form exists for preview integration)

## Objective
Port hệ thống báo giá 3 levels từ V1: QuoteModal + QuoteView + QuotePreview.
Đây là nghiệp vụ cốt lõi — nhân viên dùng hàng ngày gửi báo giá cho khách.

## Implementation Steps

### 1. Quote Modal (Level 1 — Popup)
- [ ] Tạo `components/services/quote/quote-modal.tsx`
  - Trigger: "Báo giá" button trong list row/card
  - Container: ModalPortal + fixed inset + backdrop blur
  - Smart width: 340px (compact ≤ 10 items) hoặc 400px
  - Header:
    - Primary bg gradient
    - Studio logo (from getStudioInfo() — cached)
    - "MOOD STUDIO · BÁO GIÁ DỊCH VỤ" tagline
    - Service name (xl bold)
    - Unit label (uppercase, italic)
    - Price: "2.500.000 VNĐ" (4xl bold)
  - Body:
    - Scrollable sections from parseContentStructure()
    - Section title: uppercase, primary color, border-bottom
    - Items: bullet list, text-secondary
  - Footer:
    - Dashed border-top
    - Phone icon + studio hotline
    - Location icon + studio address
  - Close: ✕ button top-right
  - Mobile: auto-sized, nearly full-width

### 2. Quote View (Level 2 — Full Page)
- [ ] Tạo `components/services/quote/quote-view.tsx`
- [ ] Tạo route `app/(protected)/services/[id]/quote/page.tsx`
  - SSR: fetch service + studio info
  - Toolbar (sticky top):
    - Back link → /services
    - Print/PDF button (window.print())
    - Edit link → /services/[id]
  - Card: max-w-[520px] mx-auto
    - Same visual as QuoteModal but larger
    - Logo header + full sections + price + contact info
  - Print CSS (@media print):
    - Hide sidebar, nav, toolbar, bottom bar
    - Force background colors: color-adjust: exact
    - Full width card

### 3. Quote Preview (Level 3 — In-Form Live)
- [ ] Tạo `components/services/quote/quote-preview.tsx`
  - Embedded in ServiceForm page (sidebar on desktop, below on mobile)
  - Auto-updates as formData changes (real-time preview)
  - Compact card: max-w-[400px]
  - Typography-driven: same sections layout
  - Uses parseContentStructure() on current description field
  - Price: from current selling_price field
  - Mobile: Hidden (user accesses via separate route)
  - Desktop: Shown in sidebar or collapsible section

## Files to Create

| Action | File | Purpose |
|--------|------|---------|
| [NEW] | `components/services/quote/quote-modal.tsx` | Popup báo giá |
| [NEW] | `components/services/quote/quote-view.tsx` | Full-page printable |
| [NEW] | `components/services/quote/quote-preview.tsx` | In-form live preview |
| [NEW] | `app/(protected)/services/[id]/quote/page.tsx` | Quote route (SSR) |

## Studio Info Data Shape
```typescript
interface StudioInfo {
  name: string;        // "MOOD STUDIO"
  logo_url: string;    // Logo image URL
  phone: string;       // "0968548951 - 0976317031"
  address: string;     // "Sơn Thuỷ, Quảng Ngãi"
  tagline?: string;    // Optional
}
```

## Mobile vs Desktop — Quote Modal
| Aspect | Mobile | Desktop |
|--------|--------|---------|
| Width | ~90vw (max 340px) | 340-400px centered |
| Close | ✕ button + swipe down | ✕ button + click backdrop |
| Scrollable | Body scrolls, header fixed | Same |
| Footer | Compacted (smaller font) | Full size |

## Test Criteria
- [ ] QuoteModal: Opens from list row click → shows correct service data
- [ ] QuoteModal: Sections render correctly from parseContentStructure()
- [ ] QuoteModal: Studio info (logo, phone, address) displays
- [ ] QuoteView: Print button → browser print dialog opens
- [ ] QuoteView: Print output hides nav/sidebar/toolbar
- [ ] QuotePreview: Updates live as form fields change
- [ ] QuotePreview: Hidden on mobile, visible on desktop

## V1 Features Covered
- [x] Quote Modal (#14)
- [x] Quote View (#15)
- [x] Quote Preview (#16)

---
Next Phase: → [phase-2-bundle-advanced.md](./phase-2-bundle-advanced.md)
