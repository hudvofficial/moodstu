# Module Index — mood-studio

> Cap nhat: 2026-06-20
> Dung de: Main agent tra nhanh trang thai module truoc khi lap plan

## Dashboard

| Module | Spec | Plan gan nhat | Audit gan nhat | Status |
|--------|------|---------------|----------------|--------|
| **contracts** | [spec](specs/contracts.md) | [tablet-ux](plans/260617-tablet-ux-foundation/plan.md) | — | Active dev |
| **calendar** | [spec](specs/calendar.md) | [calendar-v2](plans/260404-1200-calendar-v2/) | — | Stable |
| **crm** | [spec](specs/crm.md) | [crm-v2](plans/260408-2226-crm-v2/) | — | Stable |
| **dresses** | [spec](specs/dresses.md) | — | — | Stable |
| **employees** | [spec](specs/employees.md) | — | — | Stable |
| **finance** | [spec](specs/finance.md) | [finance-goals](plans/260417-0138-finance-goals-ui-fix/) | — | Stable |
| **inventory** | [spec](specs/inventory.md) | — | — | Stable |
| **printing** | [spec](specs/printing.md) | — | — | Active dev |
| **productivity** | [spec](specs/productivity.md) | [perf-ux](plans/260423-0807-performance-ux-international-standard/) | — | Stable |
| **services** | [spec](specs/services.md) | [services-refactor](plans/260331-1559-services-refactor/) | — | Stable |
| **settings** | [spec](specs/settings.md) | — | — | Stable |
| **auth** | [spec](specs/auth-password-recovery.md) | — | — | Stable |

## Sang kien dang chay

| Sang kien | Plan | Status | Ghi chu |
|-----------|------|--------|---------|
| Native-feel Performance | [PLAN](../plans/260603-native-feel-performance/PLAN.md) | Active | Doc LESSONS.md truoc moi task |
| Tablet Design Layer | [PLAN](../plans/260606-tablet-design-layer/PLAN.md) | Active | 3-tier responsive |
| Tablet UX Foundation | [plan](plans/260617-tablet-ux-foundation/plan.md) | Active | Contracts PoC |

## Templates

| Template | Duong dan | Ai dung |
|----------|-----------|---------|
| BRIEF | [BRIEF.template.md](templates/BRIEF.template.md) | User / Main agent |
| PLAN | [PLAN.template.md](templates/PLAN.template.md) | Main agent (Plan) |
| REVIEW | [REVIEW.template.md](templates/REVIEW.template.md) | Reviewer agent |
| AUDIT | [AUDIT.template.md](templates/AUDIT.template.md) | Reviewer agent (periodic) |
| Module spec | [v2-module-template.md](specs/v2-module-template.md) | Coder agent |

## Cach dung

1. **Nhan task moi:** Main agent doc MODULE-INDEX → tim spec + plan hien tai → tao BRIEF
2. **Lap plan:** Main agent dung PLAN template → verify CLAUDE.md §5 (self-review checklist)
3. **Coder xong:** Main agent goi reviewer voi REVIEW template
4. **Dinh ky (2 tuan/lan):** Chay AUDIT template tren module dang active dev
5. **Cap nhat INDEX:** Sau moi plan/audit moi, update bang Dashboard
