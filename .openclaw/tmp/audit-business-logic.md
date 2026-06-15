# Audit: Contracts Business & Finance Logic

Workspace: `C:\Users\Admin\Desktop\Ai\mood saas\mood-studio`\n\n## Scope covered\n\nThis audit searched and reviewed contract-related business logic across:

- `lib/` for contract, pricing, finance, payment, gallery, Google Drive, and delivery helpers.
- `app/actions/` because the main Next.js server-side business logic lives there, not only in `app/api/`.
- `app/api/` for HTTP routes related to contract prefetch and gallery/download flows.
- `constants/` for service/color/type constants.
- Gallery/photo/image delivery and external image intake flows in contract context.

Key files reviewed include:

- `lib/validations/contract.schema.ts`
- `lib/contracts/payment-plans.ts`
- `lib/logic/bundle-calculator.ts`
- `lib/utils/service-utils.ts`
- `lib/google-drive.ts`
- `lib/gallery-access.ts`
- `lib/gallery-download.ts`
- `app/actions/contract-mutations.ts`
- `app/actions/contract-queries.ts`
- `app/actions/contract-lifecycle.ts`
- `app/actions/contract-profit.ts`
- `app/actions/contract-refund-actions.ts`
- `app/actions/payment-actions.ts`
- `app/actions/receipt-actions.ts`
- `app/actions/gallery-admin-actions.ts`
- `app/actions/gallery-drive-actions.ts`
- `app/actions/gallery-selection-actions.ts`
- `app/actions/gallery-public-actions.ts`
- `app/actions/gallery-dimensions-actions.ts`
- `app/actions/task-assign-actions.ts`
- `app/api/contracts/[id]/prefetch/route.ts`
- `app/api/gallery-download/[token]/[imageId]/route.ts`
- `app/api/gallery-download-batch/[token]/route.ts`
- `app/api/drive-download/[fileId]/route.ts`
- `constants/service-colors.ts`

---

## 1. Business logic xử lý hợp đồng: tạo, cập nhật, tính giá

### Main contract mutation flow

Primary file: `app/actions/contract-mutations.ts`

The create/update contract flow is implemented as server actions. The typical responsibilities are:

- Validate incoming payload using `contractSubmissionSchema` from `lib/validations/contract.schema.ts`.
- Enforce authenticated access via contract permissions from `lib/auth_utils`.
- Build contract payload fields such as customer, service type, dates, totals, status, payment status, description, notes, items, events, and plans.
- Insert/update the main `contracts` row.
- Insert/update dependent entities such as:
  - `contract_items`
  - payment plans / allocations
  - contract events
  - checklist/event-generation records
  - dress reservation sync records where applicable
- Schedule post-save jobs such as:
  - dress reservation/status sync
  - checklist/events generation
  - Google Calendar sync through `lib/contract-event-google-sync.ts`
  - addon history updates
- Invalidate contract, finance, dress, calendar, dashboard, and related pages.
- Write audit logs.

The business logic is therefore split between direct server-action orchestration and database RPCs/triggers for atomic sections.

### Validation schema

Primary file: `lib/validations/contract.schema.ts`

Important validated fields include:

- Service types: `studio`, `ngay_cuoi`, `combo`, `baby`, `gia_dinh`, `sinh_nhat`, `bau`, `concept`, `couple`, `ky_yeu`, `media`, `khac`.
- Contract item types.
- Payment methods.
- Transaction types.
- Assigned employee ID as UUID or empty string.
- Date/status/description/notes fields.

This schema is a major boundary for business invariants before persistence.

### Lifecycle logic

Primary file: `app/actions/contract-lifecycle.ts`

Lifecycle operations include:

- `cancelContract(contractId, reason)`:
  - Requires destructive contract access.
  - Requires a non-empty cancellation reason.
  - Calls RPC `cancel_contract_cascade` for DB-level consistency.
  - Cancels active dress reservations for the contract.
  - Schedules Google Calendar cleanup.
  - Invalidates related contract/finance/dress/printing/dashboard views.
  - Writes warning-level audit log.

