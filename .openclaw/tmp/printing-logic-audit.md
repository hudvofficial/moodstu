
## 2. Validation Analysis

### Current Server Validation

#### `updatePrintingOrderStatus()`
- ✅ Validates status enum via `printingStatusSchema`
- ✅ Loads current order and checks `deleted_at IS NULL`
- ✅ Prevents no-op transition
- ✅ Enforces allowed transitions via `VALID_TRANSITIONS`
- ✅ Sets `updated_at` and `updated_by`
- ✅ Auto-sets `received_date` for legacy `da_nhan`

#### `recordDepositPayment()`
- ✅ Deposit amount must be > 0
- ✅ Only works from `cho_xu_ly`
- ✅ Deposit cannot exceed order total
- ✅ Creates receipt + links via `order_payments`
- ✅ Updates `paid_amount`, `deposit_amount`, `payment_status`, and status `dat_coc`

#### `startProduction()`
- ✅ Requires status `dat_coc`
- ✅ Requires items exist
- ✅ Checks inventory availability
- ✅ Reserves inventory
- ✅ Moves status to `dang_in`

### ❌ Business Rule Bypass Found

There are TWO ways to change status:

1. **Rich workflow actions** (`printing-workflow-mutations.ts`):
   - `recordDepositPayment()` validates payment and creates receipt
   - `startProduction()` validates deposit and reserves inventory
   - `completeProduction()` likely handles stock-out

2. **Generic dropdown action** (`printing-mutations.ts:updatePrintingOrderStatus()`):
   - Only checks `VALID_TRANSITIONS`
   - Allows `cho_xu_ly -> dang_in` directly
   - Does NOT validate deposit/payment
   - Does NOT reserve inventory
   - Does NOT create workflow side effects

This means the UI dropdown can bypass richer workflow protections.

### Specific Risk Cases

| User Action | Current Result | Risk |
|------------|----------------|------|
| Dropdown: `cho_xu_ly -> dang_in` | Allowed | Starts production without deposit/reservation |
| Dropdown: `dat_coc -> dang_in` | Allowed | Starts production without inventory reservation |
| Dropdown: `dang_in -> da_in` | Allowed | Completes production without stock-out / inventory transaction |
| Dropdown: `da_giao -> hoan_thanh` | Allowed | Completes without final payment validation |
| Cancel while inventory reserved | Allowed by status logic | May leave reservations hanging unless another workflow handles cleanup |

### Recommendation
- Treat dropdown as **quick status only** for lightweight visual states OR route transitions through workflow-specific actions.
- For protected transitions (`dat_coc`, `dang_in`, `da_in`, `hoan_thanh`), server should enforce required side effects.
- Remove direct `cho_xu_ly -> dang_in` unless explicitly intended and documented as "skip deposit".


## 3. Permissions Analysis

Current Security Layers:
- **equirePrintingAccess() (auth_utils.ts):** Requires user role to pass \canAccess(role, 'printing')\.
- All actions in printing-mutations.ts and printing-workflow-mutations.ts are wrapped in withPrintingAccess().
- Row Level Security (RLS) acts as a final safety net for the database.

? **Strengths:**
- Every mutation explicitly checks module access on the server.
- The withPrintingAccess wrapper prevents unauthorized execution even if UI is bypassed.
- RLS provides defense-in-depth.

? **Potential Improvements:**
- Currently, **all users** with 'printing' access can change status.
- No granular role distinction: A junior printer can cancel an order (huy_don) or mark it complete (hoan_thanh).
- Complex financial actions (e.g., ecordDepositPayment) only check printing access, not finance access (equireFinanceAccess()), even though they create receipts.

## 4. Edge Cases Analysis

### Printer / Lab Issues
- **Issue:** The printer breaks down, or the lab rejects the job.
- **Current Handling:** No dedicated state. The order stays in dang_in.
- **Fix:** Add a loi_in_an (Issue/Error) state, or a generic 'Flagged' field.

### Customer Cancellation Mid-Process
- **Issue:** Customer cancels after printing has started (dang_in -> huy_don).
- **Current Handling:** The status updates to huy_don.
- **Missing Logic:** 
  1. What happens to the money already paid? (Requires manual refund flow).
  2. What happens to reserved/used inventory? (Should release reservations or log waste).

### Rework / QC Failure
- **Issue:** The final printed product is flawed. It needs to be sent back.
- **Current Handling:** Cannot move da_in back to dang_in due to strict linear state machine.
- **Fix:** Update VALID_TRANSITIONS to allow da_in -> dang_in (rollback for rework).

## 5. Data Integrity Analysis

- ? **Audit Logging:** Every status change fires ireAuditLog indicating old/new status, action UPDATE, and the user ID.
- ? **Metadata Updates:** Updates updated_at and updated_by on every transition.
- ? **Atomic Updates:** Database changes are handled via Supabase RPC (update_printing_order_atomic) or direct parameterized updates, minimizing race conditions.
- ? **Inventory Integrity:** As noted in section 2, the generic status dropdown bypasses inventory reservation/deduction, creating a disconnect between the order state and actual physical stock.

---

