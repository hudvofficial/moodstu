# Audit: Productivity Mobile UI vs Gold Standard

**Date:** 2026-04-04 | **Scope:** Mobile layout (< lg breakpoint)

---

## Gold Standard Reference: Contract Module Mobile Card

```
┌─────────────────────────────────┐
│ HD-2603-001          [Hoạt động]│  ← Row 1: code + status badge
│                                 │
│ Nguyễn Thị Mỹ Hào             │  ← Row 2: tên (bold, truncate)
│                                 │
│ [Ngày Cưới]  📅 15/03/2026     │  ← Row 3: service badge + date
│                                 │
│ 25.000.000 VND    Đã thu: 15M  │  ← Row 4: tổng + payment
│ ████████░░░░░░░░ (60%)         │  ← Row 5: progress bar
└─────────────────────────────────┘
```

**Pattern chuẩn:**

- Mỗi card = 5 rows xếp **dọc**, **compact**
- **KHÔNG grid-cols** — pure vertical flow
- active:scale-[0.99] cho haptic feedback
- Entrance animation stagger
- ~120px height per card → viewport: 60-70% data

---

## Hiện trạng: Productivity Mobile Card

```
┌──────────────────────────────────┐
│ [HN]  Lê Hoàng Nam     [CAO]   │  ← Row 1: avatar + name + badge
│       Media                      │
│                                  │
│  ON-SET       ĐANG LÀM          │  ← grid-cols-2 stats
│  18h          6                  │     (chiếm ~200px)
│  HOÀN THÀNH   QUÁ HẠN          │
│  2            3                  │
│                                  │
│  CHI PHÍ                        │  ← Bonus cost line
│  12.200.000 VND                 │     (chiếm ~80px)
└──────────────────────────────────┘
```

**Card height: ~300px** → Chỉ fit 2 cards trên viewport → **< 40% viewport cho data**

---

## 🔴 Critical Issues

### C1. Layout sai pattern — grid-cols-2 stats thay vì inline compact

| Aspect         | Gold Standard (Contract)            | Current (Productivity)        |
| -------------- | ----------------------------------- | ----------------------------- |
| Stats display  | Inline 1 dòng hoặc vertical compact | grid-cols-2 → 4 ô chiếm 200px |
| Card height    | ~120px                              | ~300px                        |
| Cards/viewport | 5-6 cards                           | 2 cards                       |
| Data viewport  | > 60%                               | < 40%                         |

**Vi phạm:** KI "Compact Mobile Productivity Pattern" §4: Grid Cards chiếm ~400px → pattern chuẩn chỉ ~60px summary.

### C2. Thiếu visual hierarchy trong card

Gold standard contract card có **5 rows rõ ràng** với hierarchy:

1. Meta (code) — `text-xs text-text-muted`
2. Primary (name) — `text-sm font-bold text-text-main`
3. Context (service + date) — badge + icon
4. Value (money) — `text-sm font-semibold`
5. Progress — visual bar

Productivity card nhét **tất cả stats ngang hàng** → user không biết đâu là info quan trọng nhất.

### C3. Thiếu entrance animation + haptic feedback

| Feature               | Gold Standard   | Current                                               |
| --------------------- | --------------- | ----------------------------------------------------- |
| `active:scale-[0.99]` | ✅              | ❌                                                    |
| `entrance entrance-N` | ✅ (stagger)    | ❌                                                    |
| Touch target 44pt     | ✅ (whole card) | ⚠️ (Button ghost = OK nhưng không có visual feedback) |

---

## 🟡 Warnings

### W1. StatsBar shared component có `text-sm` inline (L48)

`stats-bar.tsx:48` — `<span className="text-sm text-text-muted">` thay vì `text-body-sm`.

### W2. Period control card không collapse trên mobile

`ProductivityPeriodControl` render full card với TabsFilter + date range text. Trên mobile chiếm ~100px toolbar space trước khi thấy data.

### W3. Overload banner trên mobile chiếm thêm ~80px

Toolbar + stats + period control + overload banner = ~350px trước khi thấy employee cards.

---

## 📐 Proposed Mobile Card Redesign

```
┌──────────────────────────────────┐
│ [HN]  Lê Hoàng Nam     [CAO]   │  ← Row 1: avatar + name + workload badge
│       Media                      │
│                                  │
│ 18h on-set · 6 việc · 2 xong   │  ← Row 2: inline stats (1 line)
│                                  │
│ ⚠️ 3 quá hạn   12.200.000 VND  │  ← Row 3: alert + cost (conditional)
│ ━━━━━━━━━○               ▸     │  ← Row 4: workload bar + chevron
└──────────────────────────────────┘
```

**~100px/card** → 5-6 cards visible → **> 60% viewport cho data** ✅

**Thay đổi key:**

- grid-cols-2 (4 ô) → **inline text 1 dòng** (`18h · 6 việc · 2 xong`)
- Cost line riêng → **inline với alert indicator**
- Thêm progress bar cho workload_ratio
- Thêm `active:scale-[0.99]` + `entrance` animation
- Thêm chevron `▸` indicator cho affordance

---

## Fix Scope

| #   | Issue                       | Type           | Files                           |
| --- | --------------------------- | -------------- | ------------------------------- |
| C1  | Redesign mobile card layout | Rewrite        | `productivity-mobile-cards.tsx` |
| C2  | Visual hierarchy            | Included in C1 | same                            |
| C3  | Haptic + animation          | Add classes    | same                            |
| W1  | StatsBar text-sm            | Token          | `stats-bar.tsx`                 |
| W2  | Period control collapse     | Enhancement    | `productivity-toolbar.tsx`      |
| W3  | Header stack height         | Layout audit   | page composition                |