- `deleteContract(contractId)`:
  - Requires destructive contract access.
  - Calls RPC `delete_contract_cascade`.
  - Cancels active dress reservations.
  - Schedules Google Calendar cleanup.
  - Invalidates related paths.
  - Writes delete audit log.

- `reactivateContract(contractId)`:
  - Reverses cancellation and sets contract back toward an active state.
  - Reactivates cancelled payment plans.
  - Recreates or syncs dress reservations for active dress items.
  - Refreshes dress statuses.
  - Schedules Google event sync.

### Contract reads and stats

Primary file: `app/actions/contract-queries.ts`

Important read-side logic:

- `getNextContractCode()` generates a preview code like `HĐ-YYYY-0001`. The comment notes the actual code is still generated server-side on submit.
- `getContractList(filters)` tries RPC `get_contract_list_v2`, then falls back to Supabase queries.
- Filters include status, search, service type, sort order, time filters, date range.
- Contract list enriches rows with work tasks, checklist summaries, and recent notes.
- `getContractStats()` tries RPCs such as `contract_stats` / `contract_stats_simple`, then falls back to multiple count queries.

---

## 2. Cách tính giá dịch vụ trong hợp đồng

### Bundle/service calculator

Primary file: `lib/logic/bundle-calculator.ts`

The pricing model is a pure calculator:

- Item subtotal = `selling_price * quantity`.
- Original total is the sum of all item subtotals.
- Active price rules are sorted by priority.
- Rules can include conditions such as `min_quantity`.
- Rule actions apply discounts.
- Output includes:
  - original total
  - discount amount
  - final total
  - applied rules
  - item breakdown

This appears to be the central pure pricing function for bundled services/items.

### Service utility calculations

Primary file: `lib/utils/service-utils.ts`

Notable helper:

- `calculateServiceStats` uses `selling_price` to calculate summary/service statistics.
- The file also contains service content parsing helpers.

### Payment plan normalization

Primary file: `lib/contracts/payment-plans.ts`

This module maps raw DB rows into normalized payment-plan objects:

- Reads payment-plan rows and `payment_plan_allocations`.
- Calculates `paidAmount` from allocations.
- Calculates `remainingAmount` from target amount minus paid amount.
- Derives status:
  - `pending`
  - `partial`
  - `paid`
  - `cancelled`
- Status is derived from both raw status and amounts.

### Contract payment and phát sinh logic\n
Primary file: `app/actions/payment-actions.ts`

Important behaviors:

- Creates contract payment receipts after validation.
- Validates payment-plan status before payment allocation.
- Checks finance period locks via finance utilities.
- Uses atomic RPC/update logic to update contract financial fields.
- Supports an `updateTotal` mode for phát sinh, meaning contract total can be adjusted when a payment/receipt reflects additional charges.

### Receipts

Primary file: `app/actions/receipt-actions.ts`

Important behaviors:

- Handles receipt CRUD and sales receipts.
- Prevents deleting contract payment receipts from the generic receipts list.
- Contract payment receipts must be handled from the contract detail context.
- Checks finance period locks before mutation.

### Refunds

Primary file: `app/actions/contract-refund-actions.ts`

Important behaviors:

- Refunds require both destructive contract access and finance access.
- Refunds are only allowed after a contract status is `da_huy`.
- Refund amount cannot exceed `paidAmount - alreadyRefundedAmount`.
- Refunds are recorded as `expenses` under a refund category such as `contract_refund`.
- Refund category is created if missing.
- Finance period lock is checked before inserting the expense.

### Profit calculation

Primary file: `app/actions/contract-profit.ts`

Profit is calculated as:

```text
grossProfit = totalAmount - (taskCost + printCost + expenseCost)
profitMargin = grossProfit / totalAmount * 100
```

Details:

- Revenue comes from `contracts.total_amount`.
- Paid amount comes from `contracts.paid_amount`.
- Task cost comes from `work_tasks.cost`.
- Print cost comes from `printing_orders.total_amount`.
- Expense cost comes from `expenses.amount` linked to the contract.
- Expenses whose description starts with `[Auto-Print]` are excluded to avoid double counting print cost.
- Batch calculation chunks contract IDs in groups of 50.

---

