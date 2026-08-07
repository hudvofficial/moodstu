---
title: "Bảng → nơi đọc/ghi trong code"
tags: [ban-do-code, du-lieu]
sinh-tu: "scripts/vault-gen-codemap.mjs"
cap-nhat: 2026-08-07
---

# Bảng → nơi đọc/ghi trong code

> Chỉ bắt được truy cập **qua supabase-js** (`.from(...).insert/update/delete`). Ghi qua **RPC** không hiện ở đây — tra thêm [[rpc-va-enum]].

**Dùng khi nào:** trước khi viết rủi ro đồng thời hoặc đổi schema, tra bảng này xem *ai thật sự ghi được*.

## `addon_history`
**Ghi (4):** `app/actions/addon-actions.ts (insert)` · `app/actions/addon-actions.ts (update)` · `lib/services/addon-sync-service.ts (insert)` · `lib/services/addon-sync-service.ts (update)`
**Đọc (2):** `app/actions/addon-actions.ts` · `lib/services/addon-sync-service.ts`

## `ai_conversations`
**Ghi (3):** `app/actions/moodie-mutations.ts (delete)` · `app/actions/moodie-mutations.ts (insert)` · `app/actions/moodie-mutations.ts (update)`
**Đọc (4):** `app/actions/moodie-mutations.ts` · `app/actions/moodie-queries.ts` · `app/api/moodie/voice/token/route.ts` · `lib/moodie/runs/executor.ts`

## `ai_messages`
**Ghi (3):** `app/actions/moodie-mutations.ts (delete)` · `app/actions/moodie-mutations.ts (insert)` · `app/actions/moodie-mutations.ts (update)`
**Đọc (4):** `app/actions/moodie-mutations.ts` · `app/actions/moodie-observability-actions.ts` · `app/actions/moodie-queries.ts` · `lib/moodie/runs/executor.ts`

## `ai_turns`
**Ghi (2):** `app/actions/moodie-mutations.ts (insert)` · `app/actions/moodie-mutations.ts (update)`
**Đọc (1):** `app/actions/moodie-queries.ts`

## `approval_requests`
**Ghi (2):** `app/actions/inventory-mutations.ts (insert)` · `app/actions/inventory-mutations.ts (update)`
**Đọc (2):** `app/actions/inventory-mutations.ts` · `app/actions/inventory-queries.ts`

## `audit_logs`
**Ghi (2):** `app/actions/moodie-benchmark-actions.ts (insert)` · `lib/audit.ts (insert)`
**Đọc (3):** `app/(protected)/audit-logs/page.tsx` · `app/actions/audit-log-actions.ts` · `app/actions/moodie-benchmark-actions.ts`

## `budgets`
**Ghi (2):** `app/actions/goal-budget-actions.ts (update)` · `app/actions/goal-budget-actions.ts (upsert)`
**Đọc (1):** `app/actions/goal-budget-actions.ts`

## `checklist_templates`
**Ghi (0):** — *không có nơi nào ghi trực tiếp*
**Đọc (1):** `app/actions/checklist-actions.ts`

## `contract_checklists`
**Ghi (2):** `app/actions/checklist-actions.ts (insert)` · `app/actions/checklist-actions.ts (update)`
**Đọc (3):** `app/actions/checklist-actions.ts` · `app/actions/contract-queries.ts` · `lib/client-direct/contract-drawer.ts`

## `contract_events`
**Ghi (4):** `app/actions/contract-event-actions.ts (insert)` · `app/actions/contract-event-actions.ts (update)` · `app/actions/work-task-actions.ts (update)` · `lib/contract-event-google-sync.ts (update)`
**Đọc (11):** `app/actions/calendar-queries.ts` · `app/actions/contract-event-actions.ts` · `app/actions/contract-queries.ts` · `app/actions/gallery-drive-actions.ts` · `app/actions/work-task-actions.ts` · `lib/api/dashboard.ts` · `lib/client-direct/contract-drawer.ts` · `lib/contract-event-google-sync.ts` · `lib/moodie/core-engine.ts` · `lib/moodie/domain/gallery-context.ts` · `lib/moodie/tools.ts`

