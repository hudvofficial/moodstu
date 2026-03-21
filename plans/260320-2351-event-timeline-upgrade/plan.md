# Plan: Upgrade Event Timeline — V2 = V1 + Tối ưu
Created: 2026-03-20T23:51:00+07:00
Updated: 2026-03-21T00:44:00+07:00
Status: ✅ Complete

## Triết lý
> V2 = V1 foundation + tối ưu visual + thêm features thực sự hữu ích.
> Không phát minh lại. Không port nguyên xi. Tối ưu.

## V1 Reference
- **Code**: `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\`
- **Key files**:
  - `components/contracts/details/EventTimeline.tsx` (521L) — UI chính
  - `components/contracts/details/EventSection.tsx` (119L) — Wrapper + modal
  - `app/actions/contract-events/crud.ts` (555L) — Business logic
  - `constants/contracts.ts` — EVENT_TYPES, isOnSetEvent(), WORK_TYPE_LABELS

## V2 DB Hiện Tại
```
contract_events:
  id, contract_id, event_type (enum), title, event_date, end_date,
  location, status (task_status_enum), notes, created_at, updated_at, phase (text)

⚠️ THIẾU so V1: sort_order, deadline, start_time, end_time, is_manual_date
⚠️ event_templates: CHƯA CÓ
```

## V2 UI Hiện Tại
- `components/contracts/detail/event-timeline.tsx` (138L)
- Flat list, sort by date, status badge, progress bar
- Không expandable, không team members, không timeline dots

---

## GIỮ từ V1 (đã proven)
- [x] `sort_order` — thứ tự business logic
- [x] `isOnSetEvent()` — hiện trường vs nội bộ (date vs deadline)
- [x] `deadline` field — HK/GSP dùng deadline thay vì event_date
- [x] Expandable task list — click → xem team + toggle status
- [x] Status dots color-coded
- [x] Progress bar + task count (done/total)
- [x] Auto-complete event khi all tasks done

## TỐI ƯU Visual (Stitch design)
- [x] Vertical timeline (dots + line) thay flat cards
- [x] Active event auto-highlighted (border primary)
- [x] Cleaner status badges dùng SSOT tokens
- [x] Lucide icons thay Material Symbols

## THÊM MỚI (V2 exclusive)
- [x] 🔴 **Overdue badge** — `deadline < today && status !== hoan_thanh` → "Trễ N ngày"
- [x] ⭐ **Next-event highlight** — Event gần nhất chưa done = auto highlighted

---

## Phases

| Phase | Name | Scope | Status |
|-------|------|-------|--------|
| 01 | DB: Thêm columns thiếu | migration | ✅ |
| 02 | Types + Constants | 2 files | ✅ |
| 03 | UI: Rewrite event-timeline | 1+1 files | ✅ |
| 04 | Data: Update mock events | SQL | ✅ |
| 05 | Verify | browser | ✅ |

---

## Phase 01: DB Migration — Thêm columns V1 đã có

### Columns cần thêm
```sql
ALTER TABLE contract_events ADD COLUMN sort_order INTEGER DEFAULT 0;
ALTER TABLE contract_events ADD COLUMN deadline TIMESTAMPTZ;
ALTER TABLE contract_events ADD COLUMN start_time TIME;
ALTER TABLE contract_events ADD COLUMN end_time TIME;
ALTER TABLE contract_events ADD COLUMN is_manual_date BOOLEAN DEFAULT false;
```

### Lý do (từ V1)
| Column | V1 dùng để | V2 cần vì |
|--------|-----------|-----------|
| `sort_order` | Sắp xếp theo business logic (không phải date) | Thay date sorting → đúng flow studio |
| `deadline` | HK/GSP không có event_date, chỉ có deadline | isOnSetEvent: date vs deadline |
| `start_time` | Giờ bắt đầu chụp/tổ chức | Hiện "09:00-17:00" trên timeline |
| `end_time` | Giờ kết thúc | Cặp với start_time |
| `is_manual_date` | Admin chọn ngày tay → skip auto-recalculate | Tránh ghi đè ngày admin đã set |

### NOTE: Cột `phase` đã tồn tại
- DB đã có `phase TEXT DEFAULT 'pre_wedding'`
- **KHÔNG dùng cho UI grouping** (brainstorm kết luận: sort_order đủ)
- Giữ lại, không xóa, có thể dùng cho filtering sau này

---

## Phase 02: Types + Constants

### File 1: `types/contract.ts`
- [ ] Update `ContractEvent` interface — thêm `sort_order`, `deadline`, `start_time`, `end_time`, `is_manual_date`

### File 2: `types/contract-constants.ts`
- [ ] Thêm `ON_SET_EVENT_TYPES` array — `["ngay_chup", "ngay_to_chuc"]`
- [ ] Thêm helper `isOnSetEvent(type: EventType): boolean`
  - on-set = dùng `event_date` (đi hiện trường)
  - non-on-set = dùng `deadline` (nội bộ)

---

## Phase 03: UI — Rewrite event-timeline.tsx

### Reference: V1 EventTimeline (521L) → V2 target: ~200L

### Layout (V1 + Stitch tối ưu)
```
┌─ Header ──────────────────────────┐
│  📅 Lịch trình sự kiện    [4]    │
├───────────────────────────────────┤
│  ● ── Thực hiện Studio     ✅    │  ← sort_order 1
│  │    23/04 • Studio A            │
│  │    ───────── 3/3               │
│  │                                │
│  ● ── Hậu kỳ Studio        🔵    │  ← sort_order 2 (ACTIVE)
│  │    Deadline: 08/05             │    ← highlighted
│  │    ───────── 1/4               │
│  │    ├ Nguyễn Văn A (Retouch)    │    ← expanded team
│  │    ├ Trần Thị B (Dựng phim)    │
│  │    └ + Thêm                    │
│  │                                │
│  ○ ── Giao sản phẩm        ⚪    │  ← sort_order 3
│       Deadline: 20/05             │
│       🔴 Trễ 3 ngày              │    ← OVERDUE badge (V2 NEW!)
└───────────────────────────────────┘
```

### Tasks chi tiết
- [ ] Sort by `sort_order` (V1 logic) thay vì date
- [ ] Timeline dots: vertical line + color dots (Stitch visual)
  - `hoan_thanh` → ✅ green CheckCircle2
  - `dang_lam` → 🔵 primary Clock (highlighted card)
  - `chua_lam` → ⚪ muted Circle
- [ ] Display date: `isOnSetEvent` → show event_date, else → show deadline
- [ ] Start/end time: show "09:00-17:00" cho on-set events
- [ ] Expandable chevron → InlineTaskList (port từ V1)
  - Hiện: employee name + work_type label + status badge
  - Toggle status onClick (optimistic + debounced — V1 pattern)
- [ ] Auto-highlight: Event đầu tiên chưa complete = active
- [ ] **Overdue badge** (NEW): deadline < today && status !== hoan_thanh → Badge đỏ "Trễ N ngày"
- [ ] Progress bar + done/total count

### Constraints
- Max 250 lines (lesson #7)
- SSOT tokens only (lesson #53, #67)
- No border, only shadow/bg (lesson #64)
- Lucide icons (lesson #13)
- Sentence case (lesson #51)

---

## Phase 04: Data — Update Mock Events

### Thêm sort_order + deadline cho 8 events hiện có
```sql
-- Events HĐ-2026-0003 (contract b9dcca30...)
-- Pre-wedding group
UPDATE contract_events SET sort_order = 1 WHERE title LIKE '%Chuẩn bị Pre-wedding%';
UPDATE contract_events SET sort_order = 2 WHERE title LIKE '%Chụp Pre-wedding%';
UPDATE contract_events SET sort_order = 3, deadline = event_date, event_date = NULL 
  WHERE title LIKE '%Hậu kỳ Pre-wedding%';
UPDATE contract_events SET sort_order = 4, deadline = event_date, event_date = NULL 
  WHERE title LIKE '%Trả SP Pre-wedding%';

-- Wedding group
UPDATE contract_events SET sort_order = 5 WHERE title LIKE '%Chuẩn bị lễ cưới%';
UPDATE contract_events SET sort_order = 6 WHERE title LIKE '%Tiệc cưới%';

-- Post-production group  
UPDATE contract_events SET sort_order = 7, deadline = event_date, event_date = NULL 
  WHERE title LIKE '%Chỉnh sửa ảnh%';
UPDATE contract_events SET sort_order = 8, deadline = event_date, event_date = NULL 
  WHERE title LIKE '%Giao album%';
```

---

## Phase 05: Verify
- [ ] Browser → `/contracts/b9dcca30-...`
- [ ] Events sorted by sort_order (không phải date)
- [ ] Vertical timeline dots + line hiện đúng
- [ ] On-set events hiện event_date, non-on-set hiện deadline
- [ ] Active event (đầu tiên chưa done) highlighted
- [ ] Click chevron → expand team members
- [ ] Overdue badge hiện cho events trễ deadline
- [ ] Progress bars đúng %
- [ ] Build pass
- [ ] So sánh visual với Stitch mockup
