# @/audit — Drawer tab "Nhân sự" (DrawerAssignments)

## Mục tiêu
Audit toàn diện tab "Nhân sự" trong contract drawer: data flow, logic, UI, tính đúng đắn.

---

## 1. DATA FLOW AUDIT

### 1.1. List query (nguồn data cho drawer)
**File:** `app/actions/contracts.ts` dòng 40-41

```sql
work_tasks (id, work_type, assigned_to, status, deadline,
            start_date, completion_date, cost, notes)
```

**Check:**
- [ ] Query có JOIN `employees (id, full_name)` không? → Hiện tại: THIẾU
- [ ] Query có trả `event_id` không? → Check xem drawer cần group theo event không
- [ ] Query có trả `start_time`, `end_time` không?
- [ ] So sánh với detail query (`contract-detail-actions.ts` L35) — 2 query select giống hay khác?

### 1.2. Drawer data passing
**File:** `components/contracts/contract-drawer.tsx`

- [ ] L165: `workTasks = c.work_tasks || []` — data truyền thẳng từ list, không fetch thêm
- [ ] L362: `<DrawerAssignments tasks={workTasks as any[]} />` — cast `any` có rủi ro type?
- [ ] Khi gán nhân sự xong (trong detail modal) → quay lại list → drawer có refresh data không?

### 1.3. Detail query (so sánh)
**File:** `app/actions/contract-detail-actions.ts` L35 và L79

- [ ] Detail có JOIN `employees` không?
- [ ] Event-task-modal fetch data riêng hay dùng data từ detail?
- [ ] Khi submit gán nhân sự → revalidate ở đâu?

---

## 2. LOGIC AUDIT

### 2.1. DrawerAssignments component
**File:** `components/contracts/drawer-assignments.tsx` (130 dòng)

- [ ] L98: `task.employees?.full_name || "Chưa gán"` — nếu query không JOIN employees thì luôn = "Chưa gán"
- [ ] L50-51: `getStatusText()` mapping có đúng với enum thực tế trong DB? (check `TASK_STATUS_MAP`)
- [ ] L54-55: `getWorkLabel()` mapping có đúng với `WORK_TYPE_MAP`?
- [ ] L60: `MAX_VISIBLE = 5` — có hợp lý? Nên show nhiều hơn hay ít hơn?
- [ ] Có nên thêm count theo status? (VD: "3 Xong, 5 Chờ, 3 Đang làm")
- [ ] "Chưa gán" — nên hiện khác biệt với "Đã gán nhưng thiếu tên" (query bug vs chưa assign)

### 2.2. Status values
- [ ] DB enum `work_tasks.status` gồm những giá trị nào?
- [ ] `TASK_STATUS_MAP` cover hết chưa?
- [ ] Status trên drawer khớp với status trên detail modal không?
- [ ] Screenshot drawer có badge "Chờ" và "Xong" — nhưng DB enum là gì? (`chua_lam`, `dang_lam`, `hoan_thanh`, `da_huy`?)

### 2.3. Work type labels
- [ ] `WORK_TYPE_MAP` có key nào? (PHOTO, VIDEO, MAKEUP, RETOUCH, PREMIERE, EDITOR, POST_PHOTO, POST_VIDEO, PRE_CONCEPT...)
- [ ] Screenshot hiện: "Khác", "Hậu kỳ Ảnh", "Dựng phim", "Chụp ảnh" — mapping có đúng?

---

## 3. UI AUDIT (mở browser check)

### 3.1. Desktop drawer (mở `/contracts` → click contract)
- [ ] Tab "Nhân sự" → screenshot
- [ ] Mỗi item hiện: avatar placeholder + name + status badge + work type + deadline
- [ ] "Chưa gán" có style phù hợp? (nên italic hoặc muted hơn "đã gán tên")
- [ ] `+ X phân công khác` — click được không? Nên link sang detail?
- [ ] Hover effect trên từng item? (L89: `hover:bg-hover/50`)

### 3.2. So sánh drawer vs detail
- [ ] Detail page → section tương ứng hiện nhân sự thế nào?
- [ ] Drawer có nhất quán style với detail không?

### 3.3. Empty state
- [ ] Contract không có work_tasks → hiện "Chưa có phân công" đúng không?

---

## 4. BUG LIST (từ audit)

### BUG-1: List query thiếu JOIN employees
- **Severity:** HIGH
- **Impact:** Drawer luôn hiện "Chưa gán" dù đã assign nhân viên
- **Root cause:** `contracts.ts` L40 không có `employees (id, full_name)`
- **Fix:** Thêm nested select vào query

### BUG-2: (Check thêm) List query thiếu event_id
- **Severity:** MEDIUM  
- **Impact:** Không group được task theo event trong drawer
- **Fix:** Thêm `event_id` vào select

### BUG-3: (Check thêm) Data staleness sau khi gán nhân sự
- **Severity:** MEDIUM
- **Impact:** Gán xong → quay list → drawer vẫn cũ
- **Fix:** Revalidate contract list sau khi gán

---

## 5. OUTPUT YÊU CẦU

Sau khi audit xong, tạo report:
1. Danh sách bugs (severity + fix)
2. Đề xuất cải thiện UI (nếu có)
3. Prompt `/code` để fix từng bug
