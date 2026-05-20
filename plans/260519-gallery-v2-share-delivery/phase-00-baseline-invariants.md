# Phase 00: Baseline & Operational Invariants

Status: ⬜ Pending  
Goal: Chốt hiện trạng và nguyên tắc vận hành trước khi sửa.

## Audit Baseline

Known real gallery:

- Contract: `fb09f2ed-a7ea-4d58-b4de-533d3beb3b25`
- Contract code: `HĐ-2026-0001`
- Customer: `CD My`, phone `0987888999`
- Payment: `da_thanh_toan`, remaining `0`
- Gallery: `3b69fb5e-641f-41a1-9438-427c9a55c1f8`
- Access URL: `0c3g9SRt8gQ8`
- Title: `Ảnh gốc`
- Status: `draft`
- Images: `415`
- Selected/comment/reaction/albums: `0`

## Invariants

- Public album links must not expose unapproved original downloads.
- Social preview may expose album cover and customer-facing title.
- Gallery content remains `noindex`, even when social preview works.
- Select/view/download rights are server-enforced.
- Admin Drive copy copies files; it does not move or delete photographer originals.
- JPG-only selected filtering in this plan.
- Local filtering must produce missing/duplicate reports, not silently skip.

## Required Confirmation Before Phase 01

- Confirm naming pattern for share links:
  - Proposed select: `/gallery/s/[slug]`
  - Proposed view: `/gallery/v/[slug]`
  - Proposed future download: `/gallery/d/[slug]`
- Confirm OG title format:
  - Proposed: `Album ảnh cưới {bride} & {groom} | Mood Studio`
- Confirm selected Drive folder naming:
  - Proposed: `Selected - {contract_code} - {customer_name}`

## Acceptance

- Baseline documented.
- Any later code phase references these invariants.
- No code changes in this phase.

