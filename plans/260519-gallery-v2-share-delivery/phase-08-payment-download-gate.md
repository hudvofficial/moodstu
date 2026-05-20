# Phase 08: Payment-Aware Download Gate

Status: ⬜ Pending  
Goal: Original/download delivery is secure and tied to payment/unlock rules.

## Current Gap

`/api/drive-download/[fileId]` accepts a Drive file id and streams the file if Drive API key can access it. It does not check:

- whether file belongs to a gallery,
- whether requester has select/view/download rights,
- whether the contract is paid,
- whether downloads are enabled.

## Target Rules

Admin:

- Authenticated admin/manager/sale with contract permission can download as internal operation.

Client:

- View-only link: no download.
- Select link: no original download unless explicitly enabled.
- Download link: requires valid download capability and payment/unlock gate.

Payment gate:

- If `contracts.payment_status = da_thanh_toan` or `remaining_amount <= 0`, eligible.
- Otherwise require manual admin unlock.

## Endpoint Strategy

Replace direct public file id downloads with signed/gated routes:

- `/api/gallery-download/[token]/[imageId]`
- `/api/gallery-download-batch/[token]`

The endpoint resolves:

1. token/capability,
2. gallery,
3. image belongs to gallery,
4. contract payment/download state,
5. Drive file id.

## Acceptance

- Random `drive_file_id` cannot be downloaded without permission.
- Paid contract can expose download only after allowed.
- Unpaid contract does not expose original delivery.
- Admin download remains available.
