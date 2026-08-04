# Spec: Upload mã QR bank cho nhân sự (backup thanh toán)

**Owner:** Claude (spec) → Codex/coder (impl)
**Ngày:** 2026-08-04
**Nguồn yêu cầu:** User — "nhân sự có mã QR riêng, chúng cung cấp → mình upload để backup, khi cần chuyển khoản admin mở ra chủ động."

## Quyết định nghiệp vụ (user đã chốt)
- **Upload ẢNH QR do nhân sự cung cấp** (KHÔNG auto-gen VietQR). Lý do: đó là QR riêng của họ (có thể MoMo/bank cá nhân), chỉ cần lưu lại để admin mở ra khi chuyển khoản.
- QR gắn theo từng nhân sự, nằm trong khối "Thông tin lương" (admin-only).

## Ràng buộc / convention đã xác minh
- Storage app dùng **bucket PUBLIC** (`avatars`, `dresses`, `moodie-attachments` — đều `getPublicUrl`, KHÔNG có signed URL ở đâu). → QR dùng bucket public, path theo UUID (không đoán được).
- `salary_info` là JSONB, schema `.passthrough()` → thêm key mới an toàn.
- Pattern upload chuẩn = `uploadAvatar` ([app/actions/profile-actions.ts:173-232](../../app/actions/profile-actions.ts)).

---

## PREREQUISITE (infra — cần user/admin làm hoặc migration)
Tạo bucket `employee-qr` (public read) + policy. SQL migration (theo `migrate-direct.mjs`):
```sql
insert into storage.buckets (id, name, public)
values ('employee-qr', 'employee-qr', true)
on conflict (id) do nothing;

-- Public đọc (QR để quét/mở), chỉ authenticated được ghi/xoá
create policy "employee-qr public read" on storage.objects
  for select using (bucket_id = 'employee-qr');
create policy "employee-qr auth write" on storage.objects
  for insert to authenticated with check (bucket_id = 'employee-qr');
create policy "employee-qr auth update" on storage.objects
  for update to authenticated using (bucket_id = 'employee-qr');
create policy "employee-qr auth delete" on storage.objects
  for delete to authenticated using (bucket_id = 'employee-qr');
```
⚠️ Kiểm bằng request anon thật sau khi tạo (LESSON supabase-anon-default-privileges-leak): anon CHỈ được select, không insert/delete.

---

## Task 1 — Type + schema (thêm field `bank_qr_url`)
**File `types/employee.ts`** — trong `interface SalaryInfo`, thêm sau `branch?`:
```ts
  bank_qr_url?: string;
```

**File `lib/validations/employee.schema.ts`** — trong `employeeSalaryInfoSchema`, thêm trước `.passthrough()`:
```ts
    bank_qr_url: z.string().url("URL QR không hợp lệ").optional().nullable().or(z.literal("")),
```

**File `types/employee-form.ts`**:
- `EmployeeFormData`: thêm `bank_qr_url: string;` (sau `bank_account_name`).
- `DEFAULT_FORM_DATA`: thêm `bank_qr_url: "",`.

