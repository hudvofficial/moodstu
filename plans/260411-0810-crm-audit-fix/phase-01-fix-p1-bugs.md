# Phase 01: Fix FK Join + Error Handling
Status: ⬜ Pending
Dependencies: None

## Objective
Sửa 2 lỗi P1 confirmed trong CRM module.

## Task A: Fix FK Join `employees!assigned_to` (lead-actions.ts)

### Problem
`getLeadById()` dùng `select("*, employees!assigned_to(id, full_name)")` nhưng FK không tồn tại.
PostgREST sẽ 400 reject query này.

### Fix — Option B (fetch riêng, không cần migration)

#### [MODIFY] `app/actions/lead-actions.ts` (Line 218)

```diff
-const { data, error } = await supabase.from("crm_leads").select("*, employees!assigned_to(id, full_name)").eq("id", id).is("deleted_at", null).single();
-if (error) throw error;
-if (!data) throw new Error("Không tìm thấy lead");
-return data as CrmLead;
+const { data, error } = await supabase.from("crm_leads").select("*").eq("id", id).is("deleted_at", null).single();
+if (error) throw error;
+if (!data) throw new Error("Không tìm thấy lead");
+
+// Fetch employee separately — no FK dependency
+let employee: { id: string; full_name: string } | null = null;
+if (data.assigned_to) {
+  const { data: emp, error: empError } = await supabase
+    .from("employees")
+    .select("id, full_name")
+    .eq("id", data.assigned_to)
+    .maybeSingle();
+  if (empError) throw empError;
+  employee = emp ?? null;
+}
+
+return { ...data, employees: employee } as CrmLead;
```

### Test Criteria
- [ ] Lead detail drawer mở được, không 400 error
- [ ] Lead có `assigned_to` → hiển thị tên employee
- [ ] Lead không có `assigned_to` → hiển thị bình thường

---

## Task B: Fix Status Update Error Handling (lead-list-page.tsx)

### Problem
`moveLeadToStage()` trả `ActionResult` (never throws vì `withAuth` catch all).
Handler hiện **bỏ qua `result.success`** → luôn báo thành công dù server reject.

### Fix

#### [MODIFY] `components/crm/lead-list-page.tsx` (Line 98-110)

```diff
   const handleStatusChange = async (leadId: string, newStatus: string) => {
     try {
-      await moveLeadToStage(leadId, newStatus as LeadStatus);
-      mutate(cacheKeys.leads());
-      toast.success("Đã cập nhật trạng thái");
+      const result = await moveLeadToStage(leadId, newStatus as LeadStatus);
+      if (!result.success) {
+        toast.error(result.error || "Không thể cập nhật trạng thái");
+        return;
+      }
+      await mutate(cacheKeys.leads());
+      toast.success("Đã cập nhật trạng thái");
     } catch (error: unknown) {
```

### Test Criteria
- [ ] Chuyển status hợp lệ → toast success, list refresh
- [ ] Chuyển status KHÔNG hợp lệ (vd: `moi` → `da_chot` trực tiếp) → toast error, KHÔNG refresh

---

## Task C: Remove false-positive toast in lead-card.tsx

### Problem
`lead-card.tsx` swipe action "Huỷ deal" (Line 83-86) gọi `handleStatusUpdate("huy")` rồi **ngay lập tức** `toast.success("Đã huỷ khách hàng")` — không chờ result.

2 vấn đề:
1. **False positive**: Nếu server reject transition → UI vẫn toast success
2. **Duplicate toast**: Nếu server accept → parent `lead-list-page.tsx` CŨNG toast success (sau Task B fix) → user thấy 2 toast

Root cause: Child component tự toast thay vì để parent (single source of toast) xử lý.

### Fix

#### [MODIFY] `components/crm/lead-card.tsx` (Line 83-86)

```diff
     {
       id: "cancel",
       label: "Huỷ deal",
       icon: <Trash2 className="w-5 h-5" />,
       className: "bg-error text-inverse",
-      onClick: () => {
-        handleStatusUpdate("huy");
-        toast.success("Đã huỷ khách hàng");
-      }
+      onClick: () => {
+        handleStatusUpdate("huy");
+      }
     }
```

Remove the local `toast.success(...)`. Parent `lead-list-page.tsx` is the single source for status toasts after checking `ActionResult.success` (Task B).

### Test Criteria
- [ ] Swipe "Huỷ deal" trên mobile → chỉ 1 toast (từ parent), không duplicate
- [ ] Nếu server reject "huy" transition → toast error (từ parent), KHÔNG toast success

---

## Verification
```powershell
npm run build
```
- Build phải pass, 0 type errors
