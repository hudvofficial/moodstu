# Plan: CRM Module V2 - Implementation
Created: 2026-04-08T22:26+07:00
Status: 🟡 In Progress
Source Spec: `docs/specs/crm.md`

## Overview
Implementation of the CRM Module V2 to enforce data integrity, establish Role-Based Access Control, migrate to the Design System V2 (SSOT), and align with the "Gold Standard" architecture. 

## Tech Stack
- Frontend: Next.js + React Components (Functional) + Tailwind v4 CSS (@theme tokens) 
- Backend: Supabase Server Actions
- DB / State: Supabase Postgres (RLS bypassed internally by `withAuth`, RBAC handled via custom checks), optimistic locking.
- Validation: Zod

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Action Hardening (Zod + Audit + Lock + RBAC + DB Soft Delete) | ⬜ Pending | 0% |
| 02 | Route, Layout & Lead List Page | ⬜ Pending | 0% |
| 03 | Lead Form & Detail Drawer | ⬜ Pending | 0% |
| 04 | Customer List & Detail | ⬜ Pending | 0% |
| 05 | Sidebar, Navigation & Polish | ⬜ Pending | 0% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Next Step: `/next`
- Force Check Context: `/recap`