## `contract_items`
**Ghi (2):** `app/actions/dress-mutations.ts (insert)` · `app/actions/dress-mutations.ts (update)`
**Đọc (3):** `app/actions/contract-lifecycle.ts` · `app/actions/finance-dashboard-queries.ts` · `lib/services/dress-sync-service.ts`

## `contract_notes`
**Ghi (2):** `app/actions/note-actions.ts (delete)` · `app/actions/note-actions.ts (insert)`
**Đọc (3):** `app/actions/contract-queries.ts` · `app/actions/note-actions.ts` · `lib/client-direct/contract-drawer.ts`

## `contracts`
**Ghi (2):** `app/actions/contract-lifecycle.ts (update)` · `app/actions/contract-mutations.ts (update)`
**Đọc (22):** `app/actions/contract-event-actions.ts` · `app/actions/contract-mutations.ts` · `app/actions/contract-profit.ts` · `app/actions/contract-queries.ts` · `app/actions/contract-refund-actions.ts` · `app/actions/customer-actions.ts` · `app/actions/export-actions.ts` · `app/actions/finance-dashboard-queries.ts` · `app/actions/finance-operations-queries.ts` · `app/actions/finance-reports-queries.ts` · `app/actions/gallery-drive-actions.ts` · `app/actions/inventory-queries.ts` · `app/actions/printing-queries.ts` · `app/actions/printing-reference-queries.ts` · `app/actions/work-task-actions.ts` · `app/api/gallery-download-batch/[token]/route.ts` · `app/api/gallery-download/[token]/[imageId]/route.ts` · `lib/api/dashboard.ts` · `lib/moodie/core-engine.ts` · `lib/moodie/domain/gallery-context.ts` … +2

## `credit_cards`
**Ghi (2):** `app/actions/debt-actions.ts (insert)` · `app/actions/debt-actions.ts (update)`
**Đọc (3):** `app/(protected)/settings/credit-cards/page.tsx` · `app/actions/debt-actions.ts` · `app/actions/finance-operations-queries.ts`

## `crm_leads`
**Ghi (3):** `app/actions/lead-actions.ts (insert)` · `app/actions/lead-actions.ts (update)` · `app/actions/lead-lifecycle.ts (update)`
**Đọc (2):** `app/actions/lead-actions.ts` · `app/actions/lead-lifecycle.ts`

## `customers`
**Ghi (2):** `app/actions/customer-actions.ts (insert)` · `app/actions/customer-actions.ts (update)`
**Đọc (4):** `app/actions/contract-queries.ts` · `app/actions/customer-actions.ts` · `app/actions/export-actions.ts` · `app/actions/lead-lifecycle.ts`

## `debts`
**Ghi (2):** `app/actions/debt-actions.ts (insert)` · `app/actions/debt-actions.ts (update)`
**Đọc (2):** `app/actions/debt-actions.ts` · `app/actions/finance-operations-queries.ts`

## `dress_rentals`
**Ghi (2):** `app/actions/rental-mutations.ts (insert)` · `app/actions/rental-mutations.ts (update)`
**Đọc (4):** `app/actions/dress-mutations.ts` · `app/actions/dress-queries.ts` · `app/actions/rental-mutations.ts` · `app/actions/rental-queries.ts`

## `dress_reservations`
**Ghi (5):** `app/actions/contract-lifecycle.ts (update)` · `app/actions/dress-mutations.ts (insert)` · `app/actions/dress-mutations.ts (update)` · `lib/services/dress-sync-service.ts (insert)` · `lib/services/dress-sync-service.ts (update)`
**Đọc (5):** `app/actions/contract-lifecycle.ts` · `app/actions/dress-mutations.ts` · `app/actions/dress-queries.ts` · `app/actions/rental-mutations.ts` · `lib/services/dress-sync-service.ts`

