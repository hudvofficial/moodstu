# Audit Report — Settings Module (Full)
**Date:** 2026-04-02  
**Scope:** Full Audit — Business Logic + Security + UI Consistency  
**Module:** `app/actions/settings-*.ts`, `notification-actions.ts`, `profile-actions.ts`, `user-management.ts`, `components/settings/**`

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 Critical | 1 | markAsRead IDOR — thiếu ownership check |
| 🟡 Warning | 3 | Duplicate import, query over-fetch, missing RLS note |
| 🟢 Info | 4 | File cleanup, TODO removal, UI minor |

---

## 🔴 Critical Issues (Phải sửa ngay)

### C1: `markAsRead()` — IDOR Vulnerability (Insecure Direct Object Reference)
- **File:** notification-actions.ts:73-78
- **Vấn đề:** Hàm `markAsRead(id)` chỉ update by notification ID mà **KHÔNG kiểm tra** notification đó thuộc employee hiện tại. Bất kỳ user đã login có thể đánh dấu "đã đọc" notification của người khác.
- **Hiện tại:**
```typescript
export async function markAsRead(id: string) {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("notification_queue")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id); // ← Thiếu .eq("employee_id", empId)
  });
}
```
- **Cách sửa:** Thêm employee ownership check:
```typescript
export async function markAsRead(id: string) {
  return withAuth(async (supabase, userId) => {
    const empId = await getEmployeeId(supabase, userId);
    if (!empId) throw new Error("Chưa đăng nhập");
    const { error } = await supabase.from("notification_queue")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("employee_id", empId); // ← FIX: ownership guard
  });
}
```

---

## 🟡 Warnings (Nên sửa)

### W1: Duplicate Import Statement
- **File:** edit-profile-modal.tsx:7-8
- **Vấn đề:** 2 import statements cùng từ `@/app/actions/profile-actions`
- **Cách sửa:** Gộp thành 1 dòng

### W2: `getStudioInfo()` — Over-fetching (select "*")
- **File:** settings-queries.ts:31-33
- **Vấn đề:** `getStudioInfo()` (non-admin) dùng `.select("*")` — trả về TẤT CẢ fields bao gồm `google_calendar_auth` (chứa OAuth tokens).
- **Cách sửa:** Chỉ select public fields hoặc xóa hàm nếu không dùng.

### W3: `notification_preferences` Table — Missing RLS Audit
- **Vấn đề:** Cần xác nhận RLS policy đảm bảo user chỉ upsert cho employee_id của mình.

---

## 🟢 Info

### I1: File Line Counts — Tất cả đạt chuẩn (trừ edit-profile-modal 288L gần threshold)
### I2: `updateAdminProfileFields` — admin có thể edit bất kỳ employee (by design)
### I3: Changelog là static data (phù hợp ứng dụng nhỏ)
### I4: UI badge naming nhất quán

---

## 📐 UI Consistency vs Gold Standard — ĐẠT CHUẨN TUYỆT ĐỐI

| Pattern | Status |
|---------|--------|
| card-base p-4 lg:p-6 | ✅ |
| section-heading | ✅ |
| form-grid-2col | ✅ |
| UnifiedModal + form-actions | ✅ |
| Button variant="primary/secondary/danger" | ✅ |
| lucide-react icons (no material-symbols) | ✅ |
| SSOT color tokens (text-text-primary/secondary/muted) | ✅ |
| CustomSelect + Switch (Radix) | ✅ |
| Input/Textarea (custom SSOT) | ✅ |
| animate-pulse bg-bg-hover skeletons | ✅ |
| icon-btn class | ✅ |
| badge badge-primary | ✅ |

---

## 🔒 Security Summary

| Check | Status |
|-------|--------|
| Auth guard (withAuth) | ✅ |
| Admin guard (withAdmin) | ✅ |
| Zod validation | ✅ (6 schemas) |
| Audit logging | ✅ |
| Optimistic locking | ✅ |
| IDOR protection | 🔴 markAsRead |
| Input sanitization | ✅ |