## 3. Cách gắn thợ/nhân viên vào hợp đồng

### Task assignment model

Primary file: `app/actions/task-assign-actions.ts`

Employee/photographer assignment appears to be modeled through `work_tasks`, not directly as a single `photographer_id` field on `contracts`.

Important functions:

- `assignTask(input: { taskId, employeeId, cost? })`
- `updateTaskDeadline(input: { taskId, newDeadline })`
- `updateTaskDetails(input: { taskId, newDeadline, assigneeId?, status })`
- `checkEmployeeAvailability(employeeId, targetDate, ignoreTaskId?)`

Important fields:

- `work_tasks.assigned_to`: employee ID.
- `work_tasks.contract_id`: links task to contract.
- `work_tasks.deadline`: scheduling date.
- `work_tasks.status`: e.g. `dang_lam`, `da_huy`.
- `work_tasks.cost`: staff/task cost included in profit calculation.
- `work_tasks.work_type`: used in list/detail views and availability queries.

### Permission rules

Assignment actions enforce role-based rules:

- The employee profile is loaded from `employees` by `auth_user_id`.
- User role is normalized through `normalizeRole`.
- User must have `calendar` permission to mutate tasks.
- Admin/manager users can assign globally.
- Non-admin users can only assign tasks to themselves.
- Non-admin users cannot take tasks already assigned to someone else.
- Non-admin users cannot edit tasks assigned to someone else.
- Availability checks are restricted so non-admin users can only inspect their own schedule.

### Financial effect of assignment

Assigned work-task cost feeds contract profit:

- `app/actions/contract-profit.ts` sums `work_tasks.cost` for a contract.
- Therefore assigning a photographer/employee with a cost changes profitability but does not directly change contract revenue.

---

## 4. Flow xử lý ảnh/gallery trong hợp đồng

### Gallery creation from Google Drive

Primary files:

- `app/actions/gallery-admin-actions.ts`
- `app/actions/gallery-drive-actions.ts`
- `lib/google-drive.ts`

Basic flow:

1. Admin/user with contract access provides a Google Drive folder URL.
2. `parseDriveFolderUrl` extracts the Drive folder ID from supported URL forms.
3. The app calls Google Drive API using `GOOGLE_DRIVE_API_KEY` to fetch image files.
4. A row is inserted into `galleries` with:
   - `contract_id`
   - `title`
   - `access_url`
   - `drive_folder_id`
   - `drive_folder_url`
   - `folder_type` where relevant
   - `status: draft`
   - sharing/display settings such as comments, watermark, namecard, download, selection limit.
5. Each Drive image is inserted into `gallery_images` with:
   - `gallery_id`
   - `drive_file_id`
   - `file_name`
   - `file_group`
   - `image_url`
   - `thumbnail_url`
   - `sort_order`
6. Background jobs can backfill dimensions and blurhash values.

### Multi-folder contract gallery flow

Primary file: `app/actions/gallery-drive-actions.ts`

`createMultiFolderGalleries(contractId, parentDriveUrl)` supports a parent Drive folder containing child folders. It:

- Fetches subfolders from the parent Drive folder.
- Detects folder type from subfolder names using patterns in `lib/google-drive.ts`:
  - `goc`: original/raw images
  - `da_sua`: edited/retouched images
  - `chon_in`: selected/print images
- Creates at most one gallery per detected folder type per contract.
- Falls back to creating a single `Ảnh gốc` gallery when no subfolders are found.

This is the main external-image intake and classification flow for contract delivery.

### Gallery settings and access

Primary files:

- `app/actions/gallery-admin-actions.ts`
- `app/actions/gallery-public-actions.ts`
- `lib/gallery-access.ts`

Gallery settings include:

- custom slug
- client name
- tags
- comments enabled/disabled
- watermark enabled/disabled
- namecard display
- download allowed/disallowed
- selection limit
- password/share settings depending on helper functions

Public gallery access uses signed/proof-based access links and access-version checks to invalidate old links when access settings change.

### Client selection and notes

Primary file: `app/actions/gallery-selection-actions.ts`

Important functions:

- `toggleImageSelection(imageId, selected, accessUrl?, accessToken?)`
- `updateClientNote(imageId, note, accessUrl?, accessToken?)`
- `toggleImageStar(imageId, starred)`
- `getSelectedImages(galleryId)`

Client/public access path:

- Uses `requirePublicGalleryImageAccess` to ensure the gallery token/access URL is valid and the image belongs to the gallery.
- Updates `gallery_images.is_selected`.
- Updates `gallery_images.client_note` after trimming and max-length enforcement.
- Revalidates gallery image cache tags after selection changes.

Internal/admin path:

- Uses authenticated contract access.
- Updates the same `gallery_images` records.

### Retouch progress and delivery date

Primary file: `app/actions/gallery-drive-actions.ts`

- `getRetouchProgress(contractId)`:
  - Finds galleries for the contract.
  - Counts selected images in the `goc` gallery.
  - Counts images in the `da_sua` gallery.
  - Computes progress as edited count / selected count.

- `getDeliveryDate(contractId)`:
  - Reads `contract_events` for event type `hau_ky`.
  - Returns `deadline` or `event_date` as the delivery date.

### Drive copy job for selected JPGs

Primary file: `app/actions/gallery-drive-actions.ts`

Flow:

1. `initDriveCopyJob(galleryId, contractId, destFolderName)`:
   - Checks contract access.
   - Loads contract code.
   - Loads Google OAuth data from `studio_info.google_oauth`.
   - Requires Drive OAuth scope `https://www.googleapis.com/auth/drive`.
   - Finds selected images in the gallery.
   - Filters only `.jpg` / `.jpeg` files.
   - Creates or finds a destination folder inside the original Drive folder.
   - Inserts a `gallery_filter_jobs` record.
   - Returns job info, destination folder, access token, and files to copy.

2. `processDriveCopyChunk(...)`:
   - Creates Drive shortcuts/copies for a chunk of selected images.
   - Handles token refresh on 401 through `getValidGoogleToken`.
   - Returns success/failure counts.

3. `finalizeDriveCopyJob(...)`:
   - Updates final processed/success/failed counts and job status.

This flow is used to prepare selected JPGs for downstream retouching/printing/delivery without transferring image bytes through the app server.

---

## 5. API routes liên quan

### Contract prefetch

File: `app/api/contracts/[id]/prefetch/route.ts`

Purpose:

- HTTP GET endpoint for contract detail prefetching.
- Calls `getContractDetail(contractId)` from `app/actions/contract-queries.ts`.
- Used to warm React Query cache before navigating to a contract detail page.

Notes:

- Relies on the server action to enforce auth/access.
- Returns 400 if contract ID is missing.
- Returns 500 with error message on failure.

### Single gallery image download

File: `app/api/gallery-download/[token]/[imageId]/route.ts`

Purpose:

- Gate access to a single original image download.
- Returns a direct `lh3.googleusercontent.com` URL instead of proxying image bytes.

Access paths:

- `token === "admin"`:
  - Requires logged-in Supabase user.
  - Requires contract access.
  - Fetches `drive_file_id` from `gallery_images`.

- Guest/public signed token:
  - Parses token into body/signature.
  - Loads gallery by `accessUrl`.
  - Verifies token signature with gallery access version and capability.
  - Ensures requested image belongs to gallery.

Download/payment gate:

- Capability `view`: download blocked.
- Capability `select`: download allowed only if `allow_download` or `download_unlocked_at` is set.
- Capability `download`:
  - If not manually unlocked, checks linked contract.
  - Allows if `contracts.payment_status === "da_thanh_toan"` or `remaining_amount <= 0`.
  - Otherwise returns HTTP 402 payment required.

### Batch gallery download

File: `app/api/gallery-download-batch/[token]/route.ts`

Purpose:

- Gate access to many original images.
- Returns JSON containing direct Google image URLs and a zip name.
- Browser/client fetches files directly from Google and zips client-side.

Important behavior:

- Avoids streaming image bytes through Vercel.
- Same admin and guest token model as the single-download route.
- Same payment/unlock gate as single-download route.
- Can accept image IDs through `ids` query param.
- Can use `galleryId` query param for admin mode.

