# 💡 BRIEF: Nâng cấp Công Nợ V2 = V1 + Tối Ưu

**Ngày tạo:** 2026-04-16
**Brainstorm session:** /finance/debts — Gap Analysis V1 → V2

---

## 1. VẤN ĐỀ: V2 ĐÃ CẮT MẤT GÌ SO VỚI V1?

V2 hiện tại chỉ giữ lại **phần xương** của module Công nợ. Toàn bộ phần "thịt" đã bị loại bỏ trong quá trình rebuild.

### 🔴 Tính năng V1 đã MẤT hoàn toàn:

| # | Tính năng V1 | File V1 | V2 hiện tại |
|---|---|---|---|
| 1 | **Toggle "Khoản thường / Trả góp"** | DebtModal.tsx | ❌ Không có |
| 2 | **Chọn sàn TMĐT** (Shopee SpayLater, Kredivo, MoMo, Home Credit...) | DebtModal.tsx | ❌ Không có |
| 3 | **Liên kết thẻ tín dụng** (chọn thẻ → auto-calc deadline) | DebtModal.tsx + CreditCardList | ❌ DB có bảng `credit_cards` nhưng UI không xài |
| 4 | **Preset số kỳ trả góp** (3/6/9/12/18/24 kỳ) | DebtModal.tsx | ❌ Không có |
| 5 | **Auto-calc tổng tiền** (số kỳ × tiền/kỳ) | DebtModal.tsx | ❌ Không có |
| 6 | **Quick action "Đã đóng kỳ này"** (1 tap → installment_paid +1) | markInstallmentPaid action | ❌ Không có |
| 7 | **Tab Thu / Trả** (RECEIVABLE / PAYABLE) | DebtToolbar.tsx | ❌ Không có — hiện hiển thị tất cả lẫn lộn |
| 8 | **Filter trạng thái** (Chưa TT / Quá hạn / Đã TT) | DebtToolbar.tsx | ❌ Không có |
| 9 | **Sort** (Mới nhất / Số tiền / Hạn gần) | DebtToolbar.tsx | ❌ Không có |
| 10 | **Search** tên/chủ nợ/ghi chú | DebtToolbar.tsx | ❌ Không có |
| 11 | **QR Thanh toán** (tạo QR cho khoản phải thu) | QRPaymentModal.tsx | ❌ Không có |
| 12 | **Nhắc nợ** (copy mẫu tin nhắn Zalo) | ReminderAction.tsx | ❌ Không có |
| 13 | **Aging Breakdown** (5 nhóm tuổi nợ) | DebtStatsHeader.tsx + debtAging.ts | ❌ Không có |
| 14 | **Stats Header 4 cards** (Phải thu / Phải trả / Quá hạn / Hiển thị) | DebtStatsHeader.tsx | ⚠️ V2 có DebtStatsBar nhưng đơn giản hơn |
| 15 | **Công nợ Lab In Ấn** (group theo lab, Pay All) | LabDebtList.tsx | ❌ Không có |
| 16 | **CRUD Thẻ Tín dụng** (ngày sao kê, hạn trả, limit) | CreditCardList.tsx + CreditCardModal.tsx | ❌ Không có |

### 🟡 DB V2 — Cột thiếu trên bảng `debts`:

| Cột V1 có | V2 hiện tại |
|---|---|
| `installment_total` | ❌ Thiếu |
| `installment_paid` | ❌ Thiếu |
| `installment_amount` | ❌ Thiếu |
| `platform` | ❌ Thiếu |
| `card_id` (FK → credit_cards) | ❌ Thiếu |
| `contract_id` (FK → contracts) | ❌ Thiếu |
| `debt_date` | ❌ Thiếu (V2 chỉ có `due_date`) |
| `payment_date` | ❌ Thiếu |

> **Bảng `credit_cards` đã tồn tại trong DB V2** nhưng frontend hoàn toàn không xài.

---

## 2. ĐỀ XUẤT: V2 = V1 + TỐI ƯU

### Nguyên tắc: Giữ nguyên mọi thứ V1 có + áp chuẩn V2

- Giữ toàn bộ 16 tính năng V1 liệt kê ở trên
- Áp V2 Design System (SSOT tokens, Apple HIG, Stripe clean)
- Áp V2 Architecture (Server Actions + Zod validation + Audit Log + Period Lock)
- Áp V2 Components (Button, UnifiedModal, SelectPill, TableWrapper, FAB)

---

## 3. PHÂN PHASE THỰC HIỆN

### 🚀 Phase 1: DB Migration + Core Logic
- [ ] ALTER `debts`: thêm 6 cột thiếu (`installment_*`, `platform`, `card_id`, `contract_id`, `debt_date`, `payment_date`)
- [ ] Tạo server action `markInstallmentPaid` (V2 hardened: Zod + Audit + Period Lock)
- [ ] Tạo CRUD actions cho `credit_cards` (V2 hardened)

### 🚀 Phase 2: UI — Debt Form Modal Upgrade
- [ ] Toggle "Khoản thường / Trả góp" (V2 tab-pill style)
- [ ] Section Trả góp: chọn sàn TMĐT, liên kết thẻ TD, preset kỳ, auto-calc
- [ ] Tích hợp Credit Card selector (fetch từ `credit_cards` table)

### 🚀 Phase 3: UI — Toolbar + Filters
- [ ] Tab Thu/Trả (SelectPill hoặc tab-pill)
- [ ] Filter trạng thái (SelectPill chips)
- [ ] Sort dropdown (SelectPill)
- [ ] Search input (V2 rounded style)

### 🚀 Phase 4: UI — Stats + Aging
- [ ] DebtStatsBar upgrade: 4 metrics (Phải thu / Phải trả / Quá hạn / Số lượng)
- [ ] Aging Breakdown (5 nhóm tuổi nợ, V2 card-base style)
- [ ] Progress bar cho khoản trả góp (5/12 kỳ)
- [ ] Quick action "✅ Đã đóng kỳ" trên row

### 🎁 Phase 5: Advanced Features
- [ ] QR Thanh toán (tái tạo từ V1)
- [ ] Nhắc nợ Zalo (ReminderAction V2)
- [ ] Công nợ Lab In Ấn (nếu module Printing đã có trong V2)
- [ ] CRUD Thẻ Tín dụng (sub-page hoặc modal trong Settings)

### 💭 Backlog:
- [ ] Aging donut chart
- [ ] Lịch thanh toán tháng (group theo thẻ TD)
- [ ] Auto-link Expense → Nợ phải trả
- [ ] AI tool `get_debt_summary` cho Moodie

---

## 4. ƯỚC TÍNH SƠ BỘ

| Phase | Độ phức tạp | Ghi chú |
|---|---|---|
| Phase 1 (DB + Logic) | 🟡 Trung bình | Migration + 3 server actions |
| Phase 2 (Form Modal) | 🟡 Trung bình | DebtFormModal phải refactor lớn |
| Phase 3 (Toolbar) | 🟢 Dễ | Component sẵn có: SelectPill, Search |
| Phase 4 (Stats + Aging) | 🟡 Trung bình | Port debtAging.ts + UI upgrade |
| Phase 5 (Advanced) | 🔴 Khó | QR + Zalo + Lab = nhiều module liên quan |

---

## 5. BƯỚC TIẾP THEO

→ Sếp duyệt Brief này → Chạy `/plan` để thiết kế chi tiết DB schema + từng phase
