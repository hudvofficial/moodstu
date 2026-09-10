# CHƯƠNG TRÌNH TỐI ƯU HỆ THỐNG — mood-studio

**Bản 2 · 01.09.2026 · ĐÃ DUYỆT 02.09.** 

> 🎯 **Thi hành bằng `/buoc`** — sổ máy đọc: `agent/GOALS.yaml` · lệnh: `.claude/skills/buoc/SKILL.md` (một bước/lần, đúng gate, done phải có bằng chứng).
> 📍 **TRẠNG THÁI (10/09):** **⛩ G1 QUA 10/09 → GĐ2** · 19/32 bước xong (GĐ1 trọn trừ #6/#9/#14 hoãn theo luật vận hành ≠ kỹ thuật; GĐ2 đã xong sớm #22 #24 #26 #27 #30a) · V0 mốc 3 (10/09, `agent/V0-LOG.md` ³): 4 HĐ chạy · kẹt 8,5tr · đỏ 0 · thu-đủ-chưa-đóng 1 · lab 2,14tr — giảm mạnh so baseline 02/09 (29 · 92,6tr · 13 · 9) do chủ đóng 24 HĐ ngày 06/09 · kế tiếp #17 goals đọc ledger · #18 health-score · #19 audit actor · #23 snapshot đóng sổ · #25 khoá gallery. Trạng thái chi tiết: `agent/GOALS.yaml`.

Nguồn: bảng kiến trúc §00–§20 · sổ đối chiếu 37 mục · hội đồng 5 lăng kính + 3 giám khảo. Khung: **nền móng → xương → modules → vận hành** (theo định hướng của chủ).

---

## Luật chương trình — thứ phân biệt tối ưu doanh nghiệp với vá lẻ

1. **Đơn vị bàn giao là CHUẨN + CƠ CHẾ, không phải bản vá.** Phép thử bắt buộc cho mọi việc: *"việc này để lại cơ chế gì tồn tại sau nó?"* Việc chỉ làm hết một triệu chứng mà không để lại chuẩn thì không được đứng một mình trong chương trình — nó phải là hệ quả thi hành của một chuẩn.
2. **Phase-gate.** Không mở giai đoạn sau khi cổng nghiệm thu giai đoạn trước chưa qua (ngoại lệ duy nhất: việc an toàn khẩn). Cổng là số đo, không phải cảm giác.
3. **Trần năng lực duyệt: 2–3 diff/tuần** (ADR-018 — một người duyệt mọi diff). Chương trình vượt trần là chương trình trên giấy.
4. **Chuẩn thay đổi DB (schema-as-code tối thiểu):** mọi `CREATE OR REPLACE`/`DROP` — dump bản sống trước · file revert sẵn · một dòng `agent/DB-CHANGELOG.md` · diff catalog lại ở cổng mỗi giai đoạn.
5. **Không phá thứ đang là lợi thế:** lõi sổ sách ADR-016 (nợ khách 0đ), máy trạng thái đơn in, realtime signal-only, proxy.ts mỏng. Tối ưu quanh lõi, không thay lõi.

---

## GIAI ĐOẠN 1 — NỀN MÓNG: hệ có thể thay đổi mà không sợ chết · tuần 1–3

**Mục tiêu:** trước khi tối ưu bất cứ gì, hệ phải (a) phục hồi được, (b) có sự thật lược đồ, (c) có thước đo, (d) có quyết sách vận hành.

| Chuẩn dựng lên | Thi hành cụ thể (hệ quả của chuẩn) |
|---|---|
| **S1 · Khả năng phục hồi** — RPO ≤24h, có diễn tập, có runbook | Backup pg_dump đêm · 1 lần restore thử ra project rỗng · runbook sự cố 1 trang (rollback Vercel, restore DB) · ghi rõ phạm vi: ảnh nằm Drive + 3 bucket, ngoài pg_dump. **Môi trường thử = capability restore-on-demand**: dựng từ bản dump TRƯỚC mỗi đợt sửa DB của GĐ2 — theo sự kiện, không nghi thức tuần (đúng phán quyết hội đồng) |
| **S2 · Sự thật lược đồ** — repo phải phản ánh DB, drift bị phát hiện | Dump catalog (pg_proc·policies·constraints) làm baseline · diff với repo · `DB-CHANGELOG.md` bắt buộc từ nay · đo `DISTINCT` các cột status |
| **S3 · Kỷ luật ghi production** | Cờ `ALLOW_PROD_WRITE` cho 40 script có lệnh ghi · hook pre-push tĩnh <2 phút |
| **S4 · Thước đo & quyết sách** | **Phiên chốt C0–C9** (1 buổi — ~1/3 chương trình đứng sau nó; kèm số ảnh-vượt-gói làm input C4) · V0 script 5-số chạy mỗi thứ Hai, baseline: 92,6tr · 17 · 3 · 117 ngày · nợ lab 1,9tr (đính chính 02/09: 8,15tr là số cũ trước M2b) |

**Thi hành nghiệp vụ kèm theo GĐ1** *(mỗi cái là ca áp dụng đầu tiên của một chuẩn, không phải vá lẻ)*:
- Chuẩn nhất-quán-hàm-schema (S2) → **R2 rồi R1** (thứ tự trọng tài: vá lưới trước, mở van sau) → **dọn tồn 1 buổi** (huỷ 5 · đóng 3 · rà 21).
- Chuẩn mọi-tiền-đi-một-cửa (ADR-016 sẵn có) → **đối soát nợ lab còn 1,9tr** (đính chính 02/09: 26 phiếu 7,94tr đã ghi & phân bổ qua M2b — luồng CÓ được dùng; việc còn lại chỉ là xác nhận 1.905.000đ còn nợ có thật + gắn `payee_id` cho 3 phiếu 500k thiếu lab).
- Chuẩn một-số-một-nguồn (mở màn) → **nhãn "Doanh thu"** đọc `finance_month_summary` · **filter lương** `hoan_thanh`.
- 0-code: chủ nhắn 5 khách già đơn nhất ngay tuần 1.

**⛩ CỔNG G1** — qua hết mới mở GĐ2: backup 7/7 đêm + 1 restore thành công · baseline catalog + CHANGELOG vận hành · biên bản C0–C9 · V0 chạy 2 tuần liên tiếp · 0 HĐ kẹt huỷ · nợ lab 1,9tr xác nhận đúng thực tế.

---

## GIAI ĐOẠN 2 — XƯƠNG: bốn trục kiến trúc · tuần 3–7

**Mục tiêu:** bốn trục xuyên hệ đạt chuẩn — từ đây mọi module đứng trên xương chung, không tự chế.

### T1 · Trục SỐ LIỆU — chuẩn "một số, một nguồn, một luật ngày"
`finance_period_ledger` là nguồn duy nhất cho mọi số theo kỳ. Thi hành: `/finance/goals` (diệt R10 — **deadline trước sheet lương T9**) · `buildCloseSnapshot` · `finance_cashflow_timeline` · health-score thôi đọc `debts` rỗng — tất cả về ledger, giữ `_legacy` 1 kỳ so chéo. **Cơ chế ở lại:** `scripts/verify-numbers.mjs` — lưới đối chiếu chạy trước mỗi chốt sổ, chặn "công thức thứ hai" tái sinh (đã tái sinh 2 lần sau M2 — diệt từng con không đủ).

### T2 · Trục ĐIỀU ĐỘ — hệ từ ghi-chép thành điều-phối
Capability hàng đợi theo tuổi đơn (RPC chỉ-đọc: tuổi · trạm dẫn xuất · việc-tiếp-theo · chờ ai · tiền kẹt · hàng Mồ côi · hàng Đóng-được-ngay) + **nhịp 15' sáng thứ Hai** thành quy trình người trong `vault/90-van-hanh-thuc-te/`. Đây là mảnh nguyên mẫu dây-chuyền-SLA (§20 A4) — dữ liệu đã đủ, chỉ thiếu mặt điều độ.

### T3 · Trục DANH TÍNH & QUYỀN — mô hình 4 tầng, văn bản hoá rồi thi hành đủ
Chuẩn: **edge = danh tính** (proxy.ts, đã có — giữ mỏng) · **route = vai trò** (thi hành mới: layout guard theo route-group đọc ma trận `lib/navigation.ts`) · **action = hành vi** (`require*Access` — vá lỗ: scope lead theo C1, `markLeadAsLost` qua ma trận) · **RLS = anon** (gỡ policy OR đọc mọi HĐ · vá R8 lịch · khoá 5 cửa gallery/drive-download). **Cơ chế ở lại:** trang "mô hình quyền 4 tầng" trong vault + audit **có danh tính** (inject actor tại `withAuth` — một chỗ, ≥95% dòng mới) + nối `LOGIN`.

### T4 · Trục TOÀN VẸN DỮ LIỆU — danh mục đóng, định danh thống nhất
CHECK cho `work_tasks.status` + `contract_events.status` (DISTINCT → chuẩn hoá → NOT VALID → VALIDATE) · một hàm `normalizePhone` cho mọi đường ghi + báo cáo khách trùng (backfill là quyết định riêng) · `total_amount` về server tính. **Cơ chế ở lại:** sai chính tả trạng thái fail lúc ghi thay vì im lặng nhiều tuần.

**⛩ CỔNG G2:** 0 công thức tiền ngoài ledger (grep + verify-numbers xanh) · 100% khu nhạy cảm có role-gate · audit ≥95% dòng mới có danh tính · hàng đợi chạy ≥2 nhịp, hàng Mồ côi = 0 · CHECK status validated · 5 cửa công khai đã khoá.

---

## GIAI ĐOẠN 3 — MODULES: tối ưu theo phiếu điểm · tuần 7–12

Thứ tự theo điểm §19, **kém nhất trước**, mỗi module một đợt = áp 4 trục vào module + việc riêng của thẻ + nghiệm thu điểm mới:

| Đợt | Module (điểm hiện tại) | Nội dung chính | Đích |
|---|---|---|---|
| 3.1 | **Đọc số (D)** | toàn bộ dashboard/reports/goals đọc trục T1; ngưỡng vàng/đỏ theo trạm (C0) vào hàng đợi + V0 | ≥ B− |
| 3.2 | **Lịch (D+)** | thi hành C9 (một nhánh: cắt tính thừa hoặc bỏ lọc) · một cơ chế Google duy nhất · chồng lịch theo C3 | ≥ C+ |
| 3.3 | **Nền tảng (C)** | luật audit thành văn (nguyên tắc đang thiếu của §16) · sửa bộ lọc nhật ký · bucket avatars (tạo hoặc gỡ code) · 3 cache tag | ≥ B− |
| 3.4 | **CRM (C+)** | thi hành C1 trọn: ownership + ma trận mọi đường ghi · nhắc lead đến hạn · nhánh V10 warnings-thành-việc-tồn (C2) | ≥ B− |
| 3.5 | **Nhân sự (C+)** | thanh lý theo C7 (khối lương/cố định + cột chết + attendance/evaluations: làm thật hoặc gỡ) · thống nhất luật ngày với ledger · một công thức Σ lương | ≥ B− |
| 3.6 | **In ấn (B+)** | recompute khi huỷ đơn · nhắc trả lab theo nhịp C5 | giữ B+ |

**⛩ CỔNG G3 = đo lại toàn bộ:** chạy lại đúng quy trình đánh giá §18–19 bằng thước cũ — không trục nào dưới C · Số-hiển-thị ≥ B · sổ đối chiếu: mục ⬛ từ 15 → ≤3 (chỉ còn thứ chờ chốt) · thước 90 ngày: tiền kẹt ≤46tr · HĐ>30d ≤5 · thu-đủ-chưa-đóng = 0.

---

## GIAI ĐOẠN 4 — VẬN HÀNH CHUẨN & TĂNG TRƯỞNG · sau G3

**Nhịp vận hành thành văn** (đây là "operating model" — không phải tính năng): thứ Hai 15' điều độ + V0 · cuối tháng chốt sổ + verify-numbers + 1 phép đối chiếu tay két-thật-vs-sổ (nối hệ với thế giới thật — bỏ sót do kiểm toán chỉ ra) · mỗi quý đo lại sổ đối chiếu + diff catalog.

**Tăng trưởng — chỉ mở khi giữa đã vững, từng việc gate riêng** (§20: A1/A3 VN-hoá): Zalo 1 chạm · phát sinh từ ảnh-vượt-gói (C4) · tự chuyển khi cọc (C6) · nối `get_customer_ltv` · bảng `quotes` (sau khi CHANGELOG vận hành ổn). **Không làm** (đồng thuận hội đồng, giữ nguyên): form lead công khai · DROP mồ côi · CI/CD nguyên con · đổi công cụ migration · scratch-DB định kỳ · drip/loyalty/self-booking · backfill audit cũ · enum `service_type`.

---

## Vì sao đây không phải vá lẻ — bảng đối chứng

| Nếu là vá lẻ | Trong chương trình này |
|---|---|
| Sửa R1 xong là xong | R1 là ca thi hành của chuẩn S2 — kèm CHANGELOG + diff catalog ở cổng, drift sau này bị bắt |
| Sửa nhãn Doanh thu xong là xong | Là ca đầu của chuẩn một-số-một-nguồn — kết thúc bằng lưới verify-numbers chặn tái sinh |
| Vá từng lỗ quyền khi thấy | Mô hình 4 tầng thành văn, thi hành đủ 4 tầng, đo bằng cổng G2 |
| Fix bug lịch, bug audit... theo danh sách | Mỗi module một đợt theo phiếu điểm, nghiệm thu bằng CHẤM LẠI ĐIỂM bằng thước cũ |
| Làm tới đâu hay tới đó | 3 cổng số đo; không qua cổng không đi tiếp; mỗi quý đo lại toàn hệ |

## RACI gọn

**Chủ studio:** duyệt spec/diff (2 cổng người) · phiên chốt C0–C9 · dọn tồn · đối soát lab · nghiệm thu cổng. **Claude:** spec → code sau duyệt → verify → cập nhật hồ sơ (SYSTEM_MAP, sổ đối chiếu, vault) sau mỗi đợt — bảo hành tài sản A− đã xây.

---

## TUẦN TỰ THI CÔNG — 32 bước, 12 tuần

Ký hiệu hình thức: **📄** spec → chủ duyệt → Claude code → chủ xem diff → push · **🗄️** thay đổi DB prod = 📄 + ADR + dump bản sống + file revert + dòng `DB-CHANGELOG.md` · **👁** chỉ đọc, Claude tự làm không cần duyệt · **👤** thao tác của chủ trong hệ · **🤝** phiên chung.
Mỗi tuần tối đa 3 việc 📄/🗄️ (trần duyệt). Bước sau chỉ mở khi bước gate của nó xong.

### GIAI ĐOẠN 1 — NỀN MÓNG

| # | Tuần | Ai | Việc | Hình thức | Gate / mở khoá |
|---|---|---|---|---|---|
| 1 | 1 | Chủ | Duyệt chương trình bản 2 | 👤 | mở toàn bộ |
| 2 | 1 | Claude | Dump catalog DB↔repo (baseline) · đo `DISTINCT` status 3 cột · đếm ảnh-vượt-gói · lập `DB-CHANGELOG.md` | 👁 | input cho #3, #12, #13, #26 |
| 3 | 1 | Chủ + Claude | **Phiên chốt C0–C9** (1 buổi, đi theo `QUY-TRINH-VAN-HANH.md`; Claude trình số từ #2) → biên bản `vault/90-van-hanh-thuc-te/quyet-dinh-C0-C9.md` | 🤝 | mở #22 #24 #30 #31 #32 |
| 4 | 1 | Claude → Chủ | S1: script backup pg_dump hàng đêm (Task Scheduler) + runbook sự cố 1 trang | 📄 | gate của mọi 🗄️ |
| 5 | 1 | Claude | V0: script 5-số đọc 4 RPC canonical, chạy lần đầu → baseline vào `agent/` | 👁 | thước cho cả chương trình |
| 6 | 1 | Chủ | 0-code: nhắn/gọi 5 khách có đơn già nhất | 👤 | — |
| 7 | 2 | Chủ (Claude hướng dẫn) | Diễn tập restore 1 lần ra project Supabase rỗng, đếm bảng/dòng khớp | 👤 | **S1 hoàn tất** — từ đây mới được đụng DB |
| 8 | 2 | Claude → Chủ | Sửa nhãn thẻ "Doanh thu" /dashboard → `finance_month_summary().revenue` + thẻ "Đã thu (két)" | 📄 | ca đầu chuẩn một-số-một-nguồn |
| 9 | 2 | Claude → Chủ | Sửa filter lương `"Hoàn thành"` → `hoan_thanh` + jest | 📄 | — |
| 10 | 2 | Claude → Chủ | S3: cờ `ALLOW_PROD_WRITE` vào 40 script ghi + hook pre-push tĩnh <2' | 📄 | kỷ luật ghi trước sóng sửa DB |
| 11 | 2 | Claude | V0 lần 2 (thứ Hai) | 👁 | — |
| 12 | 3 | Claude → Chủ | **Vá R2** `finance_period_ledger` — lọc phiếu hoàn của HĐ `da_huy` | 🗄️ | gate #7; PHẢI trước #13 |
| 13 | 3 | Claude → Chủ | **Sửa R1** `cancel_contract_cascade` `'da_huy'`→`'huy_don'` | 🗄️ | gate #12 |
| 14 | 3 | Chủ | **Dọn tồn 1 buổi**: huỷ 5 HĐ kẹt · đóng 3 HĐ thu-đủ >90 ngày · rà 21 HĐ ghi việc-tiếp-theo | 👤 | gate #13; dữ liệu mồi cho #19 |
| 15 | 3 | Chủ + Claude | Đối soát nợ lab **1,9tr** (đính chính: 26 phiếu đã ghi qua M2b) — chủ xác nhận 1.905.000đ còn nợ thật; gắn lab cho 3 phiếu 500k thiếu `payee_id` qua UI | 🤝 👤 | — |
| 16 | 3 | Claude | V0 lần 3 → **kiểm CỔNG G1**: backup 7/7 · restore ok · biên bản chốt · V0 3 tuần · 0 HĐ kẹt · lab chênh 0đ | 👁 | **mở GĐ2** |

### GIAI ĐOẠN 2 — XƯƠNG (4 trục)

| # | Tuần | Trục | Việc | Hình thức | Gate |
|---|---|---|---|---|---|
| 17 | 4 | T1 | `/finance/goals` đọc ledger — diệt R10 (**deadline: trước sheet lương T9 nếu C7 = có**) | 📄 | G1 |
| 18 | 4 | T1 | Health-score thôi đọc `debts` rỗng → `finance_debt_stats()` | 🗄️ | G1 |
| 19 | 4 | T3 | Audit có danh tính: inject actor tại `withAuth` + nối `LOGIN` | 📄 | — |
| 20 | 5 | T2 | **V4 hàng đợi tuổi đơn** — RPC chỉ-đọc + section /contracts (tuổi · trạm · việc-tiếp-theo · chờ ai · tiền kẹt · Mồ côi · Đóng-được-ngay) | 📄 (cỡ M — chiếm cả tuần) | #14 |
| 21 | 5 | T2 | V5: trang nhịp 15' thứ Hai trong `vault/90-van-hanh-thuc-te/` + chủ chạy nhịp đầu tiên | 📄 nhỏ + 👤 | #20 |
| 22 | 6 | T3 | Role-gate tầng route: layout guard cho `/admin` `/settings` (± `/crm` theo C1) đọc ma trận `lib/navigation.ts` | 📄 | #3 (C1) |
| 23 | 6 | T1 | `buildCloseSnapshot` → ledger · `finance_cashflow_timeline` → ledger (giữ `_legacy` 1 kỳ) | 📄 + 🗄️ | — |
| 24 | 6 | T3 | Gỡ policy OR `contracts_authenticated_read` + vá R8 lịch (WHERE theo vai) — phạm vi theo C1/C9 | 🗄️ | #3 |
| 25 | 7 | T3 | Probe 5 cửa gallery/drive-download → khoá theo mức lộ, verify flow khách trên emulator | 📄 | — |
| 26 | 7 | T4 | CHECK cho `work_tasks.status` + `contract_events.status`: chuẩn hoá → NOT VALID → VALIDATE | 🗄️ ×2–3 nhỏ | #2 |
| 27 | 7 | T4 | Một `normalizePhone` cho mọi đường ghi (kể cả RPC convert) + báo cáo khách trùng (backfill = quyết định riêng) | 📄 + 🗄️ | — |
| 28 | 7 | T1 | `scripts/verify-numbers.mjs` — lưới đối chiếu trước chốt sổ | 👁 → 📄 | cơ chế ở lại |
| — | 7 | — | **Kiểm CỔNG G2**: 0 công thức ngoài ledger · 100% khu nhạy cảm có role-gate · audit ≥95% · Mồ côi = 0 · CHECK validated · 5 cửa đã khoá | 👁 | **mở GĐ3** |

### GIAI ĐOẠN 3 — MODULES (kém nhất trước) · mỗi tuần một module, 2–3 diff

| # | Tuần | Module | Nội dung | Gate |
|---|---|---|---|---|
| 29 | 8 | Đọc số (D) | toàn bộ dashboard/reports đọc T1 · V9 ngưỡng vàng/đỏ theo trạm vào hàng đợi + V0 · `total_amount` về server | C0 |
| 30 | 9 | Lịch (D+) | thi hành C9 một nhánh · gộp 2 cơ chế Google về một · chồng lịch theo C3 | C3 C9 |
| 31 | 10 | Nền tảng (C) | luật audit thành văn · bộ lọc nhật ký · bucket avatars (tạo hoặc gỡ) · 3 cache tag | — |
| 32a | 11 | CRM (C+) | ownership + ma trận mọi đường ghi (C1) · nhắc lead đến hạn · warnings→việc tồn (C2) | C1 C2 |
| 32b | 12 | Nhân sự (C+) · In ấn (B+) | thanh lý theo C7 · luật ngày thống nhất · Σ lương một công thức · recompute khi huỷ đơn · nhắc lab theo C5 | C5 C7 |
| — | 12 | — | **Kiểm CỔNG G3** — chấm lại điểm bằng thước cũ (chạy lại quy trình §18–19) · tiền kẹt ≤46tr · HĐ>30d ≤5 · ⬛ ≤3 | **mở GĐ4** |

### GIAI ĐOẠN 4 — VẬN HÀNH CHUẨN, rồi mới tăng trưởng
Nhịp thành văn: **thứ Hai** điều độ 15' + V0 · **cuối tháng** chốt sổ + verify-numbers + đối chiếu két thật · **mỗi quý** đo lại sổ đối chiếu + diff catalog. Tăng trưởng gate riêng từng việc (Zalo 1 chạm → ảnh-vượt-gói C4 → tự chuyển cọc C6 → LTV → quotes).

**Việc của chủ ngoài duyệt, gom lại:** #1 duyệt · #3 phiên chốt · #6 nhắn khách · #7 diễn tập restore · #14 dọn tồn · #15 đối soát lab · #21 nhịp thứ Hai đầu tiên · nghiệm thu 3 cổng. Tổng ~4 buổi làm việc trực tiếp trong 12 tuần, còn lại là duyệt spec/diff theo nhịp 2–3 lần/tuần.