## `dresses`
**Ghi (5):** `app/actions/contract-lifecycle.ts (update)` · `app/actions/dress-mutations.ts (insert)` · `app/actions/dress-mutations.ts (update)` · `app/actions/rental-mutations.ts (update)` · `lib/services/dress-sync-service.ts (update)`
**Đọc (5):** `app/actions/category-actions.ts` · `app/actions/dress-mutations.ts` · `app/actions/dress-queries.ts` · `app/actions/rental-mutations.ts` · `lib/hooks/use-prefetch-on-hover.ts`

## `employee_salaries`
**Ghi (3):** `app/actions/salary-actions.ts (delete)` · `app/actions/salary-actions.ts (insert)` · `app/actions/salary-actions.ts (update)`
**Đọc (2):** `app/actions/finance-operations-queries.ts` · `app/actions/salary-actions.ts`

## `employees`
**Ghi (7):** `app/actions/employee-mutations.ts (insert)` · `app/actions/employee-mutations.ts (update)` · `app/actions/profile-actions.ts (insert)` · `app/actions/profile-actions.ts (update)` · `app/actions/user-management.ts (update)` · `lib/auth_utils.ts (insert)` · `lib/auth_utils.ts (update)`
**Đọc (19):** `app/actions/calendar-queries.ts` · `app/actions/employee-mutations.ts` · `app/actions/employee-queries.ts` · `app/actions/export-actions.ts` · `app/actions/finance-close-actions.ts` · `app/actions/inventory-mutations.ts` · `app/actions/inventory-queries.ts` · `app/actions/notification-actions.ts` · `app/actions/profile-actions.ts` · `app/actions/salary-actions.ts` · `app/actions/settings-queries.ts` · `app/actions/task-assign-actions.ts` · `app/actions/user-management.ts` · `app/api/moodie/voice/token/route.ts` · `lib/auth_utils.ts` · `lib/calendar-auth.ts` · `lib/moodie/core-engine.ts` · `lib/moodie/runs/executor.ts` · `lib/moodie/tools.ts`

## `employees_public`
**Ghi (0):** — *không có nơi nào ghi trực tiếp*
**Đọc (1):** `lib/client-direct/contract-drawer.ts`

## `event_templates`
**Ghi (0):** — *không có nơi nào ghi trực tiếp*
**Đọc (1):** `app/actions/contract-event-actions.ts`

## `expenses`
**Ghi (6):** `app/actions/contract-refund-actions.ts (insert)` · `app/actions/debt-actions.ts (insert)` · `app/actions/expense-actions.ts (insert)` · `app/actions/expense-actions.ts (update)` · `app/actions/printing-workflow-mutations.ts (insert)` · `app/actions/salary-actions.ts (insert)`
**Đọc (10):** `app/actions/contract-profit.ts` · `app/actions/contract-refund-actions.ts` · `app/actions/expense-actions.ts` · `app/actions/export-actions.ts` · `app/actions/finance-category-actions.ts` · `app/actions/finance-close-actions.ts` · `app/actions/finance-dashboard-queries.ts` · `app/actions/finance-operations-queries.ts` · `app/actions/finance-reports-queries.ts` · `app/actions/goal-budget-actions.ts`

## `finance_close_tasks`
**Ghi (2):** `app/actions/finance-close-actions.ts (insert)` · `app/actions/finance-close-actions.ts (update)`
**Đọc (1):** `app/actions/finance-close-actions.ts`

## `finance_monthly_closes`
**Ghi (2):** `app/actions/finance-close-actions.ts (insert)` · `app/actions/finance-close-actions.ts (update)`
**Đọc (3):** `app/actions/finance-close-actions.ts` · `app/actions/finance-operations-queries.ts` · `lib/finance-utils.ts`

## `financial_goals`
**Ghi (2):** `app/actions/goal-budget-actions.ts (insert)` · `app/actions/goal-budget-actions.ts (update)`
**Đọc (2):** `app/actions/finance-operations-queries.ts` · `app/actions/goal-budget-actions.ts`

