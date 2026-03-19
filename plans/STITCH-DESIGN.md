# Design System: Mood Studio V2

**Project ID:** `3342062284752503492`
**Source:** Extracted from P04 Contract List HTML + `docs/design-specs.md`
**Updated:** 2026-03-15

---

## 1. Visual Theme & Atmosphere

A **warm, luxurious, earth-toned** admin console for a premium Vietnamese wedding studio. The aesthetic channels refined craftsmanship — think artisanal leather goods and warm wood interiors. Generous whitespace creates breathing room; subtle depth through whisper-soft shadows adds dimension without heaviness. The overall density is **medium** — functional enough for daily studio operations, yet elegant enough to feel premium.

**Vibe Adjectives:**
- *Primary:* **Warm** — Inviting earth tones, natural materials feel
- *Secondary:* **Luxurious** — Gold accents, refined typography, premium spacing
- *Tertiary:* **Clean** — Stripe-inspired clarity, Apple HIG structure

---

## 2. Color Palette & Roles

### Core Identity
- **Rich Earth Brown** (#8B5E3C) — Primary brand color. Used for buttons, active tabs, links, headings, and all primary interactive elements. The warm brown anchors every screen.
- **Warm Gold** (#C9A96E) — Premium accent. Used for monetary highlights ("Đã thu" amounts), badges, and luxury touches. Conveys value and importance.
- **Muted Brown** (#8B7355) — Secondary text, labels, captions, table headers. Softer than primary, readable against light backgrounds.

### Surfaces
- **Warm White** (#FAF7F2) — Main page background. A barely-there cream that feels warmer than pure white.
- **Pure White** (#FFFFFF) — Cards, modals, table bodies. Clean contrast against warm background.
- **Warm Cream** (#F5EFE6) — Sidebar background, alternating table rows. Distinctive but subtle.
- **Deep Espresso** (#1D1815) — Dark mode page background (future).

### Text
- **Dark Brown** (#3D2B1F) — Primary text. Rich and readable.
- **Muted Brown** (#8B7355) — Secondary text, labels.
- **Warm Taupe** (#B09E88) — Tertiary text, placeholders, captions.

### Borders & Dividers
- **Sand** (#E8DDD0) — Borders, dividers. Subtle warmth.
- Alternatively: `border-primary/5` or `border-primary/10` for very subtle brown tint.

### Semantic (Status) — Tailwind-based, earth-tone compatible
- **Success** — Emerald tint (`bg-emerald-50` #ECFDF5, `text-emerald-800` #065F46) for "Hoàn thành", "Đã thanh toán đủ"
- **Danger** — Red tint (`bg-red-50` #FEF2F2, `text-red-800` #991B1B) for "Đã huỷ", "Còn nợ", "Quá hạn"
- **Warning** — Amber tint (`bg-amber-50` #FFFBEB, `text-amber-800` #92400E) for "Đã cọc", "Hậu kỳ", "Đang giao"
- **Info** — Sky tint (`bg-sky-50` #F0F9FF, `text-sky-700` #0369A1) for "Chuẩn bị", "Duyệt ảnh"
- **Active** — Primary tint (`bg-primary/10`, `text-primary` #8B5E3C) for "Đang chụp" (brand highlight)

### Forbidden Colors
❌ Purple/Violet, Teal/Cyan, Neon green, Coral, Orange (use amber), Indigo, Lavender, Dark green (#1E3D2E)

---

## 3. Typography Rules

**Font Family:** Inter — a clean, modern sans-serif with excellent readability at all sizes.
**Font Stack:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

| Role | Size | Weight | Spacing |
|------|------|--------|---------|
| Display | 36px | 700 Bold | -0.02em, tight |
| Heading 1 | 28px | 600 Semi | -0.01em |
| Heading 2 | 22px | 600 Semi | -0.01em |
| Heading 3 | 18px | 600 Semi | natural |
| Body | 16px | 400 Regular | natural |
| Body Small | 14px | 400 Regular | natural |
| Caption | 12px | 400 Regular | natural |
| Label | 13px | 500 Medium | natural |

**Rules:**
- Sentence case everywhere — NEVER uppercase text except logo and system codes (MS-2026-001)
- No `letter-spacing: 0.03em+` on labels (V1 mistake)
- Line height: 1.5 for body, 1.2 for headings

---

## 4. Component Stylings

* **Buttons:** Subtly rounded corners (6px). Primary uses Rich Earth Brown (#8B5E3C) background with white text. Secondary uses white with brown border. Ghost has no border. Comfortable padding (12px 24px). Hover darkens to #7A5235.
* **Cards/Containers:** Gently rounded corners (10px). White background (#FFFFFF) on warm page. Whisper-soft shadow (`0 4px 12px rgba(61,43,31,0.10)`). Border: `1px solid rgba(139,94,60,0.05)`.
* **Inputs/Forms:** Subtle border (#E8DDD0), 6px radius. Background white. Focus ring uses primary color with low opacity. Label above in medium weight, 13px.
* **Tables:** White background, rounded container (10px). Header row uses warm background (#FAF7F2) with muted brown uppercase small text. Rows hover with `bg-primary/5`. No heavy grid lines — use subtle bottom borders.
* **Badges/Pills:** Pill-shaped (full radius). Status-specific background tints. Text 12px medium weight. See status badge map below.
* **Modals:** Slide-up on mobile (300ms cubic-bezier), scale-in on desktop (250ms). Large rounded corners (14px). Heavy shadow for elevation.
* **Sidebar:** Warm cream (#F5EFE6) background. Right border with `border-primary/10`. Active item uses primary color text + `bg-primary/10` background.

---

## 5. Layout Principles

**Spacing Scale:** 4-8-12-16-20-24-32-40-48px (4px base unit)
**Content Strategy:** Centered, max-width container. Generous whitespace — minimum 24px between sections, 32px for major areas.
**Grid:** 12-column on desktop (1280px+), 2-column on tablet (768px), single column on mobile (375px).

**Desktop (1280px+):** Full sidebar (w-60) with text + icons. Fixed header (h-16) with breadcrumb.
**Tablet (768px):** Mini sidebar (w-16, icons only). Header stays.
**Mobile (375px):** No sidebar — bottom navigation (5 tabs: Dashboard/HĐ/KH/Kho/More). Fixed header (h-14). FAB button (56px, bottom-right) for primary create actions.

**Border Radius Scale:** 6px (buttons, inputs) → 10px (cards) → 14px (modals) → 20px (large panels) → full (avatars, pills)

---

## 6. Design System Notes for Stitch Generation

**Copy this block into every baton prompt:**

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web, Desktop-first (responsive to mobile)
- Theme: Light, warm luxury, earth-tone — like a premium wedding brand admin console
- Background: Warm barely-there cream (#FAF7F2) for page, pure white (#FFFFFF) for cards
- Surface Alt: Warm cream (#F5EFE6) for sidebar and alternating rows
- Primary Accent: Rich earth brown (#8B5E3C) for buttons, links, active states
- Secondary Accent: Warm gold (#C9A96E) for monetary highlights and premium badges
- Text Primary: Dark rich brown (#3D2B1F) for headings
- Text Secondary: Muted warm brown (#8B7355) for labels and captions
- Borders: Warm sand (#E8DDD0), very subtle
- Font: Inter, clean modern sans-serif (400/500/600/700 weights)
- Buttons: Subtly rounded (6px), earth brown primary, white text
- Cards: Gently rounded (10px), white, whisper-soft warm shadows
- Layout: Generous whitespace, centered content, 12-col grid desktop
- Icons: Lucide icon style (2px stroke, clean line icons)
- Sentence case everything — no uppercase except codes
- No purple, teal, cyan, neon, or cold colors — earth tones only

---

## 7. Status Badge Color Map

| Status | Vietnamese | Background | Text | Style |
|--------|-----------|------------|------|-------|
| `draft` | Nháp | stone-100 | stone-700 | Neutral, inactive |
| `deposited` | Đã cọc | amber-50 | amber-800 | Gold/money tone |
| `preparing` | Chuẩn bị | sky-50 | sky-700 | Light, starting |
| `shooting` | Đang chụp | primary/10 | primary | Brand highlight |
| `editing` | Hậu kỳ | amber-100 | amber-800 | Warm progress |
| `reviewing` | Duyệt ảnh | sky-100 | sky-800 | Awaiting feedback |
| `delivering` | Đang giao | amber-50 | amber-800 | Near completion |
| `completed` | Hoàn thành | emerald-50 | emerald-800 | Success ✅ |
| `cancelled` | Đã huỷ | red-50 | red-800 | Danger ❌ |

---

*Generated by design-md skill — 2026-03-15*
