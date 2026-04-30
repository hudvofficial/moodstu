# Phase 04: UI Polish, Accessibility, Mobile Fit
**Status:** Completed  
**Priority:** P2  
**Dependencies:** Phase 03  
**Score impact:** 9.6 -> 9.7

## Objective

Polish the create form so it matches the operational SaaS UI standard on desktop and mobile.

## Target Files

- `app/(protected)/services/create/page.tsx`
- `components/services/form/ServiceInfoSection.tsx`
- `components/services/form/ServicePriceSection.tsx`
- `components/services/form/ServiceContentEditor.tsx`
- `components/services/form/ServiceBundleSection.tsx`
- `components/services/form/SaveActionPanels.tsx`
- `components/services/quote/quote-preview.tsx`

## Implementation Steps

1. Verify text rendering.
   - Check actual browser rendering for Vietnamese text.
   - Fix source encoding only if UI renders mojibake.

2. Replace unstable emoji-like heading markers.
   - Use lucide icons for section headings.
   - Keep headings compact and consistent with other internal tools.

3. Improve labels and accessibility.
   - Add `aria-label` to back button.
   - Ensure icon buttons have text, title, or accessible label.
   - Keep error text visible near fields.

4. Verify mobile sticky panel.
   - No overlap with form footer.
   - Safe area works.
   - Preview collapse/expand does not hide primary action.

5. Check layout density.
   - No nested cards beyond actual form cards.
   - Text fits on mobile.
   - Buttons keep stable width/height during loading labels.

## Acceptance Criteria

- Desktop form is scan-friendly and aligned.
- Mobile form has no overlapping sticky panel.
- Vietnamese text renders correctly.
- Controls remain accessible and discoverable.

## Verification

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run build
```

Manual viewport checks:

- Desktop 1440px.
- Tablet 768px.
- Mobile 390px.
