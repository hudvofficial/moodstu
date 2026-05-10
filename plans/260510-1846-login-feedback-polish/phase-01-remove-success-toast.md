# Phase 01: Remove Login Success Toast
Status: Done

## Objective
Remove the generic success toast after login so the transition feels cleaner.

## Tasks

1. In `components/auth/login-page-client.tsx`, remove `toast.success("Đăng nhập thành công")` from the success branch.
2. Keep `setLoginState("navigating")`.
3. Keep `router.replace("/dashboard")`.
4. Keep all error/recovery toasts.

## Acceptance Criteria

- Successful login does not show a floating toast.
- Failed login still shows the server action error.
- Reset password success toast still appears when entering `/login?reset=success`.

## Result

- Removed the success toast from the normal login success branch.
- Kept the error toast branch unchanged.