## Task 2 — Server action upload QR
**File `app/actions/employee-mutations.ts`** — thêm action mới (admin-scoped, KHÔNG dùng withAuth vì đây là admin sửa hồ sơ người khác):
```ts
export async function uploadEmployeeQr(formData: FormData) {
  return withEmployeesWriteAccess(async (supabase) => {
    const file = formData.get("qr") as File;
    if (!file || file.size === 0) throw new Error("Chưa chọn ảnh QR");
    if (file.size > 2 * 1024 * 1024) throw new Error("Ảnh không được vượt quá 2MB");
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) throw new Error("Chỉ chấp nhận JPG, PNG, WEBP");

    const oldUrl = formData.get("oldUrl");
    if (typeof oldUrl === "string" && oldUrl) {
      const oldPath = oldUrl.split("/employee-qr/")[1]?.split("?")[0];
      if (oldPath) await supabase.storage.from("employee-qr").remove([oldPath]);
    }

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const filePath = `${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("employee-qr")
      .upload(filePath, file, { upsert: false, contentType: file.type });
    if (uploadError) throw new Error(`Lỗi tải QR: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from("employee-qr").getPublicUrl(filePath);
    return { url: `${urlData.publicUrl}?t=${Date.now()}` };
  });
}
```
- Dùng `crypto.randomUUID()` cho path → hoạt động cả create lẫn edit (không phụ thuộc employee.id chưa có lúc create).
- `withEmployeesWriteAccess` trả `{success, data|error}` — client đọc `result.data.url`.
- ⚠️ Xác minh signature `withEmployeesWriteAccess` khớp (đã dùng ở createEmployee).

## Task 3 — Form UI (upload + preview + xoá)
**File `components/employees/employee-form-modal.tsx`**:
- `employeeToForm`: thêm `bank_qr_url: emp.salary_info?.bank_qr_url || "",`.
- Payload `salary_info` ([dòng 101-108]): để **xoá được** QR, luôn gửi `bank_qr_url` (kể cả rỗng → `null`):
  ```ts
  payload.salary_info = {
    ...(form.base_salary ? { base_salary: Number(form.base_salary) } : {}),
    ...(form.bank_name ? { bank_name: form.bank_name } : {}),
    ...(form.bank_account_no ? { bank_account_no: form.bank_account_no } : {}),
    ...(form.bank_account_name ? { bank_account_name: form.bank_account_name } : {}),
    bank_qr_url: form.bank_qr_url || null,
  };
  ```
  (Điều kiện `if` mở khối salary_info ở dòng 101 thêm `|| form.bank_qr_url`.)
- Thêm state: `const [uploadingQr, setUploadingQr] = useState(false);`
- Thêm handler:
  ```ts
  const handleQrUpload = async (file: File) => {
    setUploadingQr(true);
    try {
      const fd = new FormData();
      fd.append("qr", file);
      if (form.bank_qr_url) fd.append("oldUrl", form.bank_qr_url);
      const res = await uploadEmployeeQr(fd);
      if (res.success) { setField("bank_qr_url", res.data.url); toast.success("Đã tải QR"); }
      else toast.error(res.error || "Lỗi tải QR");
    } finally { setUploadingQr(false); }
  };
  ```
  (import `uploadEmployeeQr` từ employee-mutations.)
- UI: thêm 1 block chiếm đủ 2 cột trong lưới salary (sau "Tên tài khoản"), dùng `<div className="col-span-full">` hoặc ngoài `form-grid-2col`:
  - Nếu `form.bank_qr_url`: hiện `<img src>` ~112px + nút "Đổi ảnh" + nút "Xoá" (`setField("bank_qr_url","")`).
  - Nếu chưa có: nút "Tải ảnh QR" (label bọc `<input type="file" accept="image/*" hidden>` gọi `handleQrUpload(e.target.files[0])`).
  - Disable khi `uploadingQr`/`submitting`; hiện `Loader2` khi `uploadingQr`.
  - Nút dùng `<Button unstyled>` hoặc `<label>` — KHÔNG raw `<button>` (eslint forbid-elements). Match style input hiện có.

## Task 4 — Hiển thị QR ở detail
**File `components/employees/employee-detail-drawer.tsx`** — sau `<EmployeeInfoCard title="Thông tin lương" .../>` ([dòng 297]), nếu `salary.bank_qr_url` thì thêm trong cùng khối:
```tsx
{salary.bank_qr_url && (
  <a href={salary.bank_qr_url} target="_blank" rel="noreferrer"
     className="block mt-3" title="Mở QR để chuyển khoản">
    <img src={salary.bank_qr_url} alt="QR chuyển khoản"
         className="h-40 w-40 object-contain rounded-lg bg-bg-hover p-2" />
  </a>
)}
```
(Bọc chung card "Thông tin lương". `salary` đã có sẵn ở dòng 75.)

**File `components/employees/employee-detail-page.tsx`** — mirror y hệt ở khối lương (đọc file để đặt đúng chỗ; cùng field `salary_info.bank_qr_url`).

---

## Verify (success criteria)
1. `npm run lint` file đổi = 0 lỗi; `npm run build` pass.
2. Bucket `employee-qr` tồn tại + policy đúng (anon chỉ read — test request anon).
3. Render chrome-devtools: form → tải ảnh QR → preview hiện → Lưu → mở lại form thấy QR; detail drawer hiện QR, click mở tab mới.
4. Xoá QR trong form → Lưu → detail không còn QR (kiểm nghiệp vụ "xoá được" — fix kèm cho bank_qr_url).
5. Responsive @768 + @1023 form + drawer.

## Ghi chú review nghiệp vụ (ngoài phạm vi QR — báo user quyết riêng)
- **Issue #1** (không xoá được field bank khác đã lưu): do payload chỉ gửi field non-empty + server merge `{...existing,...new}`. Spec này CHỈ fix cho `bank_qr_url` (luôn gửi). Muốn fix chung cho bank_name/STK/tên TK → task riêng.
- **Issue #2** (CTV vẫn có "Lương cơ bản"): nghiệp vụ, chờ user quyết ẩn/đổi nhãn theo vai trò.
