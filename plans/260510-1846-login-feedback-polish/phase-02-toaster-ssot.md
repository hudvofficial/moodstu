# Phase 02: Toaster SSOT Cleanup
Status: Done

## Objective
Make toast ownership predictable by keeping a single global `Toaster`.

## Tasks

1. Keep the root `Toaster` in `app/layout.tsx`.
2. Remove the duplicate `Toaster` from `app/(protected)/layout.tsx`.
3. Ensure protected app actions still show toast through the root provider.
4. Keep root toast style token-based and consistent with Mood UI.

## Acceptance Criteria

- `rg "<Toaster" app` shows only the root app layout toaster, unless a future route intentionally scopes a separate one.
- Existing protected app toasts still appear.
- No duplicate toast stacking after navigation.

## Result

- Removed the duplicate `Toaster` from `app/(protected)/layout.tsx`.
- Root `app/layout.tsx` remains the single global toast owner.