### Drive download redirect

File: `app/api/drive-download/[fileId]/route.ts`

Purpose:

- Redirects a Drive file ID to `https://lh3.googleusercontent.com/d/{fileId}=s0`.
- Can return JSON `{ url }` if `?format=json` is provided.
- Does not check contract/gallery/payment access by itself.

Security/business note:

- This route assumes gallery images are already public/shared on Drive.
- Because it accepts any sufficiently long `fileId`, it should not be treated as an authorization gate. Auth/payment gating is implemented in the gallery-download routes instead.

---

## 6. Logic liên quan việc nhận ảnh từ nguồn ngoài

### Google Drive API key flow

Primary file: `lib/google-drive.ts`

Functions:

- `parseDriveFolderUrl(url)` extracts Drive folder ID.
- `fetchDriveFiles(folderId)` fetches image files from Drive:
  - Uses `GOOGLE_DRIVE_API_KEY`.
  - Query: folder parent contains folder ID and `mimeType contains 'image'`.
  - Orders by `createdTime asc`.
  - Paginates with `nextPageToken`.
  - Throws a helpful error if the folder is not shared publicly.

- `fetchDriveSubfolders(parentFolderId)` fetches child folders:
  - Uses `GOOGLE_DRIVE_API_KEY`.
  - Query for mime type `application/vnd.google-apps.folder`.
  - Returns an empty array gracefully if inaccessible.

- `detectFolderType(folderName)` categorizes subfolders by name:
  - original/raw/full => `goc`
  - edit/retouch/retouched/ảnh đã sửa => `da_sua`
  - print/selected/chọn in => `chon_in`

- URL builders:
  - `getDriveThumbnailUrl(fileId, size)`
  - `getDriveImageUrl(fileId)`
  - `getDriveDownloadUrl(fileId)`

### Google OAuth flow for copying selected images

Primary files:

- `app/actions/gallery-drive-actions.ts`
- `lib/google-auth.ts`
- `lib/google-drive-oauth.ts`

This is distinct from the API-key read/import flow. It uses OAuth credentials stored in `studio_info.google_oauth` to write into Google Drive:

- Finds or creates a destination folder.
- Creates Drive shortcuts/copies for selected JPGs.
- Refreshes OAuth token when needed.
- Tracks progress in `gallery_filter_jobs`.

### Data model for imported external images

Imported external images are stored as metadata, not binary files:

- `gallery_images.drive_file_id`
- `gallery_images.file_name`
- `gallery_images.file_group`
- `gallery_images.image_url`
- `gallery_images.thumbnail_url`
- `gallery_images.sort_order`
- optional derived metadata such as dimensions/blurhash.

Image bytes stay on Google infrastructure and are served through direct `drive.google.com` / `lh3.googleusercontent.com` URLs.

---

## 7. Constants and service types

### Service colors

File: `constants/service-colors.ts`

This file maps service types to UI colors. It is not core finance/pricing logic, but it is contract/service-type related.

### Service types

The most authoritative reviewed list is in `lib/validations/contract.schema.ts`:

- `studio`
- `ngay_cuoi`
- `combo`
- `baby`
- `gia_dinh`
- `sinh_nhat`
- `bau`
- `concept`
- `couple`
- `ky_yeu`
- `media`
- `khac`

No dedicated pricing constants were found in `constants/` during this audit. Pricing appears data-driven through service/item rows and price-rule logic rather than hardcoded constants.

---

## 8. Overall architecture notes

- Most contract business logic is implemented as server actions in `app/actions/`, not in `app/api/`.
- `app/api/` mainly exposes prefetch and download/gating routes.
- Contract financial consistency relies on a mix of:
  - Zod validation
  - Supabase RPCs for atomic lifecycle/payment operations
  - finance period locks
  - server-side recomputation of remaining/paid amounts
- Gallery delivery is tightly integrated with contracts via `galleries.contract_id` and payment-gated download rules.
- Employee/photographer work is modeled as `work_tasks` linked to contracts, with assignment/cost fields driving scheduling and profitability.
- External image intake is Google Drive based and imports metadata only; file bytes generally do not pass through Vercel/serverless functions.
