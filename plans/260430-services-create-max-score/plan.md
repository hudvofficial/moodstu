# Plan: `/services/create` Fix-All and Max Score Optimization
**Created:** 2026-04-30  
**Status:** Completed  
**Current score:** 8.8/10  
**Target score:** 9.8/10 practical max, 10/10 only after seeded browser E2E runs in CI  
**Implemented score:** 9.8/10  
**Scope:** `/services/create` route, shared service form create path, category loading, submit safety, bundle picker performance, and verification evidence.

## Objective

Bring `/services/create` from production-usable to gold-standard:

1. Eliminate duplicate submit and ambiguous loading states.
2. Make SSR category fetch failures visible and actionable.
3. Tighten create-form business logic without changing the service data model.
4. Reduce unnecessary payload and work in bundle service search.
5. Add repeatable smoke coverage and update the score evidence.

## Target Files

- `app/(protected)/services/create/page.tsx`
- `app/(protected)/services/create/error.tsx` (new if needed)
- `app/(protected)/services/create/loading.tsx` (new if needed)
- `components/services/form/index.tsx`
- `components/services/form/hooks/useServiceForm.ts`
- `components/services/form/hooks/useServiceSearch.ts`
- `components/services/form/SaveActionPanels.tsx`
- `components/services/form/ServiceInfoSection.tsx`
- `components/services/form/ServicePriceSection.tsx`
- `components/services/form/ServiceBundleSection.tsx`
- `app/actions/service-queries.ts`
- `app/actions/service-mutations.ts`
- `lib/validations/service.schema.ts`
- `scripts/verify-services.mjs`
- `docs/reports/services_create_score_2026_04_30.md` (new)

## Phases

| Phase | Name | Status | Priority | Target Score Impact |
|:-----:|------|:------:|:--------:|:-------------------:|
| 00 | Submit Safety and Loading State | Completed | P0 | 8.8 -> 9.1 |
| 01 | Category Fetch and Route UX Resilience | Completed | P0 | 9.1 -> 9.25 |
| 02 | Create-Path Business Logic Hardening | Completed | P1 | 9.25 -> 9.45 |
| 03 | Bundle Search Payload and Interaction Perf | Completed | P1 | 9.45 -> 9.6 |
| 04 | UI Polish, Text, Accessibility, Mobile Fit | Completed | P2 | 9.6 -> 9.7 |
| 05 | Verification, Smoke, Final Score Evidence | Completed | P2 | 9.7 -> 9.8+ |

## Phase 00: Submit Safety and Loading State

### Goal

No double-create, no stale loading, no accidental submit through multiple action surfaces.

### Steps

1. Add an immediate in-flight guard in `useServiceForm`.
   - Use a `useRef(false)` lock, not only `isSubmitting`, because state updates are asynchronous.
   - First line in `handleSubmit`: if locked, return.
   - Release lock in `finally`.

2. Normalize submit entry points.
   - Keep form `onSubmit` and panel `onSubmit`, but both must call the same guarded function.
   - Ensure pressing Enter in text fields and clicking desktop/mobile buttons have identical behavior.

3. Add pending UI consistency.
   - Buttons disabled while submitting.
   - Button labels clearly indicate saving/creating.
   - Cancel/back disabled during submit.

4. Prevent accidental create with invalid bundle state.
   - If fulfillment type is `bundle`, require at least one child service before submit.
   - Surface the error near bundle section.

### Acceptance Criteria

- Rapid double click creates at most one service.
- Pressing Enter and clicking button do not race each other.
- Submit lock releases after success or failure.
- Invalid bundle create is blocked client-side and server-side.

## Phase 01: Category Fetch and Route UX Resilience

### Goal

The route should not silently degrade when category loading fails.

### Steps

1. Replace silent `[]` fallback in `app/(protected)/services/create/page.tsx`.
   - If `getServiceCategories()` fails, render a compact error state with retry/back actions, or throw to route error boundary.

2. Add `loading.tsx` for route-level skeleton if not covered by parent layout.
   - Match the real form layout: header, section skeletons, desktop side panel skeleton, mobile action bar placeholder.

3. Add `error.tsx`.
   - Show Vietnamese error copy.
   - Include retry and back-to-services action.

4. Keep SSR category hydration.
   - Do not move initial category load to client unless there is a measurable reason.

### Acceptance Criteria

- Category query failure is visible.
- Loading state matches final layout dimensions and avoids layout shift.
- Authorized users get a clear recovery path.

## Phase 02: Create-Path Business Logic Hardening

### Goal

Create data should be valid, normalized, and domain-safe before it reaches DB.

### Steps

1. Strengthen client validation in `useServiceForm`.
   - Required: `name`.
   - Money fields: non-negative finite numbers.
   - `selling_price >= cost_price` warning or confirmation if business accepts below-cost pricing.
   - URL validation feedback for `image_url`.
   - Bundle validation when `fulfillment_type === "bundle"`.