## `fixed_costs`
**Ghi (2):** `app/actions/fixed-cost-actions.ts (insert)` · `app/actions/fixed-cost-actions.ts (update)`
**Đọc (5):** `app/actions/expense-actions.ts` · `app/actions/finance-close-actions.ts` · `app/actions/finance-operations-queries.ts` · `app/actions/finance-reports-queries.ts` · `app/actions/fixed-cost-actions.ts`

## `galleries`
**Ghi (6):** `app/actions/gallery-admin-actions.ts (delete)` · `app/actions/gallery-admin-actions.ts (insert)` · `app/actions/gallery-admin-actions.ts (update)` · `app/actions/gallery-core.ts (update)` · `app/actions/gallery-drive-actions.ts (insert)` · `app/actions/gallery-drive-actions.ts (update)`
**Đọc (10):** `app/actions/gallery-admin-actions.ts` · `app/actions/gallery-core.ts` · `app/actions/gallery-dimensions-actions.ts` · `app/actions/gallery-drive-actions.ts` · `app/actions/gallery-public-actions.ts` · `app/actions/gallery-selection-actions.ts` · `app/actions/moodie-action-actions.ts` · `lib/gallery/blurhash.ts` · `lib/gallery/image-dimensions.ts` · `lib/moodie/domain/gallery-context.ts`

## `gallery_albums`
**Ghi (3):** `app/actions/gallery-album-actions.ts (delete)` · `app/actions/gallery-album-actions.ts (insert)` · `app/actions/gallery-album-actions.ts (update)`
**Đọc (2):** `app/actions/gallery-album-actions.ts` · `app/actions/gallery-composite-actions.ts`

## `gallery_comments`
**Ghi (2):** `app/actions/gallery-reaction-actions.ts (delete)` · `app/actions/gallery-reaction-actions.ts (upsert)`
**Đọc (2):** `app/actions/gallery-composite-actions.ts` · `app/actions/gallery-reaction-actions.ts`

## `gallery_filter_jobs`
**Ghi (3):** `app/actions/gallery-drive-actions.ts (insert)` · `app/actions/gallery-drive-actions.ts (update)` · `app/actions/gallery-selection-actions.ts (insert)`
**Đọc (1):** `app/actions/gallery-drive-actions.ts`

## `gallery_images`
**Ghi (9):** `app/actions/blurhash-actions.ts (update)` · `app/actions/gallery-admin-actions.ts (delete)` · `app/actions/gallery-admin-actions.ts (insert)` · `app/actions/gallery-album-actions.ts (update)` · `app/actions/gallery-core.ts (update)` · `app/actions/gallery-drive-actions.ts (insert)` · `app/actions/gallery-selection-actions.ts (update)` · `lib/gallery/blurhash.ts (update)` · `lib/gallery/image-dimensions.ts (update)`
**Đọc (11):** `app/actions/gallery-album-actions.ts` · `app/actions/gallery-composite-actions.ts` · `app/actions/gallery-core.ts` · `app/actions/gallery-drive-actions.ts` · `app/actions/gallery-image-helpers.ts` · `app/actions/gallery-selection-actions.ts` · `app/api/gallery-download-batch/[token]/route.ts` · `app/api/gallery-download/[token]/[imageId]/route.ts` · `lib/gallery/blurhash.ts` · `lib/gallery/image-dimensions.ts` · `lib/moodie/domain/gallery-context.ts`

## `gallery_password_attempts`
**Ghi (2):** `app/actions/gallery-public-actions.ts (delete)` · `app/actions/gallery-public-actions.ts (upsert)`
**Đọc (1):** `app/actions/gallery-public-actions.ts`

## `gallery_reactions`
**Ghi (2):** `app/actions/gallery-reaction-actions.ts (delete)` · `app/actions/gallery-reaction-actions.ts (insert)`
**Đọc (5):** `app/actions/gallery-admin-actions.ts` · `app/actions/gallery-composite-actions.ts` · `app/actions/gallery-drive-actions.ts` · `app/actions/gallery-image-helpers.ts` · `app/actions/gallery-reaction-actions.ts`

