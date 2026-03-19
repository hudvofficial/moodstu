# Phase 22: Settings

**Status:** ⬜ Backlog
**Dependencies:** Phase 01 (Foundation)
**Est.:** 0.5 day

## Objective

Studio info, user preferences, system configuration.

## Implementation Steps

### Studio Info
- [ ] DB: Bảng `studio_info` (name, address, phone, logo_url, bank_info, tax_id)
- [ ] Edit studio info (Admin only)
- [ ] Logo upload → Supabase Storage

### User Preferences
- [ ] Dark mode toggle ← lưu vào localStorage
- [ ] Notification preferences (email/push/in-app)
- [ ] Language (VN only for now)

### System Config
- [ ] Default payment milestones template
- [ ] Default service types
- [ ] Backup / Export data (Admin only)

### Audit Logs (link P20)
- [ ] Settings > Audit Logs navigation

## Test Criteria
- [ ] Studio info update OK
- [ ] Dark mode toggle persist across sessions
- [ ] Admin-only features hidden for other roles

---
**End of Wave 2!** 🎉