2. Mirror critical rules on the server.
   - Extend Zod/RPC input checks if missing.
   - Ensure bundle child services are active, non-deleted, `single`, and not self-referential.
   - Keep writes atomic through `save_service_atomic`.

3. Handle duplicate service code gracefully.
   - Return a field-level message if DB reports unique conflict.
   - Do not show raw Supabase error text to the user.

4. Preserve cache correctness.
   - Revalidate `/services`.
   - Revalidate SWR service/category prefixes.
   - Avoid `router.refresh()` for this flow.

### Acceptance Criteria

- Invalid payload cannot be created through UI or server action.
- Duplicate code produces readable field-level feedback.
- Create success redirects to `/services` with updated list cache.

## Phase 03: Bundle Search Payload and Interaction Perf

### Goal

Bundle picker should fetch only what it needs and stay responsive.

### Steps

1. Add a narrow server action for bundle search.
   - Example: `searchServicesForBundle(query, excludeId?)`.
   - Return only `id`, `name`, `service_code`, `selling_price`, `unit`, `category_id`, `image_url`.
   - Limit results to 20.

2. Update `useServiceSearch`.
   - Use the narrow action instead of broad `getServices`.
   - Clear stale results when search term drops below 2 chars.
   - Ignore out-of-order responses through cancellation token/ref.
   - Surface searching and empty states in UI.

3. Improve `ServiceBundleSection`.
   - Show loading indicator inside dropdown.
   - Show "no result" only after search completes.
   - Keep dropdown dimensions stable.
   - Add keyboard-safe click/selection behavior if feasible.

4. Keep bundle editor lazy where practical.
   - Verify `BuilderMode` impact on create route chunk.
   - If create route grows over budget, dynamic-import `BuilderMode` behind the builder toggle.

### Acceptance Criteria

- Bundle search uses the narrow action.
- No broad list payload for bundle lookup.
- Dropdown has loading, empty, and result states.
- Chunk budget remains under 80KB for app route chunks.

## Phase 04: UI Polish, Text, Accessibility, Mobile Fit

### Goal

Make the create form feel synchronized with the rest of the SaaS UI and remove visual rough edges.

### Steps

1. Verify Vietnamese text in browser and source encoding.
   - Fix mojibake if it is present in rendered UI, not only terminal output.
   - Keep files UTF-8.

2. Replace emoji-like section markers with lucide icons where appropriate.
   - Follow app UI convention: icons in headings/buttons.
   - Avoid decorative text that can render inconsistently.

3. Check mobile sticky panel.
   - No overlap with final form section.
   - Safe-area padding works.
   - Preview toggle does not hide primary action.

4. Improve accessibility.
   - Back button gets `aria-label`.
   - Icon-only or compact controls get labels/titles.
   - Field errors connect visibly to their fields.
   - Dropdown result rows are button-like or keyboard-operable where feasible.

5. Keep visual density operational.
   - No marketing-style blocks.
   - Preserve compact, work-focused form sections.

### Acceptance Criteria

- Mobile and desktop layouts have no text overlap.
- Section labels and actions render correctly in Vietnamese.
- Primary workflow remains visible without scrolling traps.

## Phase 05: Verification, Smoke, Final Score Evidence

### Goal

Make the score defensible with repeatable checks.

### Steps

1. Extend `npm run verify:services` if feasible.
   - Include create/update/delete smoke using service role or controlled test data.
   - Assert bundle atomic rollback where possible.
   - Clean up test records.

2. Add manual browser smoke checklist if no Playwright auth harness exists.
   - Admin/manager open `/services/create`.
   - Sale/media/viewer direct URL redirected to `/dashboard`.
   - Create single service.
   - Create bundle service.
   - Duplicate code shows readable error.
   - Category fetch failure path verified by mocked/local failure if feasible.
   - Mobile sticky actions verified at common mobile width.

3. Run final gates.

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run verify:services
npm run perf:audit
npm run build
npm run perf:chunks
```

4. Write final score report.
   - New file: `docs/reports/services_create_score_2026_04_30.md`.
   - Include before score, after score, commands run, residual risk.

### Acceptance Criteria

- TypeScript, lint, build, perf audit, and chunk budget pass.
- `verify:services` passes or documents missing environment prerequisites.
- Final report justifies 9.8/10 or states exact blocker.

## Scoring Rubric

- UI consistency and mobile fit: 20%
- Business logic correctness: 25%
- Security and authorization: 15%
- Loading/perceived performance: 15%
- Submit/cache correctness: 15%
- Verification evidence: 10%

## Expected Final Score

- **9.8/10** after Phases 00-05 with manual smoke evidence.
- **10/10** only if seeded automated browser E2E covers role matrix and create/update/delete flows in CI.

## Guardrails

- Do not change service schema unless a blocker is proven.
- Keep `/services/create` within existing Services RBAC: admin/manager only.
- Do not introduce `router.refresh()` or `window.location.reload()`.
- Do not broaden public access to services tables.
- Keep app route chunks under 80KB.
- Preserve existing edit route behavior because the form is shared with `/services/[id]`.