## `gallery_selection_batch_items`
**Ghi (1):** `app/actions/gallery-selection-actions.ts (insert)`
**Đọc (1):** `app/actions/gallery-selection-actions.ts`

## `gallery_selection_batches`
**Ghi (2):** `app/actions/gallery-selection-actions.ts (delete)` · `app/actions/gallery-selection-actions.ts (insert)`
**Đọc (0):** —

## `gallery_share_links`
**Ghi (2):** `app/actions/gallery-core.ts (insert)` · `app/actions/gallery-core.ts (update)`
**Đọc (2):** `app/actions/gallery-admin-actions.ts` · `app/actions/gallery-core.ts`

## `goal_contributions`
**Ghi (2):** `app/actions/goal-budget-actions.ts (delete)` · `app/actions/goal-budget-actions.ts (insert)`
**Đọc (2):** `app/actions/finance-operations-queries.ts` · `app/actions/goal-budget-actions.ts`

## `google_sync_queue`
**Ghi (4):** `app/actions/calendar-mutations.ts (upsert)` · `app/actions/moodie-action-actions.ts (insert)` · `app/api/calendar/sync-worker/route.ts (delete)` · `app/api/calendar/sync-worker/route.ts (update)`
**Đọc (1):** `app/api/calendar/sync-worker/route.ts`

## `integrity_reports`
**Ghi (0):** — *không có nơi nào ghi trực tiếp*
**Đọc (1):** `app/actions/integrity-actions.ts`

## `inventory_available_stock`
**Ghi (0):** — *không có nơi nào ghi trực tiếp*
**Đọc (1):** `app/actions/printing-workflow-mutations.ts`

## `inventory_items`
**Ghi (3):** `app/actions/inventory-mutations.ts (insert)` · `app/actions/inventory-mutations.ts (update)` · `app/actions/printing-workflow-mutations.ts (update)`
**Đọc (3):** `app/actions/inventory-mutations.ts` · `app/actions/inventory-queries.ts` · `app/actions/printing-workflow-mutations.ts`

## `inventory_reservations`
**Ghi (2):** `app/actions/printing-workflow-mutations.ts (insert)` · `app/actions/printing-workflow-mutations.ts (update)`
**Đọc (1):** `app/actions/printing-workflow-mutations.ts`

## `inventory_transactions`
**Ghi (2):** `app/actions/inventory-mutations.ts (delete)` · `app/actions/printing-workflow-mutations.ts (insert)`
**Đọc (5):** `app/actions/finance-dashboard-queries.ts` · `app/actions/finance-reports-queries.ts` · `app/actions/inventory-mutations.ts` · `app/actions/inventory-queries.ts` · `app/actions/printing-workflow-mutations.ts`

## `investment_maintenance_logs`
**Ghi (1):** `app/actions/investment-actions.ts (insert)`
**Đọc (0):** —

## `investments`
**Ghi (2):** `app/actions/investment-actions.ts (insert)` · `app/actions/investment-actions.ts (update)`
**Đọc (2):** `app/actions/finance-operations-queries.ts` · `app/actions/investment-actions.ts`

## `lab_payment_allocations`
**Ghi (0):** — *không có nơi nào ghi trực tiếp*
**Đọc (1):** `app/actions/lab-queries.ts`

## `lab_payments`
**Ghi (0):** — *không có nơi nào ghi trực tiếp*
**Đọc (1):** `app/actions/lab-queries.ts`

## `lab_services`
**Ghi (3):** `app/actions/lab-mutations.ts (delete)` · `app/actions/lab-mutations.ts (insert)` · `app/actions/lab-mutations.ts (update)`
**Đọc (1):** `app/actions/lab-queries.ts`

## `labs`
**Ghi (2):** `app/actions/lab-mutations.ts (insert)` · `app/actions/lab-mutations.ts (update)`
**Đọc (2):** `app/actions/lab-queries.ts` · `app/actions/printing-queries.ts`

## `login_attempts`
**Ghi (3):** `app/actions/auth.ts (delete)` · `app/actions/auth.ts (insert)` · `app/actions/auth.ts (update)`
**Đọc (1):** `app/actions/auth.ts`

