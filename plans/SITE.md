---
stitch-project-id: 3342062284752503492
---
# Project Vision & Constitution — Mood Studio V2

> **AGENT INSTRUCTION:** Read this file before every Stitch iteration. It serves as the project's "Long-Term Memory." If `next-prompt.md` is empty, pick the highest priority item from Section 5 OR invent a new page that fits the project vision.

## 1. Core Identity

* **Project Name:** Mood Studio V2
* **Stitch Project ID:** `3342062284752503492`
* **Mission:** A premium, earth-toned admin console for managing a Vietnamese wedding & photography studio — contracts, customers, payments, inventory, and dashboard analytics.
* **Target Audience:** Studio owners, managers, sales staff, and media teams who need a beautiful yet functional daily-use tool.
* **Voice:** Warm, refined, professional, trustworthy — like a luxury brand's internal system.

## 2. Visual Language (Stitch Prompt Strategy)

*Strictly adhere to these descriptive rules when prompting Stitch. See `STITCH-DESIGN.md` Section 6 for the copy-paste block.*

* **The "Vibe" (Adjectives):**
    * *Primary:* **Warm** (Earth tones, inviting, natural warmth)
    * *Secondary:* **Luxurious** (Gold accents, generous whitespace, premium feel)
    * *Tertiary:* **Clean** (Stripe-inspired clarity, Apple HIG precision)

* **Color Philosophy (Semantic):**
    * **Backgrounds:** Warm barely-there cream (#FAF7F2). Inviting canvas.
    * **Accents:** Rich earth brown (#8B5E3C) for actions, warm gold (#C9A96E) for highlights.
    * **Text:** Dark brown (#3D2B1F) for headlines, muted brown (#8B7355) for body.

## 3. Architecture & Screen Naming

* **Naming:** `P{XX}_{module}_{view}_{breakpoint}` — e.g., `P01_login_desktop`, `P04_contracts_list_mobile`
* **Breakpoints:** Desktop (1440px) + Mobile (375px). Tablet = CSS responsive (no Stitch needed).
* **Each page needs 2 Stitch screens** (Desktop + Mobile) before considered complete
* **Design reference:** `plans/STITCH-DESIGN.md` Section 6 must be included in EVERY prompt

## 4. Live Sitemap (Current State)

*Update this when a new screen is successfully generated and verified.*

### P01: Login/Auth
* [x] `P01_login_desktop` — `a1fe5ee1` (v2 luxury)
* [x] `P01_login_mobile` — `04285807` (v2 luxury)

### P03: Customers
* [x] `P03_customers_list_desktop` — `a691f8a2`
* [x] `P03_customers_list_mobile` — `30876d5e`
* [x] `P03_customers_detail_desktop` — `56f4db2e`
* [x] `P03_customers_detail_mobile` — `33de258b`

### P04: Contracts
* [x] `P04_contracts_list_desktop` — `37b29e12` ⭐ GOLD STANDARD
* [x] `P04_contracts_list_mobile` — `ca6942ab`
* [x] `P04_contracts_detail_desktop` — `9e95bc24`
* [x] `P04_contracts_detail_mobile` — `16c286be`
* [x] `P04_contracts_create_desktop` — `590edbd1`
* [x] `P04_contracts_create_mobile` — `dedc3e9d`

### P05: Payments / Finance
* [x] `P05_finance_hub_desktop` — `6189e4ec` ✅
* [x] `P05_finance_hub_mobile` — `6877ee33` ✅
* [x] `P05_receipt_list_desktop` — `723a6f7f` ✅
* [x] `P05_receipt_list_mobile` — `7dab1960` ✅

### P06: Inventory (Costumes)
* [x] `P06_inventory_list_desktop` — `d8af3804` ✅
* [x] `P06_inventory_list_mobile` — `5c2aeaad` ✅
* [x] `P06_inventory_detail_desktop` — `1030991e` ✅
* [x] `P06_inventory_detail_mobile` — `55fa8b3e` ✅

### P07: Dashboard
* [x] `P07_dashboard_desktop` — `04dfec54`
* [x] `P07_dashboard_mobile` — `3698f09c`

### P08: Team Media
* [x] `P08_team_board_desktop` — `16672d36` ✅
* [x] `P08_team_board_mobile` — `42fcdc17` ✅

### P09: Calendar
* [x] `P09_calendar_desktop` — `97ae4ff2` ✅
* [x] `P09_calendar_mobile` — `49f8b5c2` ✅

### P13: Reports
* [x] `P13_reports_desktop` — `833ac887` ✅
* [x] `P13_reports_mobile` — `fb4d0583` ✅

### P15: HR & Attendance
* [x] `P15_hr_desktop` — `8019cadd` ✅
* [x] `P15_hr_mobile` — `dc11c1f5` ✅

### P17: Printing & Labs
* [x] `P17_printing_desktop` — `5041fea4` ✅
* [x] `P17_printing_mobile` — `07358753` ✅

### 📌 Phase 2 Backlog (Giữ lại, chưa implement)
* [x] `CRM_nerve_center_desktop` — `30153e25` (Phase 2)
* [x] `CRM_nerve_center_mobile` — `bc3119cd` (Phase 2)
* [x] `CRM_lead_detail_desktop` — `21e3a83f` (Phase 2)
* [x] `CRM_lead_detail_mobile` — `661028a8` (Phase 2)

## 5. The Roadmap (Backlog)

*Pick the next task from here. Priority order.*

### High Priority (MVP screens missing)
- [x] **P05 Finance Hub** — Desktop + Mobile ✅ (`6189e4ec`, `6877ee33`)
- [x] **P05 Receipt List** — Desktop + Mobile ✅ (`723a6f7f`, `7dab1960`)
- [x] **P06 Inventory List** — Desktop + Mobile ✅ (`d8af3804`, `5c2aeaad`)
- [x] **P06 Inventory Detail** — Desktop + Mobile ✅ (`1030991e`, `55fa8b3e`)

### Low Priority (Nice-to-have screens)
- [ ] **P05 Create Payment Form** — Desktop + Mobile
- [ ] **Settings Page** — Desktop + Mobile
- [ ] **P06 Costume Calendar** — Rental conflict view

### ⚙️ Code-Only Components (NO Stitch needed)
> Modals, Empty States, Toasts, Skeletons → code trực tiếp từ `design-specs.md`.
> Tablet responsive → CSS breakpoint (mini sidebar + 2-col grid).
- Modal.tsx (< 80 lines)
- ConfirmDialog.tsx (< 50 lines)
- EmptyState.tsx
- Skeleton.tsx
- Toast (Sonner wrapper)
- FABButton.tsx

## 6. Creative Freedom Guidelines

*When the backlog is empty, follow these guidelines to innovate.*

1. **Stay On-Brand:** New screens must maintain the warm luxury earth-tone aesthetic
2. **Enhance the Core:** Support the wedding studio management workflow
3. **Naming Convention:** Use `P{XX}_{module}_{view}_{breakpoint}` format
4. **Always include:** The DESIGN SYSTEM block from `STITCH-DESIGN.md` Section 6

## 7. Rules of Engagement

1. Do NOT recreate screens already marked `[x]` in Section 4
2. Always update `next-prompt.md` before completing an iteration
3. Consume items from Section 5 when you build them — mark `[x]`
4. Include DESIGN SYSTEM block in every Stitch prompt
5. Generate 2 breakpoints for each page (Desktop + Mobile). Tablet = CSS responsive.
6. Max 3 screens per batch → review → next batch

---

*Created 2026-03-15 — Updated: Tablets removed, CSS responsive approach adopted*

