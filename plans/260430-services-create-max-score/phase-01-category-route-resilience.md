# Phase 01: Category Fetch and Route UX Resilience
**Status:** Completed  
**Priority:** P0  
**Dependencies:** Phase 00  
**Score impact:** 9.1 -> 9.25

## Objective

Remove silent fallback behavior from category loading and make route loading/error states intentional.

## Target Files

- `app/(protected)/services/create/page.tsx`
- `app/(protected)/services/create/loading.tsx`
- `app/(protected)/services/create/error.tsx`
- `components/services/form/ServiceInfoSection.tsx`

## Implementation Steps

1. Stop silently replacing failed categories with `[]`.
   - If `getServiceCategories()` returns failure, render an actionable error state or throw to `error.tsx`.
   - Keep empty array only for a successful response with genuinely no categories.

2. Add route loading skeleton.
   - Match final page structure: header, info card, price card, content card, desktop side preview/action panel.
   - Reserve bottom space for mobile sticky action panel.

3. Add route error boundary.
   - Show concise Vietnamese message.
   - Provide retry and back-to-services actions.
   - Avoid leaking raw server details.

4. Improve no-category state inside category select.
   - If categories are truly empty, show clear placeholder and keep category manager entry available.

## Acceptance Criteria

- Category fetch errors are visible.
- Loading skeleton does not cause layout shift.
- Users can retry or leave the route.
- No raw Supabase/internal error leaks to UI.

## Verification

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run build
```

Manual:

- Normal category load.
- Empty category list.
- Simulated failed category load.