## `monthly_salaries`
**Ghi (2):** `app/actions/salary-actions.ts (insert)` · `app/actions/salary-actions.ts (update)`
**Đọc (4):** `app/actions/finance-close-actions.ts` · `app/actions/finance-operations-queries.ts` · `app/actions/finance-reports-queries.ts` · `app/actions/salary-actions.ts`

## `moodie_action_approvals`
**Ghi (2):** `app/actions/moodie-action-actions.ts (insert)` · `app/actions/moodie-action-actions.ts (update)`
**Đọc (1):** `app/actions/moodie-action-actions.ts`

## `moodie_agent_run_events`
**Ghi (3):** `lib/moodie/runs/repository.ts (insert)` · `lib/moodie/runs/repository.ts (upsert)` · `lib/moodie/runs/worker.ts (insert)`
**Đọc (3):** `app/api/moodie/runs/route.ts` · `lib/moodie/runs/repository.ts` · `lib/moodie/runs/worker.ts`

## `moodie_agent_runs`
**Ghi (3):** `lib/moodie/runs/repository.ts (insert)` · `lib/moodie/runs/repository.ts (update)` · `lib/moodie/runs/worker.ts (update)`
**Đọc (3):** `app/api/moodie/runs/[runId]/retry/route.ts` · `app/api/moodie/runs/route.ts` · `lib/moodie/runs/repository.ts`

## `moodie_memories`
**Ghi (5):** `app/actions/moodie-memory-actions.ts (delete)` · `app/actions/moodie-memory-actions.ts (insert)` · `app/actions/moodie-memory-actions.ts (update)` · `lib/moodie/memory-store.ts (insert)` · `lib/moodie/memory-store.ts (update)`
**Đọc (3):** `app/actions/moodie-memory-actions.ts` · `lib/moodie/memory-consolidator.ts` · `lib/moodie/memory-store.ts`

## `moodie_memory_relations`
**Ghi (1):** `lib/moodie/memory-store.ts (insert)`
**Đọc (0):** —

## `moodie_message_feedback`
**Ghi (1):** `app/actions/moodie-mutations.ts (upsert)`
**Đọc (0):** —

## `moodie_observations`
**Ghi (2):** `lib/moodie/observation-store.ts (insert)` · `lib/moodie/observation-store.ts (update)`
**Đọc (1):** `lib/moodie/observation-store.ts`

## `moodie_voice_events`
**Ghi (2):** `app/api/moodie/voice/events/route.ts (upsert)` · `app/api/moodie/voice/token/route.ts (insert)`
**Đọc (0):** —

## `moodie_voice_sessions`
**Ghi (2):** `app/api/moodie/voice/events/route.ts (update)` · `app/api/moodie/voice/token/route.ts (insert)`
**Đọc (2):** `app/api/moodie/voice/events/route.ts` · `app/api/moodie/voice/token/route.ts`

## `moodie_voice_turns`
**Ghi (1):** `app/api/moodie/voice/events/route.ts (upsert)`
**Đọc (1):** `app/api/moodie/voice/events/route.ts`

## `notification_preferences`
**Ghi (2):** `app/actions/notification-actions.ts (upsert)` · `app/actions/settings-queries.ts (upsert)`
**Đọc (2):** `app/actions/notification-actions.ts` · `app/actions/settings-queries.ts`

## `notification_queue`
**Ghi (2):** `app/actions/inventory-mutations.ts (insert)` · `app/actions/notification-actions.ts (update)`
**Đọc (1):** `app/actions/notification-actions.ts`

## `order_payment_summary`
**Ghi (0):** — *không có nơi nào ghi trực tiếp*
**Đọc (2):** `app/actions/printing-queries.ts` · `app/actions/printing-workflow-mutations.ts`

## `order_payments`
**Ghi (1):** `app/actions/printing-workflow-mutations.ts (insert)`
**Đọc (1):** `app/actions/printing-queries.ts`

