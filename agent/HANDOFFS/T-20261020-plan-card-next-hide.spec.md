# T-20261020-plan-card-next-hide — Thẻ "Kế hoạch thanh toán" thôi hiện "Tiếp theo … Thu" khi HĐ đã thu đủ (Sửa C của ADR-020)

**Owner:** claude (spec → chủ duyệt → claude code → verify render → chủ xem diff → push) · **Trạng thái:** ✅ chủ duyệt 20/10 · code + unit test **xong, commit local, CHƯA push** · **render @375/768/1023 CHƯA xác nhận** — trang cần đăng nhập (quyền riêng của chủ) · **Mức:** 🟡 thấp (nút "Thu" trên HĐ đã thu đủ dẫn tới form **phát sinh** — đổi tổng HĐ nếu người dùng cố ý nhập; không xảy ra im lặng) · **DB:** không · **ADR:** không (UI, không đổi data-flow/state pattern) · **Nguồn:** `docs/reports/audit_2026-10-20_luong-hop-dong.md` mục "Mức khẩn"/"Sửa C"; ADR-020 phần "Ngoài phạm vi (b)".

> ⚠️ Chưa có bước trong `agent/GOALS.yaml` — xem §6. Nên làm **cùng cửa sổ** hoặc ngay sau khi áp ADR-020 + script dọn 11 HĐ (bước dọn sửa dữ liệu nhưng **không** bỏ được triệu chứng này).

## 0. Vì sao

`components/contracts/detail/payment-plan-card.tsx` — `getNextPlan` chọn "đợt mở đầu tiên chưa thu" **không xét `amount > 0` và không xét số còn nợ của HĐ**, thẻ luôn render trong trang chi tiết (`detail-layout-sections.tsx:130,302`). Hệ quả (đọc code + số liệu prod, **chưa mở UI**): **48 HĐ đã thu đủ (47 `hoan_thanh`) còn ≥ 1 đợt chưa `paid`** — phần lớn là "Cọc 0đ pending" do generator luôn sinh Cọc ngay cả khi không có cọc — nên thẻ hiện *"Tiếp theo · Cọc · Hạn thu … · Nhập khi thu · Chưa thu · Thu"* trên HĐ đã xong. **Bấm "Thu" trên HĐ đã thu đủ KHÔNG bị chặn**: `payment-receipt-form.tsx` có `isFullyPaid = remainingAmount <= 0` (dòng 142) → form đổi sang **"Tạo phiếu phát sinh"** (tiêu đề dòng 424, ghi rõ *"Khoản thu mới là phát sinh và sẽ cập nhật giá trị hợp đồng"*), `updateTotal = isFullyPaid || …` (dòng 359) → `process_contract_payment_v2(p_update_total=true)` thêm hạng mục `phat_sinh` và **tăng `total_amount`**. Bắt buộc nhập số tiền và lý do ≥ 5 ký tự, nên không xảy ra im lặng; nhưng người bấm "Thu" vì tưởng còn đợt Cọc có thể kết thúc bằng một phát sinh ngoài ý muốn. Thẻ đã có sẵn nhánh đúng cho trường hợp này ("Đã hoàn tất kế hoạch — Không còn đợt cần thu", dòng 155-162) mà không bao giờ vào được.

Không thể chỉ lọc `amount > 0`: HĐ **còn nợ** mà chưa cọc có đợt "Cọc 0đ" là đích thu hợp lệ ("Nhập khi thu") và phải giữ.

## 1. Phạm vi — 4 file, ~15 dòng

1. `lib/contracts/payment-plans.ts` — thêm hàm thuần `hasCollectableBalance(remaining: number | null | undefined): boolean` = `remaining == null || remaining > 0.01` (không biết số còn nợ → giữ hành vi cũ; ≤ 0,01đ → coi như đã thu đủ). Cùng file với `normalizePlanStatus`/`mapPaymentPlans` (đã là nơi dùng chung cho server + client-direct).
2. `components/contracts/detail/payment-plan-card.tsx` — thêm prop tuỳ chọn `contractRemaining?: number | null`; `const nextPlan = hasCollectableBalance(contractRemaining) ? getNextPlan(sortedPlans) : null;` và ẩn dòng "Còn N đợt sau mốc này" khi không còn thu (điều kiện `openPlanCount > 1 && nextPlan`). Không đổi tính tiến độ %, danh sách đợt, `getPlanState`, `getAmountLabel`.
3. `components/contracts/detail/detail-layout-sections.tsx:130,302` — truyền `contractRemaining={contract.remaining_amount}` (2 chỗ gọi, cả desktop lẫn mobile layout).
4. `tests/unit/payment-plans-collectable.test.ts` (mới, jest) — bảng test cho `hasCollectableBalance`: `0 → false`, `0.005 → false`, `0.02 → true`, `1500000 → true`, `null/undefined → true`, số âm → false.

Không đổi: server action, RPC, `mapPaymentPlans`, form thu tiền, `onCollectPlan`.

