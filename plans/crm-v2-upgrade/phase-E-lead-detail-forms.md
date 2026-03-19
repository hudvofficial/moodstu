# Phase E: Lead Module — Detail & Forms
**Status:** ⬜ Pending
**Dependencies:** Phase A ✅
**Est.:** 1 hour

---

## Objective
Port CareLogSection full, LeadFormModal, TagsInput, fix ConvertButton DB link.

## V1 Source Files
- `components/crm/CareLogSection.tsx` (152 lines)
- `components/crm/LeadFormModal.tsx`
- `components/crm/LeadFormFields.tsx`
- `components/crm/LeadModalSections.tsx`
- `components/crm/TagsInput.tsx`
- `components/crm/ConvertButton.tsx` (53 lines)
- `components/crm/LeadDetailActions.tsx`

## V2 Target Files
- `components/crm/leads/CareTimeline.tsx` — upgrade existing
- `components/crm/leads/LeadFormModal.tsx` — **CREATE** or upgrade LeadForm
- `components/crm/leads/TagsInput.tsx` — **CREATE**
- `components/crm/leads/ConvertButton.tsx` — upgrade existing
- `components/crm/leads/LeadDetail.tsx` — verify all fields

---

## Implementation Steps

### E1. Port CareLogSection full
- [ ] Upgrade V2 `CareTimeline.tsx` with V1 `CareLogSection.tsx` logic
- [ ] Features to port:
  - Timeline vertical line (`before:absolute before:left-[4px] before:w-[1px] before:bg-border`)
  - Dot indicators (primary for logs, muted for initial)
  - **Add form:** isAdding toggle, content textarea, type select dropdown
  - Type options: 📝 Ghi chú, 📞 Gọi điện, 👥 Hẹn gặp, 📄 Gửi báo giá
  - Initial record: "Hệ thống tiếp nhận thông tin từ {source}"
  - Date formatting: vi-VN locale
- [ ] Wire `addCareLog` action (from Phase A)
- [ ] **Đổi:** `material-symbols-outlined sync` → Lucide `Loader2` (spin)
- [ ] **Đổi:** `ring-4 ring-white` → `ring-4 ring-bg-card` (dark mode safe)

### E2. Port LeadFormModal
- [ ] Check V2 LeadForm — nếu full page → tạo Modal variant
- [ ] Port V1 `LeadFormModal` pattern: opened from SmartCRMFab
- [ ] Fields: contact_name, phone, email, source (select), needs (textarea), deal_value, tags
- [ ] Use V2 Modal component (Coffee pattern: slide-up mobile, scale-in desktop)
- [ ] `onSubmit` → createLead action → close modal → router.refresh()

### E3. Port TagsInput
- [ ] Tạo `components/crm/leads/TagsInput.tsx`
- [ ] Port V1 pattern: input + autocomplete dropdown from TAG_PRESETS
- [ ] Features: add tag, remove tag (X button), max tags limit
- [ ] Color mapping from TAG_PRESETS
- [ ] **Đổi:** Styling → V2 tokens

### E4. Fix ConvertButton DB link
- [ ] V1 flow: confirm → `convertToContract(leadId)` → returns `{ url }` → redirect
- [ ] Verify V2 `ConvertButton.tsx` has same flow
- [ ] Verify server action: creates customer from lead data, returns contract create URL
- [ ] If contract module not ready: redirect to `/crm/customers` with toast "Đã chuyển thành KH"

### E5. Verify Lead Detail page
- [ ] Check `components/crm/leads/LeadDetail.tsx`
- [ ] Must have: contact info, status, potential, score, deal_value, source, needs, tags, care history, assigned employee, dates
- [ ] Action buttons: Edit, Convert, Delete
- [ ] CareLog section visible

### E6. Verify Lead create/edit pages
- [ ] `app/(protected)/crm/leads/create/` — check routing exists
- [ ] `app/(protected)/crm/leads/[id]/edit/` — check routing exists
- [ ] Forms use same field set as LeadFormModal

---

## Files to Create/Modify
| File | Action |
|------|--------|
| `components/crm/leads/CareTimeline.tsx` | **MODIFY** — full CareLog port |
| `components/crm/leads/LeadFormModal.tsx` | **CREATE** — modal form |
| `components/crm/leads/TagsInput.tsx` | **CREATE** — autocomplete tags |
| `components/crm/leads/ConvertButton.tsx` | **MODIFY** — fix DB link |
| `components/crm/leads/LeadDetail.tsx` | **VERIFY** — all fields present |

## Test Criteria
- [ ] CareLog timeline renders with existing history
- [ ] Add CareLog: select type → write content → save → appears in timeline
- [ ] LeadFormModal opens from FAB → fill → save → close → list refreshes
- [ ] TagsInput: type → see suggestions → click → tag added → X removes
- [ ] ConvertButton: click → confirm → action runs → redirect works
- [ ] Lead Detail shows all V1 fields
- [ ] Build pass: `npm run build`

---
**Next Phase:** → Phase F (Layout & Polish)