## `payment_plans`
**Ghi (1):** `app/actions/contract-lifecycle.ts (update)`
**Đọc (4):** `app/actions/contract-queries.ts` · `app/actions/payment-actions.ts` · `lib/api/dashboard.ts` · `lib/client-direct/contract-drawer.ts`

## `payments`
**Ghi (1):** `app/actions/contract-mutations.ts (update)`
**Đọc (7):** `app/actions/contract-mutations.ts` · `app/actions/contract-queries.ts` · `app/actions/finance-close-actions.ts` · `app/actions/finance-dashboard-queries.ts` · `app/actions/finance-operations-queries.ts` · `app/actions/finance-reports-queries.ts` · `lib/api/dashboard.ts`

## `price_rules`
**Ghi (2):** `app/actions/builder-actions.ts (insert)` · `app/actions/builder-actions.ts (update)`
**Đọc (1):** `app/actions/builder-actions.ts`

## `printing_order_status_history`
**Ghi (1):** `app/actions/printing-mutations.ts (insert)`
**Đọc (0):** —

## `printing_orders`
**Ghi (4):** `app/actions/contract-lifecycle.ts (update)` · `app/actions/printing-actions.ts (update)` · `app/actions/printing-mutations.ts (update)` · `app/actions/printing-workflow-mutations.ts (update)`
**Đọc (8):** `app/actions/contract-profit.ts` · `app/actions/finance-dashboard-queries.ts` · `app/actions/finance-reports-queries.ts` · `app/actions/lab-mutations.ts` · `app/actions/lab-queries.ts` · `app/actions/printing-mutations.ts` · `app/actions/printing-queries.ts` · `app/actions/printing-workflow-mutations.ts`

## `push_subscriptions`
**Ghi (4):** `app/api/push/send/route.ts (delete)` · `app/api/push/subscribe/route.ts (delete)` · `app/api/push/subscribe/route.ts (upsert)` · `lib/push-notification.ts (delete)`
**Đọc (2):** `app/api/push/send/route.ts` · `lib/push-notification.ts`

## `receipts`
**Ghi (4):** `app/actions/debt-actions.ts (insert)` · `app/actions/printing-workflow-mutations.ts (insert)` · `app/actions/receipt-actions.ts (insert)` · `app/actions/receipt-actions.ts (update)`
**Đọc (8):** `app/actions/export-actions.ts` · `app/actions/finance-category-actions.ts` · `app/actions/finance-close-actions.ts` · `app/actions/finance-dashboard-queries.ts` · `app/actions/finance-operations-queries.ts` · `app/actions/finance-reports-queries.ts` · `app/actions/receipt-actions.ts` · `lib/api/dashboard.ts`

## `salary_adjustments`
**Ghi (2):** `app/actions/salary-actions.ts (delete)` · `app/actions/salary-actions.ts (insert)`
**Đọc (1):** `app/actions/salary-actions.ts`

## `schedules`
**Ghi (7):** `app/actions/calendar-mutations.ts (delete)` · `app/actions/calendar-mutations.ts (insert)` · `app/actions/calendar-mutations.ts (update)` · `app/actions/schedule-actions.ts (delete)` · `app/actions/schedule-actions.ts (insert)` · `app/actions/schedule-actions.ts (update)` · `app/api/calendar/sync-worker/route.ts (update)`
**Đọc (6):** `app/actions/calendar-queries.ts` · `app/actions/calendar-task-actions.ts` · `app/actions/moodie-action-actions.ts` · `app/api/calendar/sync-worker/route.ts` · `lib/api/dashboard.ts` · `lib/calendar-auth.ts`

## `service_bundles`
**Ghi (0):** — *không có nơi nào ghi trực tiếp*
**Đọc (1):** `app/actions/service-queries.ts`

## `service_categories`
**Ghi (3):** `app/actions/category-actions.ts (delete)` · `app/actions/category-actions.ts (insert)` · `app/actions/category-actions.ts (update)`
**Đọc (1):** `app/actions/service-queries.ts`

