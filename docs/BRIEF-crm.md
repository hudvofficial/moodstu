# 💡 BRIEF: CRM Module — V2 (10/10 Target)

**Ngày tạo:** 2026-03-16
**Brainstorm session:** V1 deep audit + market research (HoneyBook, Dubsado, Studio Ninja, Getfly)
**Target:** 10/10 — Copy ALL V1 features + fix ALL V1 weaknesses + thêm V1 thiếu

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT

Studio ảnh cưới cần quản lý 2 nhóm khách:
- **Khách tiềm năng (Leads):** Nhắn tin hỏi giá từ FB/Zalo → cần theo dõi, chăm sóc, chốt deal
- **Khách hàng (Customers):** Đã ký HĐ → cần lưu lịch sử, xem tổng giá trị

V1 đã có ~85% features nhưng code quality thấp (30 files, VARCHAR, no pagination, god files).

## 2. GIẢI PHÁP

V2 CRM = V1 features rebuilt + V2 code standards + V2 design system + V1 thiếu sót.

**Chiến lược:** Copy proven logic từ V1, rebuild trên nền sạch.

## 3. ĐỐI TƯỢNG SỬ DỤNG

- **Primary:** Sale staff — quản lý leads hàng ngày, chốt deal
- **Secondary:** Admin/Manager — xem tổng quan, conversion rate, source analytics

## 4. NGHIÊN CỨU THỊ TRƯỜNG

### Đối thủ quốc tế:
| App | Điểm mạnh | Điểm yếu |
|-----|-----------|----------|
| HoneyBook | UI đẹp, convert flow mượt | Đắt ($19/m), không Việt hoá |
| Dubsado | Customize cực mạnh | Learning curve cao |
| Studio Ninja | Đơn giản, chuyên photographer | Ít analytics |

### Đối thủ VN:
| App | Điểm mạnh | Điểm yếu |
|-----|-----------|----------|
| Getfly CRM | Auto nhắc sinh nhật/kỷ niệm | Generic, không chuyên studio |
| KiotViet | Phổ biến, mạnh kho | CRM yếu |

### Điểm khác biệt của Mood Studio:
1. **Chuyên studio ảnh cưới VN** — pipeline sát thực tế studio
2. **All-in-one** — CRM gắn liền với HĐ, kho váy, lịch chụp
3. **Miễn phí** (self-hosted) vs SaaS trả phí hàng tháng

## 5. TÍNH NĂNG — FULL 10/10

### 🔧 DB Migrations cần thêm (trước khi code)
- [ ] `lead_status_enum` (moi, da_lien_he, hen_gap, da_bao_gia, da_chot, huy)
- [ ] `customers.lead_id` UUID FK → crm_leads (track conversion)
- [ ] RPC `convert_lead_to_customer` (copy V1 atomic logic)
- [ ] RPC `append_care_log` (copy V1 atomic append)

### 👥 Tab "Khách hàng" (copy V1 + fix)
- [ ] Customer list — table + search + filter (source, tags)
- [ ] Customer CRUD — create/edit modal, soft delete
- [ ] Customer detail — slide panel (không navigate away)
- [ ] Customer code auto-gen (KH-001, KH-002...)
- [ ] Lịch sử HĐ — linked contracts list
- [ ] **Lifetime value** — SUM tổng giá trị HĐ ← V1 THIẾU
- [ ] Stats strip (tổng KH, KH mới tháng này, lifetime avg)

### 🎯 Tab "Tiềm năng" (copy V1 + fix)
- [ ] Lead list — table + search + filter (status, source, assigned)
- [ ] Lead CRUD — create/edit modal
- [ ] Pipeline 5 bước: moi → da_lien_he → hen_gap → da_bao_gia → da_chot
- [ ] **Kanban board** — drag-drop leads qua stages (copy V1 pattern)
- [ ] **View toggle** — List ↔ Kanban (copy V1 `LeadsViewToggle`)
- [ ] **Convert lead → KH** — Atomic RPC + redirect tạo HĐ (copy V1)
- [ ] **Care timeline** — structured UI (not just TEXT) (copy V1 `CareLogSection`)
- [ ] **Assign sale** — dropdown chọn NV phụ trách (copy V1)
- [ ] **Mark lost + lý do** — button + input reason (copy V1 `markLeadAsLost`)
- [ ] **Overdue badge** — "Quá hạn 3 ngày" đỏ nổi bật ← V1 THIẾU
- [ ] **Duplicate phone check** — cảnh báo khi tạo lead trùng SĐT ← V1 THIẾU
- [ ] Stats strip (tổng leads, đang active, đã chốt, conversion rate %)

### 📊 Analytics (copy V1 + fix)
- [ ] **Conversion funnel** — horizontal bar chart (copy V1 nhưng refactor)
- [ ] **Source breakdown** — pie/donut chart (copy V1 `SourceChart`)
- [ ] **Conversion rate %** — leads chốt / tổng leads ← V1 THIẾU (vì không có lead_id FK)

### 📱 UX (V2 mới)
- [ ] Skeleton loaders — loading đẹp
- [ ] Micro-animations — entrance, hover
- [ ] Zalo/FB quick link — tap SĐT → mở Zalo
- [ ] Mobile bottom FAB — tạo nhanh lead/KH
- [ ] Responsive 3 breakpoints (Desktop/Tablet/Mobile)

### ⚡ Performance (V2 fix V1)
- [ ] Server-side pagination (V1 load all!)
- [ ] SWR cache + revalidation
- [ ] ENUM status (V1 VARCHAR)
- [ ] Clean code < 250 lines/file (V1 = 500+)
- [ ] Lucide icons (V1 = Material Symbols 500KB)

## 6. ƯỚC TÍNH

- **Độ phức tạp:** Trung bình — copy V1 logic, rebuild UI
- **Thời gian:** ~2 ngày
  - Day 1: DB migration + Server Actions + Tab Khách hàng
  - Day 2: Tab Tiềm năng + Kanban + Analytics + Polish
- **Files dự kiến:** ~20 files (V1 = 30 files)
- **Rủi ro:** Kanban drag-drop phức tạp nhất (~4h)

## 7. V1 → V2 COPY MAP

| V1 File | Copy gì | V2 File |
|---------|---------|---------|
| `pipeline-actions.ts` | moveLeadToStage, assignLead, markLeadAsLost, bulkUpdate | `actions/crm.ts` |
| `leads/actions.ts` | createLead, updateLead, deleteLead, convertToContract, addCareLog | `actions/crm.ts` |
| `ConvertButton.tsx` | Convert flow + confirm | Component mới |
| `KanbanBoard.tsx` + `KanbanCards.tsx` | Drag-drop logic | Refactor < 250 lines |
| `CareLogSection.tsx` | Timeline UI | Refactor < 250 lines |
| `ConversionFunnel.tsx` | Funnel chart | Refactor nhẹ hơn |
| `SourceChart.tsx` | Pie chart | Refactor nhẹ hơn |
| `LeadsViewToggle.tsx` | List ↔ Kanban toggle | Copy pattern |
| `SmartCRMFab.tsx` | Mobile FAB | Copy + adapt |

## 8. BƯỚC TIẾP THEO

→ `/design` để thiết kế chi tiết (DB migration + API spec + UI components)
→ `/visualize` nếu cần Stitch mockup cho Kanban/Analytics
→ `/code` để implement

---

**APPROVED:** ✅ Brainstorm hoàn tất. Target 10/10.
