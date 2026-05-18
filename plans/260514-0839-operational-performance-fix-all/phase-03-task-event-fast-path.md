# Phase 03: Task and Event Fast Path
Status: Completed
Priority: P1

## Objective
Make frequent small operations feel instant: add/delete/toggle task, update event date/status, add/delete event.

## Files
- `components/contracts/detail/event-task-modal.tsx`
- `components/contracts/detail/event-timeline.tsx`
- `components/contracts/detail/contract-detail-client.tsx`
- `app/actions/work-task-actions.ts`
- `app/actions/contract-event-actions.ts`
- `lib/hooks/use-contracts.ts`

## Tasks
1. Add optimistic cache patch helpers for:
   - add task
   - delete task
   - toggle task status
   - add event
   - delete event
2. Avoid `loadData(true)` after add task when modal already knows enough to patch local task list.
3. Return enough payload from `addTask()` and `addContractEvent()` to patch UI without extra fetch.
4. Keep a background detail revalidation only after the user sees success.
5. Keep rollback paths for failed action calls.

## Acceptance Criteria
- Task add/delete/toggle updates visible UI immediately.
- No full detail refetch is required before closing the modal.
- Multi-user correctness remains covered by realtime.
- `verify:contracts` and `smoke:contracts` pass.

## Result
- Task add now patches the modal immediately and replaces the optimistic row with the saved row.
- Task add server action returns enough task payload to avoid an extra `getTasksByEvent()` refresh.
- Assigned task add updates the parent event status directly without re-reading all tasks.
- Add event and delete event patch the contract detail timeline immediately.
- Delete event is now a soft delete with related task cleanup and a confirm dialog.