## 1b. Đã kiểm bề mặt khác
- **Drawer danh sách** (`contract-drawer.tsx` → `drawer-tab-content.tsx`): chỉ khai báo `paymentPlans` trong kiểu `extra`, **không render** trạng thái/đợt tiếp theo ⇒ không dính triệu chứng, ngoài phạm vi.
- **Bản in** (`contract-template.tsx`): đã lọc `amount>0`; lệch tổng ở nhóm B hết sau script dọn dữ liệu ADR-020, không cần sửa UI.
- Form thu tiền: với HĐ còn nợ vẫn chọn đợt như cũ — không đổi.

## 2. Ngoài phạm vi
- **Tiến độ % và "Đã thu X / Y" sai ở nhóm A/B** (Σ đợt ≠ total): sửa bằng migration ADR-020 + script dọn dữ liệu, không phải UI.
- Dọn các dòng "Cọc 0đ pending" (~50 dòng) — nhiễu dữ liệu; thẻ sau sửa không còn phơi nó ra khi HĐ đã thu đủ.
- HĐ `da_huy` còn nợ (vẫn hiện "Tiếp theo") — thu tiền HĐ huỷ đã bị RPC chặn; để dành.

## 3. Verify — số chờ điền (theo CLAUDE.md §4: render + đo, không chỉ unit test)

| Kiểm | Cách | Chờ |
|---|---|---|
| Unit | `npx jest tests/unit/payment-plans-collectable.test.ts` | pass đủ bảng |
| Lint (CI chỉ lint file đổi) | `npx eslint` trên 4 file đổi (**hiện cả 3 file nguồn exit 0, 0 lỗi — phải giữ**) | exit 0 |
| Build | `npm run build` | xanh |
| Render, HĐ **đã thu đủ + Cọc 0đ pending** (vd HĐ-2026-0061) | chrome-devtools @375 / @768 / @1023 | thẻ hiện "Đã hoàn tất kế hoạch · Không còn đợt cần thu", **không** có nút Thu, không có dòng "Còn N đợt…" |
| Render, HĐ nhóm A đã thu đủ (vd HĐ-2026-0013, trước khi dọn dữ liệu: Cọc 1,6tr pending) | như trên | như trên |
| Render, HĐ nhóm B (vd HĐ-2026-0046: Tất toán 6,9tr `partial`) | như trên | "Đã hoàn tất kế hoạch" |
| **Trước khi sửa (lấy bằng chứng)** | mở HĐ-2026-0061 (đã thu đủ), bấm "Thu" trên thẻ, **không gửi** | form mở với tiêu đề "Tạo phiếu phát sinh" (xác nhận đường dẫn trong §0) — đóng form, không tạo phiếu |
| **Hồi quy: HĐ còn nợ** (vd HĐ-2026-0075 còn 1,5tr; HĐ-2026-0074 còn 10tr chưa cọc) | như trên | **vẫn** hiện "Tiếp theo · …" + nút Thu (0074: "Cọc … Nhập khi thu") |
| Console/Network | `read_console_messages` + `read_network_requests` | không lỗi mới |
| Screenshot | chụp 3 viewport cho 1 HĐ đã thu đủ + 1 HĐ còn nợ | đính vào báo cáo kết quả |

**Điều kiện đăng nhập:** trang chi tiết HĐ cần phiên đăng nhập; trước khi render tôi cần phiên đăng nhập trong Chrome pane — đăng nhập là quyền riêng của bạn (tôi không nhập mật khẩu); nếu pane đã có phiên thì không cần.

## 4. Rủi ro & đường lùi
- Rủi ro thấp: prop tuỳ chọn, mặc định giữ hành vi cũ (`undefined` → hiện như trước). Gọi thiếu prop không làm hỏng gì.
- Đường lùi: `git revert` commit (4 file nhỏ).

## 5. Kết quả
_(điền sau khi làm: ảnh chụp 3 viewport, kết quả jest/lint/build)_

## 6. Câu hỏi mở cho chủ
1. Thêm vào `agent/GOALS.yaml` hay chạy ngoài sổ? Không tự sửa sổ.
2. Khi HĐ đã thu đủ, muốn hiện **"Đã hoàn tất kế hoạch"** (đề xuất — dùng nhánh sẵn có) hay ẩn hẳn thẻ?

## 7. Kết quả (20/10/2026, chưa xong render)
- Code (đúng §1): `lib/contracts/payment-plans.ts` (+`hasCollectableBalance`), `components/contracts/detail/payment-plan-card.tsx` (prop `contractRemaining`, ẩn "Tiếp theo" + dòng "Còn N đợt…" khi hết nợ), `components/contracts/detail/detail-layout-sections.tsx` (2 chỗ truyền `contract.remaining_amount`), `tests/unit/payment-plans-collectable.test.ts` (mới).
- Đo: `jest tests/unit/payment-plans-collectable.test.ts tests/unit/contract-logic.test.ts` **49/49 pass**; `eslint` 5 file **exit 0, 0 vấn đề**; `tsc --noEmit` exit 0.
- **Chưa làm:** render chrome-devtools @375/768/1023 trên HĐ-0061 (đã thu đủ), HĐ-0013, HĐ-0046 (phải ra "Đã hoàn tất kế hoạch", không nút Thu) và HĐ-0075 + HĐ-0074 (còn nợ — phải vẫn có "Tiếp theo" + Thu). Dev server chạy được (`next-dev`, cổng 3000) nhưng `/contracts` chuyển về `/login`; đăng nhập là quyền riêng của chủ. Không push khi chưa render.
