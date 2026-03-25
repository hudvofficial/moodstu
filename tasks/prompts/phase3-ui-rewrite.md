/code Phase 3 — UI Rewrite: Filters giống Gold Standard /contracts

## MỤC TIÊU
Rewrite `employee-filters.tsx` cho giống layout `/contracts`:
- Status tabs → dùng `TabsFilter` component
- Native `<select>` → dùng `SelectPill` (Radix)
- Xóa search bar dư (header đã có)
- Layout 1 hàng: [TabsFilter] ... [SelectPill dept] [SelectPill role] [SelectPill sort]

## ĐỌC TRƯỚC (BẮT BUỘC)
- tasks/pre-code-checklist.md
- tasks/lessons.md
- tasks/gates/before-edit.md

## GATE: VISUAL VERIFY (BẮT BUỘC)
1. Mở browser `/contracts` → screenshot Gold Standard layout
2. Mở browser `/employees` → screenshot hiện tại
3. So sánh: ghi ra danh sách sai lệch
4. Viết plan ngắn → trình anh duyệt trước khi code

## REFERENCE FILES (Gold Standard)
- `components/contracts/contracts-list-client.tsx` — layout chuẩn
- `components/contracts/contracts-dropdown-filters.tsx` — SelectPill usage
- `components/ui/tabs-filter.tsx` — TabsFilter component
- `components/ui/select/SelectPill.tsx` — SelectPill component

## TARGET FILE
- `components/employees/employee-filters.tsx` — REWRITE file này

---

## BƯỚC 1: Xóa search bar

Xóa toàn bộ phần search input (đã có ở header global). Bao gồm:
- State `searchValue`
- useEffect debounce
- JSX input search
- Import `Search` icon

## BƯỚC 2: Thay status pills → TabsFilter

TRƯỚC (custom pills):
```tsx
{pills.map((pill) => (
  <button onClick={...} className={...}>
    {pill.label} ({pill.count})
  </button>
))}
```

SAU (TabsFilter component):
```tsx
import TabsFilter from "@/components/ui/tabs-filter";

const STATUS_TABS = [
  { key: "all", label: "Tất cả", count: stats.total },
  { key: "active", label: "Đang làm", count: stats.active },
  { key: "inactive", label: "Nghỉ việc", count: stats.inactive },
];

<TabsFilter
  tabs={STATUS_TABS}
  activeTab={currentStatus}
  onTabChange={(key) => updateParam("status", key)}
/>
```

LƯU Ý: Check `TabsFilter` props interface trước — nếu nó dùng `value/onChange` thay vì `activeTab/onTabChange` thì theo đúng interface của nó.

## BƯỚC 3: Thay native `<select>` → SelectPill

TRƯỚC:
```tsx
<select value={...} onChange={(e) => updateParam("dept", e.target.value)}>
  {DEPT_OPTIONS.map(...)}
</select>
```

SAU:
```tsx
import SelectPill from "@/components/ui/select/SelectPill";

<SelectPill
  value={searchParams.get("dept") || "all"}
  onValueChange={(v) => updateParam("dept", v)}
  options={DEPT_OPTIONS}
  placeholder="Phòng ban"
/>
```

Làm tương tự cho: Role select, Sort select.

LƯU Ý: Check `SelectPill` props interface trước — dùng đúng prop names.

## BƯỚC 4: Layout 1 hàng (giống /contracts)

```tsx
<div className="flex items-center justify-between gap-3 flex-wrap">
  {/* Left: Status Tabs */}
  <TabsFilter ... />

  {/* Right: Filter dropdowns */}
  <div className="flex items-center gap-2">
    <SelectPill ... /> {/* Phòng ban */}
    <SelectPill ... /> {/* Vai trò */}
    <SelectPill ... /> {/* Sắp xếp */}
  </div>
</div>
```

Desktop: 1 hàng, tabs trái + selects phải.
Mobile: wrap xuống hàng 2 (flex-wrap handles).

## BƯỚC 5: Update Props interface

```tsx
interface Props {
  stats: { total: number; active: number; inactive: number };
}
```

Giữ nguyên — đã update ở Phase 2.

---

## VERIFY

1. Mở `/employees` → layout đúng 1 hàng: tabs trái, dropdowns phải
2. Mở `/contracts` → so sánh visual: cùng style
3. Click tab "Nghỉ việc" → filter đúng
4. Chọn Phòng ban "Sản xuất" → filter đúng
5. Chọn Vai trò "Media" → filter đúng
6. Chọn Sort "A → Z" → sort đúng
7. Mobile (resize viewport) → tabs + selects wrap tự nhiên
8. Không còn search bar dưới filters
9. Dev server 0 errors

## KHÔNG ĐƯỢC LÀM
- Không sửa employee-table hoặc employee-card (đã xong Phase 2)
- Không sửa employee-list-page layout (chỉ filters)
- Không sửa server queries
- Chỉ rewrite employee-filters.tsx
