# Contracts Module Logic & Permission Audit

## 1. Role and Permission Gates
- **Route Level (pp/(protected)/contracts/layout.tsx)**: Validates that the active user's role has the \contracts\ permission using \canAccess(context.shellRole, "contracts")\. If the user lacks access, they are redirected to \/dashboard\. Disabled employees are blocked upstream by \pp/(protected)/layout.tsx\.
- **Query Layer (pp/actions/contract-queries.ts)**: Uses \withAuthRead\ wrapping \equireContractAccess(supabase, userId)\ for all read operations. The action strictly performs an employee/role DB lookup by userId to verify active status and module permission.
- **Write/Destructive Layer (pp/actions/contract-mutations.ts, \contract-event-actions.ts\, \contract-lifecycle.ts\, etc.)**: 
  - \equireContractWriteAccess\: Ensures the user holds \dmin\, \manager\, or \sale\ role before they can modify contract data (edit, add tasks, quick actions).
  - \equireContractDestructiveAccess\: Ensures the user holds \dmin\ or \manager\ role before executing lifecycle state changes (canceling, deleting).
- **Sub-module Access (pp/actions/contract-refund-actions.ts)**: Cross-validates multiple roles, requiring both \equireContractDestructiveAccess\ and \equireFinanceAccess\ for refund operations.

## 2. Disabled Employee Behavior
- Disabled employees (isEmployeeDisabled) are intercepted globally in \pp/(protected)/layout.tsx\ and redirected to \/account-disabled\.
- Within the UI context (lib/auth_utils.ts), \esolveActiveUserRole\ explicitly checks !isActiveEmployeeContext(employee) and throws "Tài khoản nhân viên đã bị vô hiệu hóa" if disabled context persists into a server action.
- The active employee list for assignable tasks/notes correctly queries getActiveEmployees() which filters out deleted/disabled statuses.

## 3. UI and Edge Case Handling (Detail/Form/Actions)
- **Canceled State (Cancel Banner)**: isCancelled logic is universally respected across the Detail view (\ContractDetailClient\, \CancelBanner\). When \status === "da_huy"\, the Mobile Bottom Bar is hidden, Action buttons (Sửa/Chỉnh sửa) are disabled/hidden, and the banner explains the canceled state.
- **Form State (Edit/Create)**: The employee dropdown (\ContractInfoSection\) safely handles assigned-but-disabled employees by showing "Nhân viên đã lưu" if the ssigned_to ID is not in the active employee payload.
- **Task & Event Management**:
  - Task completion uses optimistic UI updates (pplyTaskStatusOptimistic) to reflect completion state.
  - Role verification guarantees that CTV/Viewer roles cannot delete or create events by stripping access via equireContractWriteAccess.
  - When deleting a contract, the \ContractActionsMenu\ blocks deletion if \hasReceipts\ is true, ensuring financial integrity. An explicit code confirmation input (\contractCode\) is required before destructive execution.
- **Permissions on the UI Layer**: The Quick Note, Print Order, and Gallery links pass standard API mutation checks.

## 4. Stale Data & Realtime Mitigation
- The \ContractDetailClient\ handles concurrent multi-user writes by employing Supabase Realtime multi-channel patching (\patchContractRealtimePayload\).
- When concurrent edits occur (e.g., Task statuses, checklist checkboxes, new notes), the realtime patch dynamically maps the \id\ matching array in memory without a full re-fetch.
- Hard cache invalidations (\evalidateContractDetailCaches\) are used explicitly when a major lifecycle transition occurs (Cancel, Delete, Payment Void/Add).

## Conclusion
No unhandled logic bypasses or broken state transitions were found in the scope evaluated. Roles correctly map to equireContract*Access functions preventing execution on unauthorized requests, and the UI adapts cleanly to canceled contracts.
