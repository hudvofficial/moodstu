# Phase 2: Bundle & Advanced Features
Status: ⬜ Pending
Dependencies: Phase 1a-1d (all core features must work)

## Objective
Port tính năng Bundle/Combo Builder và các advanced features từ V1.
Phase này chỉ bắt đầu SAU KHI Phase 1 hoàn thành và được verify.

## Implementation Steps

### 1. Bundle Section (Manual Mode)
- [ ] Tạo `components/services/form/ServiceBundleSection.tsx`
  - Conditional: Chỉ hiển thị khi fulfillment_type === "BUNDLE"
  - Mode toggle: [Thủ công] / [Visual Builder]
  - Search: Input tìm dịch vụ con (searchServicesForBundle query)
  - Item list: child_service name + quantity input + adjustment_price + delete
  - Auto-calc: Tổng giá vốn = sum(child.selling_price × quantity + adjustment)

### 2. Builder Mode (Visual Drag-Drop)
- [ ] Port `BuilderMode.tsx` (9.4KB) → `components/services/builder/builder-mode.tsx`
  - Canvas-based visual builder
  - Drag-drop service components
  - Connection lines between services

### 3. Bundle Canvas
- [ ] Port `BundleCanvas.tsx` (6.3KB) → `components/services/builder/bundle-canvas.tsx`
  - Canvas rendering for bundle visualization
  - Zoom, pan controls

### 4. Component Selector
- [ ] Port `ComponentSelector.tsx` (5.9KB) → `components/services/builder/component-selector.tsx`
  - Service picker panel for drag into canvas
  - Search + filter by category

### 5. Smart Suggestions
- [ ] Port `SmartSuggestions.tsx` (5.4KB) → `components/services/builder/smart-suggestions.tsx`
  - AI-powered bundle suggestions
  - Based on popular combinations

### 6. Rule Manager
- [ ] Tạo `components/services/builder/rule-manager.tsx`
  - Port `RuleManager.tsx` (15.2KB)
  - Price rules CRUD
  - Conditions: quantity-based, category-based, date-based
  - uses existing upsertPriceRule(), getPriceRules() actions

### 7. Quote Modern View
- [ ] Port `QuoteModernView.tsx` (8.7KB) → `components/services/quote/quote-modern-view.tsx`
  - Upgraded quote layout
  - More visual, modern design

## Files to Create

| Action | File | Purpose |
|--------|------|---------|
| [NEW] | `components/services/form/ServiceBundleSection.tsx` | Bundle items manager |
| [PORT] | `components/services/builder/builder-mode.tsx` | Visual builder |
| [PORT] | `components/services/builder/bundle-canvas.tsx` | Canvas rendering |
| [PORT] | `components/services/builder/component-selector.tsx` | Service picker |
| [PORT] | `components/services/builder/smart-suggestions.tsx` | AI suggestions |
| [PORT] | `components/services/builder/rule-manager.tsx` | Price rules CRUD |
| [PORT] | `components/services/quote/quote-modern-view.tsx` | Modern quote layout |

## Notes
- Builder Mode là feature phức tạp nhất (~50KB code tổng cộng)
- Cần đánh giá lại architecture khi bắt đầu Phase 2
- Có thể cần thêm sub-phases (2a, 2b) nếu quá lớn
- Rule Manager (15.2KB) có thể cần refactor/split

## V1 Features Covered
- [x] Bundle Section Manual (#17)
- [x] Builder Mode Visual
- [x] Bundle Canvas
- [x] Component Selector
- [x] Smart Suggestions
- [x] Rule Manager
- [x] Quote Modern View
