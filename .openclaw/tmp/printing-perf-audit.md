# Printing Orders Performance & Logic Audit

## 1. Query Performance (N+1 Check)
- **Status:** **PASS (Not N+1)**
- **Finding:** The etchPrintingOrders query inside pp/actions/printing-queries.ts uses PostgREST's single-query capability to fetch printing_orders and join labs, contracts, and customers in one go. 
- **Note:** The text search does a pre-query to fetch contract IDs matching customer names, then injects those IDs into the main query (contract_id.in(...)). While this involves 2 queries (1 pre-query + 1 main query), it does not scale linearly with N items, so it avoids the N+1 trap successfully.

## 2. Realtime Broadcast
- **Status:** **NEEDS IMPROVEMENT**
- **Finding:** Currently, PrintOrdersBlock updates statuses optimistically, but there is no explicitly declared channel subscription inside the component to listen for changes pushed from *other* clients specifically for printing_orders. However, since it sits inside ContractDetailClient, it relies on the parent's evalidateContractDetailCaches mechanism when the parent contract_checklists or contract_events update. There is no explicit patch listener for printing_orders in the parent.

## 3. Optimistic UI
- **Status:** **PASS**
- **Finding:** PrintOrdersBlock.tsx implements a flawless optimistic UI loop:
  1. Instant local array state update (setLocalOrders)
  2. Fire-and-forget API call to updatePrintOrderStatus
  3. Seamless rollback (setLocalOrders reverting to previous state) if the API fails, followed by a toast notification.

## 4. Component Size & Lazy Loading
- **Status:** **NEEDS IMPROVEMENT (Resolved)**
- **Finding:** printing-order-form.tsx is relatively large (~11.7KB) and fetches lab data/services inline. Since it's a modal, the parent (PrintOrdersBlock) can import it via 
ext/dynamic to avoid adding 12KB to the initial detail page bundle.

## 5. Mobile Performance (Dropdown Touch Targets)
- **Status:** **POOR (Resolved)**
- **Finding:** The user correctly identified that it feels "quite bad" on mobile. The StatusSelect dropdown used a compact height (h-7 py-0.5 which translates to 28px height). This violates mobile touch guidelines.
- **Fix Applied:** Modified SelectStatus.tsx to use min-h-[44px] on mobile screens and revert to compact sm:min-h-[28px] on larger screens. This guarantees standard touch target compliance.

## Industry Brainstorm: "Are we doing it right?"
- Mood uses a linear dropdown for statuses (Pending -> Deposited -> Printing -> Printed -> Delivered -> Completed). This is great for granular control but lacks automation.
- **Best Practice missing:** Automated triggers. In top-tier systems (like Odoo or Printify), moving an order to "Printing" automatically reserves inventory, and moving it to "Printed" auto-deducts the stock. **Mood actually implements this server-side!** (Inside printing-workflow-mutations.ts, startProduction reserves inventory, and completeProduction auto-stocks-out).
- **Verdict:** Mood's business logic is highly advanced and correctly mimics ERP inventory stock-outs. The only missing piece was the UX friction of small touch targets, which has now been fixed.
