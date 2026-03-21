# Plan: EventTaskModal — SSOT Select Component Fix
Created: 2026-03-21T02:01:00+07:00
Status: 🟡 Pending Review

## Vấn đề
EventTaskModal dùng **2 native `<select>`** (L394, L417) → popup dropdown = native browser UI
→ Không có V2 tokens: font, color, bg, hover, radius, shadow = MẶC ĐỊNH trình duyệt
→ Vi phạm nguyên tắc **đồng bộ tuyệt đối** của V2

## V2 đã có components chuẩn
| Component | File | Dùng cho | Features |
|-----------|------|----------|----------|
| `SelectGrouped` | `ui/select/SelectGrouped.tsx` | **Loại việc** (grouped) | Radix, color-coded headers, portal, keyboard nav |
| `SelectForm` | `ui/select/SelectForm.tsx` | **Nhân sự** (flat list) | Radix, portal, keyboard nav, disabled state |

Cả 2 đều dùng: `input-base` trigger, `select-content` popup, `select-item` option → **tokens đồng bộ 100%**

## Audit — Tổng vi phạm SSOT trong modal

| # | Dòng | Hiện tại | Phải là | Severity |
|---|------|----------|---------|----------|
| S1 | L394-413 | Native `<select>` + `<optgroup>` (Loại việc) | `SelectGrouped` component | 🔴 Critical |
| S2 | L417-429 | Native `<select>` + `<option>` (Nhân sự) | `SelectForm` component | 🔴 Critical |
| S3 | L33-50 | `WORK_TYPE_GROUPS` format `{group, items}` | Convert sang `OptionGroup[]` format `{groupName, color, options}` | 🟡 Data |

## Scope — CHỈ fix select, KHÔNG sửa gì khác

### Đã OK (không sờ):
- ✅ `<input type="time" className="input-base">` → đúng SSOT (không có TimeInput component)
- ✅ `CurrencyInput` → đúng SSOT component
- ✅ `Badge` → đúng SSOT component
- ✅ `UnifiedModal` → đúng SSOT component
- ✅ `.text-overline`, `.text-label`, `.label-base` → đúng SSOT classes
- ✅ `.btn btn-primary`, `.btn btn-secondary` → đúng SSOT classes
- ✅ `formatCurrency()` → đúng SSOT utility
- ✅ Lucide icons → đúng SSOT

---

## Phase 1: Convert data format (5 phút)

### File: `event-task-modal.tsx`

**Hiện tại (L33-50):**
```ts
const WORK_TYPE_GROUPS = [
  { group: "Sản xuất", items: ["chup_anh", ...] as WorkType[] },
  ...
];
```

**Sửa thành (OptionGroup[] format cho SelectGrouped):**
```ts
import { SelectGrouped } from "@/components/ui/grouped-select";
import { SelectForm } from "@/components/ui/simple-select";

const WORK_TYPE_SELECT_GROUPS: OptionGroup[] = [
  {
    groupName: "Sản xuất",
    color: "gold",
    options: [
      { value: "chup_anh", label: "Chụp ảnh" },
      { value: "quay_phim", label: "Quay phim" },
      { value: "makeup", label: "Trang điểm" },
      { value: "tro_ly", label: "Trợ lý" },
      { value: "cameraman", label: "Cameraman" },
    ],
  },
  {
    groupName: "Tiền kỳ",
    color: "sky",
    options: [
      { value: "concept", label: "Concept" },
      { value: "kich_ban", label: "Kịch bản" },
    ],
  },
  {
    groupName: "Hậu kỳ",
    color: "rose",
    options: [
      { value: "hau_ky_anh", label: "Hậu kỳ ảnh" },
      { value: "dung_phim", label: "Dựng phim" },
      { value: "retouch", label: "Retouch" },
      { value: "premiere", label: "Premiere" },
      { value: "bien_tap", label: "Biên tập" },
    ],
  },
  {
    groupName: "Khác",
    color: "gold",
    options: [{ value: "khac", label: "Khác" }],
  },
];
```

---

## Phase 2: Replace native selects (5 phút)

### File: `event-task-modal.tsx`

**Fix S1 — Loại việc (L392-414):**

Thay:
```tsx
<div>
  <label className="label-base">Loại việc</label>
  <select value={...} onChange={...} className="input-base">
    {WORK_TYPE_GROUPS.map(group => (
      <optgroup key={group.group} label={group.group}>
        {group.items.map(val => (
          <option key={val} value={val}>{WORK_TYPE_MAP[val]}</option>
        ))}
      </optgroup>
    ))}
  </select>
</div>
```

Bằng:
```tsx
<SelectGrouped
  label="Loại việc"
  value={form.work_type}
  onChange={(val) => setForm(prev => ({ ...prev, work_type: val as WorkType }))}
  groups={WORK_TYPE_SELECT_GROUPS}
/>
```

**Fix S2 — Nhân sự (L415-430):**

Thay:
```tsx
<div>
  <label className="label-base">Nhân sự</label>
  <select value={...} onChange={...} className="input-base">
    <option value="">-- Chọn --</option>
    {employees.map(emp => (
      <option key={emp.id} value={emp.id}>...</option>
    ))}
  </select>
</div>
```

Bằng:
```tsx
<SelectForm
  label="Nhân sự"
  value={form.assigned_to}
  onChange={(val) => handleEmployeeChange(val)}
  options={employees.map(emp => ({
    value: emp.id,
    label: `${emp.full_name}${emp.department ? ` (${emp.department})` : ""}`,
  }))}
  placeholder="-- Chọn --"
/>
```

---

## Phase 3: Cleanup imports (2 phút)

- Xóa import `WORK_TYPE_MAP` (nếu không dùng chỗ khác)
- Thêm import `SelectGrouped`, `SelectForm`

---

## Phase 4: Verify (3 phút)

- Build check — không lỗi TypeScript
- Browser: mở modal → click Loại việc → thấy Radix dropdown, color-coded headers
- Browser: mở modal → click Nhân sự → thấy Radix dropdown, tokens đúng

---

## Tổng: 4 tasks | ~15 phút | 1 file sửa

### Files
- `components/contracts/detail/event-task-modal.tsx` — Replace 2 native selects

### Không sửa
- Mọi thứ khác: 0 changes
