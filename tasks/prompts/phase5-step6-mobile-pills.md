@[/code] Phase 5 Bước 6 — Contracts Mobile Pills → TabsFilter shared

## MỤC TIÊU
Thay inline mobile status pills (15 dòng) trong `contracts-list-client.tsx` bằng `<TabsFilter>` shared — đồng bộ với `/employees`.

## ĐỌC TRƯỚC (BẮT BUỘC)
- tasks/pre-code-checklist.md
- tasks/lessons.md
- tasks/gates/before-edit.md

## GATE: VISUAL VERIFY (BẮT BUỘC)
1. Mở browser `/contracts` mobile 375px → screenshot filter pills row
2. Mở browser `/employees` mobile 375px → screenshot TabsFilter row
3. So sánh visual → ghi lại khác biệt
4. Viết plan ngắn → trình anh duyệt trước khi code

---

## PHÂN TÍCH KĨ: Khác biệt giữa 2 constants

### STATUS_TABS (desktop — line 32-38):
```ts
{ label: "Tất cả",         value: "all" },
{ label: "Đang thực hiện", value: "dang_thuc_hien" },
{ label: "Chờ xử lý",     value: "cho_xu_ly" },
{ label: "Hoàn thành",    value: "hoan_thanh" },
{ label: "Đã hủy",        value: "da_huy" },
```

### STATUS_PILLS (mobile — line 41-47):
```ts
{ label: "Tất cả",    value: "all" },
{ label: "Chờ xử lý", value: "cho_xu_ly" },       // ← THỨ TỰ KHÁC
{ label: "Đang làm",  value: "dang_thuc_hien" },  // ← LABEL KHÁC: "Đang làm" vs "Đang thực hiện"
{ label: "Hoàn thành", value: "hoan_thanh" },
{ label: "Đã hủy",    value: "da_huy" },
```

### KHÁC BIỆT:
| # | Vấn đề | Desktop (STATUS_TABS) | Mobile (STATUS_PILLS) |
|---|--------|----------------------|----------------------|
| 1 | Label | "Đang thực hiện" (dài) | "Đang làm" (ngắn) |
| 2 | Thứ tự | Đang TH → Chờ XL | Chờ XL → Đang làm |

### QUYẾT ĐỊNH CẦN ANH DUYỆT:
- **Option A**: Dùng chung `STATUS_TABS` cho cả desktop + mobile → label "Đang thực hiện" dài nhưng **đồng bộ 100%**
- **Option B**: Giữ `MOBILE_STATUS_TABS` riêng với label ngắn "Đang làm" + thứ tự khác → **linh hoạt nhưng 2 sources**
- **Khuyến nghị**: **Option A** — TabsFilter đã có `overflow-x-auto` nên label dài vẫn cuộn được, và đồng bộ desktop = mobile tốt hơn cho UX

---

## PHÂN TÍCH LAYOUT:

### Hiện tại — Contracts mobile (line 168-202):
```
[1 hàng duy nhất, cuộn ngang]
[Tất cả] [Chờ xử lý] [Đang làm] [Hoàn thành] [Đã hủy] [▼ Dịch vụ] [▼ Sắp xếp]
```
→ Status pills + SelectPill dropdowns **cùng 1 hàng**

### Hiện tại — Employees mobile (employee-filters.tsx line 69):
```
[flex-wrap — TabsFilter chiếm hết width, SelectPills xuống hàng dưới]
Hàng 1: [Tất cả (5)] [Đang làm (4)] [Nghỉ việc (1)]
Hàng 2: [▼ Phòng ban] [▼ Vai trò] [▼ Mới nhất]
```
→ Status tabs + SelectPill dropdowns **2 hàng** (vì flex-wrap)

### SAU REFACTOR — Contracts mobile:
```
Hàng 1: TabsFilter — [Tất cả] [Đang thực hiện] [Chờ xử lý] [Hoàn thành] [Đã hủy]
Hàng 2: SelectPills — [▼ Dịch vụ] [▼ Sắp xếp]
```
→ **Thay đổi layout**: từ 1 hàng → 2 hàng (giống employees)
→ User cần duyệt vì đây là thay đổi UX

---

## THAY ĐỔI CODE

### Bước 1: Thay block mobile (line 168-202)

XÓA:
```tsx
{/* ── MOBILE: V1 pill filter bar ── */}
<div className="lg:hidden flex items-center gap-2 overflow-x-auto scrollbar-hide">
  {STATUS_PILLS.map((pill) => (
    <button key={pill.value} onClick={...} className={`...inline...`}>
      {pill.label}
    </button>
  ))}
  <SelectPill ... />  {/* Dịch vụ */}
  <SelectPill ... />  {/* Sắp xếp */}
</div>
```

THAY BẰNG (đúng pattern employees — `flex-wrap`):
```tsx
{/* ── MOBILE: Status tabs + Filter pills ── */}
<div className="lg:hidden flex items-center justify-between gap-3 flex-wrap">
  <TabsFilter
    tabs={STATUS_TABS}
    activeTab={filters.status}
    onChange={setStatus}
  />
  <div className="flex items-center gap-2">
    <SelectPill
      value={filters.service}
      onChange={setService}
      defaultValue="all"
      placeholder="Dịch vụ"
      options={MOBILE_SERVICE_OPTIONS}
    />
    <SelectPill
      value={filters.sort}
      onChange={setSort}
      defaultValue="newest"
      placeholder="Sắp xếp"
      options={MOBILE_SORT_OPTIONS}
    />
  </div>
</div>
```

### Bước 2: Xóa `STATUS_PILLS` constant (line 40-47)

Nếu chọn Option A → xóa hoàn toàn `STATUS_PILLS`, dùng `STATUS_TABS` cho cả mobile + desktop.

### Bước 3: Kiểm tra `tabsWithCounts` desktop

Desktop TabsFilter (line 206) dùng `tabsWithCounts` (có thêm counts). Mobile TabsFilter dùng `STATUS_TABS` (không có counts). Đây là OK vì:
- Desktop có nhiều space → hiển thị counts
- Mobile compact → chỉ label

### Bước 4: Kiểm tra import

`TabsFilter` đã import ở line 22 → KHÔNG CẦN thêm import.

---

## VERIFY

```bash
# 1. Không còn inline pill buttons
grep -rn "bg-primary text-white" components/contracts/contracts-list-client.tsx
# Kết quả: 0 matches ✅

# 2. Không còn STATUS_PILLS constant
grep -rn "STATUS_PILLS" components/contracts/contracts-list-client.tsx
# Kết quả: 0 matches ✅

# 3. TabsFilter dùng ở cả desktop + mobile
grep -rn "TabsFilter" components/contracts/contracts-list-client.tsx
# Kết quả: import + 2 lần dùng ✅

# 4. Dev server 0 errors
npm run dev

# 5. Browser mobile 375px — /contracts:
#   - TabsFilter hiển thị đúng style (segmented control) ✅
#   - SelectPills (Dịch vụ, Sắp xếp) hiển thị hàng dưới ✅
#   - Click "Chờ xử lý" → filter đúng ✅
#   - Click "Tất cả" → show all ✅

# 6. Browser mobile 375px — /employees:
#   - TabsFilter style giống /contracts ✅
#   - Layout 2 hàng giống nhau ✅

# 7. Browser desktop 1440px — /contracts:
#   - Desktop TabsFilter + DropdownFilters KHÔNG bị ảnh hưởng ✅
```
