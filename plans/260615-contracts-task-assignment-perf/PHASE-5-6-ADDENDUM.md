# ADDENDUM — Phase 5 + Phase 6A (gửi claw làm tiếp)

> Bối cảnh: Phase 1-4 đã xong & verify (commit `fc21ccc`, tsc+eslint pass). Còn **2 việc**:
> - **Phase 5**: thêm index `work_tasks(event_id)` (bị bỏ sót, không chỉ Phase 6).
> - **Phase 6A**: optimistic form reset khi Lưu — `addTask` vẫn là WRITE (giữ `withAuth`) nên Phase 1 KHÔNG tăng tốc nó; form + nút Lưu vẫn khựng suốt round-trip. Giao nhiều người liên tiếp (chụp/quay/makeup/trợ lý) thấy lag → fix bằng reset form optimistic.
> Mỗi phase 1 commit, verify trước khi commit.

---

## PHASE 5 — Index `work_tasks(event_id)` (additive, an toàn)

### Task 5.1 — Tạo migration mới
Tạo file **`supabase/migrations/20260615120000_work_tasks_event_id_index.sql`** (timestamp sau migration mới nhất `20260615110000_add_outsource_service_type.sql`):

```sql
-- work_tasks được query theo event_id ở getTasksByEvent / addTask (check unassigned) /
-- deleteTask / checkAndCompleteEvent. Trước đây chỉ có index trên contract_id,
-- (assigned_to,status,deadline), calendar (deadline/start_date) — KHÔNG có index event_id,
-- nên các thao tác theo từng event phải seq scan. Thêm index này.
CREATE INDEX IF NOT EXISTS idx_work_tasks_event ON public.work_tasks (event_id);
```

### Task 5.2 — Áp migration
- [ ] Chạy theo quy trình repo: `npm run migrate:latest` (script `scripts/migrate-direct.mjs`) — hoặc cách team đang dùng để apply lên Supabase.
- [ ] Dùng plain `CREATE INDEX IF NOT EXISTS` (KHÔNG `CONCURRENTLY` trong migration transaction).

### Verify Phase 5
- [ ] Migration chạy không lỗi.
- [ ] (Optional) `EXPLAIN ANALYZE SELECT id FROM public.work_tasks WHERE event_id = '<id thật>';` → thấy `Index Scan using idx_work_tasks_event` (không `Seq Scan`).
- [ ] **ĐỪNG** tạo lại các index đã có: `idx_work_tasks_contract`, `idx_work_tasks_assigned_status_deadline`, `idx_work_tasks_contract_status_deadline`, `idx_contract_events_contract_sort`.

---

## PHASE 6A — Optimistic form reset khi add task (rủi ro thấp)

**File: `components/contracts/detail/event-task-modal.tsx`**, trong `handleAdd`.

**Nguyên tắc giữ an toàn (đọc trước khi sửa):**
- **GIỮ `submitting=true` suốt `await`** (serialize, tránh double-submit). KHÔNG cần release sớm: dropdown nhân viên/thợ KHÔNG bị `submitting` chặn (chỉ nút Add bị), nên user vẫn chọn được người kế tiếp trong lúc chờ; chọn xong thì `await` cũng đã resolve. Đây là bản tối giản, không dính concurrency.
- **Closure-safe:** `setForm` KHÔNG đổi biến `form` trong cùng lần chạy hàm → payload `addTask({ workType: form.work_type, ... })` bên dưới vẫn đọc đúng giá trị cũ dù đã reset form ở trên. `optimisticTask` cũng đã build xong trước khi reset.
- Reset sớm + **rollback form khi lỗi** để không mất input user.

### Sửa 1 — snapshot form để rollback
Sau dòng `const previousTasks = tasks;` (dòng ~256), thêm:
```ts
    const previousForm = form;
```

### Sửa 2 — reset form NGAY sau khi đẩy optimistic task (trước await)
Tại đoạn (dòng ~278-279):
```ts
    setSubmitting(true);
    setTasks((prev) => [...prev, optimisticTask]);
```
đổi thành:
```ts
    setSubmitting(true);
    setTasks((prev) => [...prev, optimisticTask]);
    // Optimistic form reset: form sẵn sàng cho người kế tiếp ngay, không chờ server.
    // form.* trong payload addTask bên dưới vẫn đọc giá trị cũ (const closure không đổi khi setForm).
    setForm((prev) => ({ ...prev, assigned_to: "", vendor_id: "", cost: 0 }));
    setConflicts([]);
```

### Sửa 3 — bỏ reset trùng ở nhánh success
Tại đoạn (dòng ~310-314):
```ts
      toast.success("Đã thêm nhân sự!");
      setForm((prev) => ({ ...prev, assigned_to: "", vendor_id: "", cost: 0 }));
      setConflicts([]);
      if (onTaskAdded && result.data) onTaskAdded(result.data as unknown as WorkTask);
      else onSaved();
```
đổi thành (xóa 2 dòng setForm/setConflicts vì đã làm ở Sửa 2):
```ts
      toast.success("Đã thêm nhân sự!");
      if (onTaskAdded && result.data) onTaskAdded(result.data as unknown as WorkTask);
      else onSaved();
```

### Sửa 4 — khôi phục form khi lỗi
Tại `catch` (dòng ~315-317):
```ts
    } catch (err) {
      setTasks(previousTasks);
      toast.error(err instanceof Error ? err.message : "Lỗi thêm task");
```
đổi thành:
```ts
    } catch (err) {
      setTasks(previousTasks);
      setForm(previousForm);
      toast.error(err instanceof Error ? err.message : "Lỗi thêm task");
```

### Verify Phase 6A (chrome-devtools)
- [ ] `npm run build`/tsc + eslint pass.
- [ ] Mở modal on-set, chọn nhân viên + nhập chi phí → bấm Lưu: **row hiện ngay** VÀ **form clear ngay lập tức** (dropdown về "-- Chọn --", cost về 0), không chờ server. Chọn người thứ 2 ngay được.
- [ ] Throttle Slow 4G: vẫn cảm giác Lưu tức thì (không khựng form).
- [ ] **Test lỗi (rollback):** tạm thời ngắt mạng / force `addTask` fail → toast lỗi + **form được khôi phục đúng giá trị vừa nhập** (assigned_to/vendor_id/cost), row optimistic biến mất.
- [ ] Không double-submit: bấm Lưu nhanh 2 lần liên tiếp không tạo 2 task trùng (form đã clear chặn lần 2).
- [ ] Regression: 1 lần add bình thường vẫn lưu đúng; event status timeline + hrCost cập nhật đúng (Phase 4 vẫn chạy).

---

## Lưu ý KHÔNG làm (giữ scope)
- **KHÔNG** đụng `addTask`/`deleteTask`/`toggleTaskStatus` server actions (giữ `withAuth` — là WRITE).
- **KHÔNG** làm Phase 6B (gộp RPC `add_work_task`) trừ khi sau Phase 6A đo `addTask` vẫn là nút thắt rõ rệt (>~300ms prod). Phase 6A đã trị triệu chứng "form khựng" rồi.
- **KHÔNG** release `submitting` sớm (tránh mở concurrency không cần thiết).

## Commit đề xuất
- `perf(db): add work_tasks(event_id) index`
- `perf(contracts): optimistic form reset on task add (instant multi-assign)`
