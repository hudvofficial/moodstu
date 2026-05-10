# Plan: Login Feedback Polish
Created: 2026-05-10T18:46+07:00
Status: Done Locally

## Goal
Make the login completion feedback feel intentional and premium. Success login should be communicated by the transition overlay and dashboard readiness, not by a generic toast that floats over the next screen.

## Current Audit

Files audited:
- `components/auth/login-page-client.tsx`
- `components/auth/login-transition.tsx`
- `app/layout.tsx`
- `app/(protected)/layout.tsx`

Actual current flow:
1. User submits login form.
2. `LoginPageClient.handleSubmit()` immediately sets `loginState = "transitioning"` with `flushSync`.
3. `LoginTransition` shows the full-screen loading overlay.
4. Server action `login(formData)` authenticates and prewarms critical dashboard data.
5. On success, client sets `loginState = "navigating"`.
6. Client calls `toast.success("Đăng nhập thành công")`.
7. Client calls `router.replace("/dashboard")`.
8. Dashboard starts rendering with critical KPI data and streamed deferred sections.

Problems:
- The success toast duplicates the overlay message.
- It appears during a navigation moment, so it visually competes with dashboard loading/skeletons.
- Root layout already has a global `Toaster`.
- Protected layout adds a second `Toaster`, which makes toast behavior harder to reason about.
- The toast style is generic compared to the login transition and Mood UI.

Decision:
- Remove success toast from normal login success.
- Keep error toasts for failed login.
- Keep one-time redirect toasts such as reset-password success and auth link errors, because those are actionable page-entry messages.
- Consolidate toaster ownership so toast styling is predictable.

## Phases

| Phase | Name | Status | Outcome |
| --- | --- | --- | --- |
| 00 | Audit & UX Decision | Done | Confirm success toast is redundant with login overlay. |
| 01 | Remove Login Success Toast | Done | Login success has no floating toast; overlay owns success/navigating state. |
| 02 | Toaster SSOT Cleanup | Done | Root layout owns global toaster; protected layout does not duplicate it. |
| 03 | Transition Copy & Button State Polish | Done | Loading copy/button state clearly explains authentication and navigation. |
| 04 | Verification & Deploy Gate | Done Locally | Lint/type/build pass; manual QA remains for browser login flow. |

## Acceptance Criteria

- Failed login still shows `toast.error`.
- Password reset success still shows a toast on `/login?reset=success`.
- Successful login no longer shows a floating success toast.
- There is only one global `Toaster` provider.
- Login overlay remains visible from submit until dashboard navigation starts.
- No regression to dashboard prewarm/streaming.

## Verification Commands

- `npm run lint`
- `npx tsc --noEmit --pretty false`
- `npm run build`
- `npm run smoke:production` after deploy if requested
