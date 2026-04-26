# Phase 04: Responsive UI Polish Pass
Status: In Progress
Priority: Medium

## Objective
Eliminate visible UI regressions in `/contracts` list, drawer, detail, create, and edit screens.

## Files
- `components/contracts/**`
- `app/(protected)/contracts/**`

## Tasks
- [ ] Verify list desktop table.
- [ ] Verify list mobile cards.
- [ ] Verify filters/pagination/footer count.
- [ ] Verify drawer header/actions/content.
- [x] Verify detail event timeline grid code path.
- [x] Fix form select controlled/uncontrolled warning in shared `SelectForm`.
- [x] Verify task modal error/rollback behavior in code path.
- [ ] Verify detail quick actions and financial dashboard.
- [ ] Verify mobile tabs and bottom bar.
- [ ] Verify create/edit form responsive layout.

## Test Criteria
- [ ] No overlapping badge/text/card content.
- [x] Event timeline keeps same-row layout when width permits in code.
- [x] Task status optimistic UI rolls back on server failure.
- [ ] 375px mobile viewport is usable.
- [ ] Desktop viewport is dense but readable.
