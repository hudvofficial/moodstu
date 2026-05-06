# Phase 03: Contract Payment UX Max Polish

Status: Implemented locally
Risk: Medium
Estimate: 3h

## Goal

Make `Thu tiền` fast, clear, and hard to misuse.

## UX Rules

- Generic `Thu tiền` opens with amount blank.
- Plan-specific `Thu đợt này` opens with selected plan and prefilled amount.
- Normal payment cannot exceed `remainingAmount`.
- Fully paid contract opens `Phát sinh`, not normal collection.
- `Phát sinh` requires notes/reason.
- Category is auto-derived, not user-selected by default.
- Date default uses Vietnam local date helper, not `toISOString()`.

## Tasks

- [ ] Make `CurrencyInput` or a wrapper support blank value.
- [ ] Update `PaymentReceiptForm`:
  - blank default amount for generic open.
  - quick chips: `Còn lại`, `Theo đợt tiếp theo`, `Cọc 30%`, `Nhập khác`.
  - no first-unpaid auto-fill unless opened from plan action.
  - local date default via `getTodayInTimeZone()`.
  - remove manual category dropdown or hide under advanced.
  - enforce client-side amount <= remaining in normal mode.
  - show clear `Phát sinh` mode banner when fully paid.
- [ ] Add state-aware CTA:
  - `Thu tiền` when remaining > 0.
  - `Phát sinh` when remaining <= 0.
- [ ] Add payment plan collect action if the current detail page has a suitable plan block.
- [ ] Add receipt document action on payment history row:
  - view receipt.
  - print receipt.
- [ ] Improve copy:
  - `Số tiền thu`
  - `Còn phải thu`
  - `Thu đợt này`
  - `Tạo phiếu phát sinh`

## Files

- `components/contracts/detail/payment-receipt-form.tsx`
- `components/contracts/detail/financial-dashboard.tsx`
- `components/contracts/detail/detail-layout-sections.tsx`
- `components/contracts/detail/mobile-bottom-bar.tsx`
- `components/ui/currency-input.tsx`
- `lib/studio-date.ts`

## Acceptance Criteria

- No modal opens with accidental amount except plan-specific click.
- Submit is disabled until amount is valid.
- Overpayment normal mode is impossible from UI and DB.
- Fully paid contract cannot create normal receipt.
- Contract payment flow feels instant after modal opens.

## Tests

- [ ] Generic open: amount blank.
- [ ] Plan action open: selected plan amount prefilled.
- [ ] Amount > remaining: blocked before submit.
- [ ] Fully paid contract: CTA is `Phát sinh`; notes required.
- [ ] Date matches Vietnam local date.