## `service_relations`
**Ghi (2):** `app/actions/builder-actions.ts (insert)` · `app/actions/builder-actions.ts (update)`
**Đọc (1):** `app/actions/builder-actions.ts`

## `services`
**Ghi (0):** — *không có nơi nào ghi trực tiếp*
**Đọc (4):** `app/actions/category-actions.ts` · `app/actions/service-queries.ts` · `lib/moodie/core-engine.ts` · `lib/moodie/tools.ts`

## `studio_info`
**Ghi (5):** `app/actions/settings-mutations.ts (update)` · `app/api/auth/google/callback/route.ts (insert)` · `app/api/auth/google/callback/route.ts (update)` · `lib/google-auth.ts (update)` · `lib/studio-info.ts (insert)`
**Đọc (6):** `app/actions/calendar-queries.ts` · `app/actions/gallery-drive-actions.ts` · `app/api/auth/google/callback/route.ts` · `lib/googleCalendarService.ts` · `lib/productivity-auth.ts` · `lib/studio-info.ts`

## `system_settings`
**Ghi (2):** `app/actions/moodie-provider-actions.ts (upsert)` · `app/actions/settings-mutations.ts (upsert)`
**Đọc (6):** `lib/moodie/brave-config.ts` · `lib/moodie/browser-config.ts` · `lib/moodie/providers/registry.ts` · `lib/moodie/voice-config.ts` · `lib/moodie/voice-live-config.ts` · `lib/system-settings.ts`

## `transaction_categories`
**Ghi (4):** `app/actions/contract-refund-actions.ts (insert)` · `app/actions/finance-category-actions.ts (delete)` · `app/actions/finance-category-actions.ts (insert)` · `app/actions/finance-category-actions.ts (update)`
**Đọc (6):** `app/actions/contract-refund-actions.ts` · `app/actions/expense-actions.ts` · `app/actions/finance-category-actions.ts` · `app/actions/finance-operations-queries.ts` · `app/actions/goal-budget-actions.ts` · `app/actions/payment-actions.ts`

## `vendor_payment_allocations`
**Ghi (0):** — *không có nơi nào ghi trực tiếp*
**Đọc (1):** `app/actions/vendor-payment-actions.ts`

## `vendor_payments`
**Ghi (2):** `app/actions/vendor-actions.ts (update)` · `app/actions/vendor-payment-actions.ts (delete)`
**Đọc (1):** `app/actions/vendor-payment-actions.ts`

## `vendors`
**Ghi (2):** `app/actions/vendor-actions.ts (insert)` · `app/actions/vendor-actions.ts (update)`
**Đọc (3):** `app/actions/vendor-actions.ts` · `app/actions/vendor-payment-actions.ts` · `app/actions/vendor-reports-queries.ts`

## `work_tasks`
**Ghi (8):** `app/actions/calendar-mutations.ts (update)` · `app/actions/calendar-task-actions.ts (update)` · `app/actions/contract-lifecycle.ts (update)` · `app/actions/task-assign-actions.ts (update)` · `app/actions/vendor-actions.ts (update)` · `app/actions/work-task-actions.ts (delete)` · `app/actions/work-task-actions.ts (insert)` · `app/actions/work-task-actions.ts (update)`
**Đọc (19):** `app/actions/calendar-task-actions.ts` · `app/actions/contract-event-actions.ts` · `app/actions/contract-mutations.ts` · `app/actions/contract-profit.ts` · `app/actions/contract-queries.ts` · `app/actions/finance-dashboard-queries.ts` · `app/actions/finance-reports-queries.ts` · `app/actions/salary-actions.ts` · `app/actions/task-assign-actions.ts` · `app/actions/task-overlap-actions.ts` · `app/actions/vendor-payment-actions.ts` · `app/actions/vendor-reports-queries.ts` · `app/actions/work-task-actions.ts` · `components/finance/salaries/payslip-modal.tsx` · `lib/api/dashboard.ts` · `lib/calendar-auth.ts` · `lib/client-direct/contract-drawer.ts` · `lib/moodie/core-engine.ts` · `lib/moodie/tools.ts`
