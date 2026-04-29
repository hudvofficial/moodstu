# Phase 03 - Security, RBAC, and Privacy

## Objective

Make dashboard data visibility intentional and enforce it at the server boundary.

## Tasks

1. Add a dashboard access helper or reuse the existing auth pattern if one already exists.
2. Decide role visibility for each widget:
   - admin
   - manager
   - sale
   - viewer
   - media
   - finance roles if present
3. Redact or omit finance-sensitive metrics for roles that should not see them.
4. Ensure quick access modules are filtered by role.
5. Ensure server-side data loaders enforce the same visibility as the UI.
6. Verify no service-role/admin client query exposes data without an explicit guard.
7. Add tests or smoke assertions for role-specific payloads.

## Acceptance Criteria

- Unauthorized users cannot fetch sensitive dashboard data by calling server actions directly.
- Role-specific UI and server payloads match.
- Finance-sensitive fields are never sent to roles that should not see them.
- Access failures produce controlled errors or redirects.

## Status

Completed.

Dashboard visibility is role-aware: financial data is limited to admin/manager, contract data to admin/manager/sale, calendar data to admin/manager/sale/media, and quick access is filtered by module permission.
