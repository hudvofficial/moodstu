# Phase A: Types & Server Actions
**Status:** ⬜ Pending
**Dependencies:** None (nền tảng)
**Est.:** 30 min

---

## Objective
Port V1 CRM types và server actions sang V2. Đây là nền tảng cho TẤT CẢ phases sau.

## V1 Source Files
- `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\types\crm.ts`
- `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\app\(protected)\crm\pipeline-actions.ts`

## V2 Target Files
- `types/crm.ts` — merge thêm V1 types
- `app/actions/crm.ts` — thêm pipeline actions

---

## Implementation Steps

### A1. Audit V2 types/crm.ts vs V1
- [ ] So sánh V2 `types/crm.ts` với V1 `types/crm.ts`
- [ ] Liệt kê missing: PIPELINE_STAGES, TAG_PRESETS, getScoreLevel, AVATAR_COLORS, STATUS_BADGE_COLORS, POTENTIAL_BADGE_COLORS, STATUS_BAR_COLORS

### A2. Port missing types
- [ ] Port `PIPELINE_STAGES` (5 stages: Mới, Tư vấn, Báo giá, Hẹn gặp, Chốt deal) — với icon, color, bgColor, borderColor
- [ ] Port `TAG_PRESETS` (label + color mapping)
- [ ] Port `getScoreLevel(score)` → returns { color, icon, label }
- [ ] Port `AVATAR_COLORS` (color palette for char-based avatars)
- [ ] Port `STATUS_BADGE_COLORS` + `POTENTIAL_BADGE_COLORS` + `STATUS_BAR_COLORS`
- **Đổi:** Material icon names → Lucide icon names

### A3. Verify CrmLead interface
- [ ] V2 CrmLead phải có TẤT CẢ fields V1 có:
  - `id, contact_name, phone, email, source, status, potential, needs, score, deal_value, contact_date, next_contact_date, status_changed_at, pipeline_order, assigned_to, created_at, updated_at, tags, care_history, notes, social_link, address, lost_reason`
  - `employees` relation (assigned_to → full_name)

### A4. Verify Customer interface
- [ ] V2 Customer phải có TẤT CẢ fields V1 có
- [ ] Verify `lead_id` FK nếu converted

### A5. Port pipeline-actions.ts
- [ ] `moveLeadToStage(leadId, targetStatus)` — update status + status_changed_at
- [ ] `updateDealValue(leadId, value)` — update deal_value
- [ ] Dùng `withAuth` pattern (admin client)
- [ ] Thêm `revalidatePath('/crm/leads')`
- **File:** `app/actions/crm.ts` (thêm vào cuối, hoặc tách `app/actions/crm-pipeline.ts`)

### A6. Port addCareLog action
- [ ] `addCareLog(leadId, content, type)` — append to care_history JSONB
- [ ] Verify V1 dùng RPC `append_care_log` hay direct update
- [ ] Port action tương ứng

---

## Files to Create/Modify
| File | Action |
|------|--------|
| `types/crm.ts` | **MODIFY** — merge V1 types |
| `app/actions/crm.ts` | **MODIFY** — add pipeline + carelog actions |

## Test Criteria
- [ ] `PIPELINE_STAGES` có 5 stages đúng thứ tự
- [ ] `getScoreLevel(85)` trả đúng color/icon
- [ ] `TAG_PRESETS` có ≥ 5 tags
- [ ] `moveLeadToStage` không throw error
- [ ] `updateDealValue` không throw error
- [ ] Build pass: `npm run build`

---
**Next Phase:** → Phase B (Customer Module Fix)
