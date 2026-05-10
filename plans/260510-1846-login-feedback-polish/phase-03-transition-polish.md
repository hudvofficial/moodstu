# Phase 03: Transition Copy & Button State Polish
Status: Done

## Objective
Make the transition overlay and button state carry the success feedback clearly.

## Tasks

1. Keep the full-screen `LoginTransition`.
2. Verify copy for both states:
   - `transitioning`: "Đang xác thực..."
   - `navigating`: "Chuẩn bị vào hệ thống..."
3. Optionally change the submit button label while loading so it does not still read like a normal action.
4. Do not add a replacement success toast.

## Acceptance Criteria

- User sees one continuous flow from submit to dashboard.
- No extra floating UI appears over dashboard skeletons.
- Button disabled/loading state remains obvious.

## Result

- Added submit button labels for login states:
  - `Đang xác thực`
  - `Đang mở hệ thống`
- Kept the full-screen transition as the primary success/navigation feedback.
