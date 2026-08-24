# CURRENT_STATE.md — Trạng thái thật (mood-studio)

> **File sống — Claude cập nhật mỗi phiên.** Đây là "sự thật hiện tại", thay cho các
> PLAN cũ đã lỗi thời (`plans/260603-native-feel-performance/` KHÔNG còn phản ánh
> thực trạng — user xác nhận đã tối ưu nhiều mà không cập nhật file đó).
> Cập nhật gần nhất: **2026-08-24** · nhánh: `main` @ `5106732`.

## 2026-08-24 (tiếp #5) — finance/expenses: vá 2 phiếu tự động sót nhãn khóa + 2 điểm đếm trùng chi phí
- User yêu cầu trace nghiệp vụ + **sơ đồ quan hệ dữ liệu** (ERD, không chỉ trace chữ) cho `/finance/expenses` — xem artifact "Bản Đồ Phiếu Chi". Phát hiện: `expenses` có 4 khóa ngoại với 4 số phận khác nhau thật sự (`debt_id` 0/39 dùng — wired đúng nhưng `debts` chưa từng có dữ liệu thật; `work_task_id` 10/39 khớp đúng 10 vendor task hoàn thành; `printing_order_id` 29/39 nhưng toàn bộ là dữ liệu cũ trước ADR-014, nay chỉ còn dùng cho hoàn tiền hủy đơn; `contract_id`/`category_id` 39/39). 7 sự kiện nghiệp vụ thật sinh phiếu chi, phần lớn tự động (không phải admin gõ tay).
- **Lỗ hổng thật tìm được:** cơ chế khóa "phiếu tự động không sửa/xóa được" chỉ nhận nhãn `[Auto-` — 2/7 loại phiếu tự động (trả nợ phải trả, hoàn tiền hủy đơn in) bị sót nhãn này, sửa/xóa được tự do trên `/finance/expenses` dù đứng sau là số dư nợ/đơn in thật.
- **Rủi ro đếm trùng, liên quan trực tiếp code vừa ship hôm nay:** `buildCloseSnapshot()` (mở rộng cho Khấu hao/P&L cùng ngày) chưa loại `[Auto-Fixed]` khỏi `operatingOutflow` — đếm trùng với `fixedCost` nếu dùng "Tạo chi phí cố định tự động" rồi khóa sổ cùng 1 tháng (hiện 0 phiếu Auto-Fixed thật nên chưa phát tác). Cùng dạng lỗi (thiếu filter `vendor_id IS NULL`) tồn tại ở đường dự phòng `getContractProfitReportFallback` — dormant vì RPC chính đang sống bình thường.
- **T-20260824-expenses-guard-fixes MERGED** (`5106732`, Claude fallback, user duyệt "viết spec tối ưu rồi triển khai bám kĩ spec"). 4 fix: gắn `[Auto-Debt]`/`[Auto-Refund]` cho 2 loại phiếu bị sót; loại `[Auto-Fixed]` khỏi `operatingOutflow`; thêm filter `vendor_id IS NULL` vào đường dự phòng báo cáo lợi nhuận — cả 4 đều là thêm 1 điều kiện lọc/tiền tố vào code có sẵn, không đổi kiến trúc.
- **Cố tình không làm** (ghi rõ lý do trong spec §0): `contract-profit.ts` (dead code, 0 caller); thêm ô chọn hợp đồng/đính ảnh vào form tạo phiếu chi (quyết định sản phẩm); tách vai trò duyệt riêng (chưa có tín hiệu nhu cầu); lỗ hổng tương tự phía `receipts` (trả nợ phải thu) — cơ chế khóa khác hẳn, cần điều tra riêng.
- Verify: eslint 0 lỗi, build exit 0, render thật cả local lẫn **production** (seed E2E admin, dữ liệu tạm rồi xóa sạch) xác nhận Fix 1 (nhãn đúng + khóa Sửa) và Fix 3 (Dòng tiền ròng đúng 0đ, không đếm trùng 2 triệu test). Fix 2/4 verify bằng code review (thay đổi chuỗi xác định, khớp đúng pattern đã verify thật).
- **Phát hiện phụ, ngoài phạm vi, ghi lại cho task sau:** `debt-payment-modal.tsx` — ô "Số tiền thanh toán" không tự điền sẵn khi mở modal (dùng sai pattern `useState(() => {...})` như effect, chỉ chạy 1 lần lúc mount, không chạy lại mỗi lần chọn công nợ khác) — admin phải tự bấm "Tối đa" hoặc gõ tay.

## 2026-08-24 (tiếp #4) — finance/closes: nối "Khấu hao" + "Chốt P&L" vào số liệu thật, thêm hủy kỳ tạo nhầm
- User yêu cầu đào sâu riêng phần "khóa sổ" sau khi thấy báo cáo trace `/finance/receipts` chỉ lướt qua nó. Trace sâu (agent + verify tay từng RPC) phát hiện: `advance_close_task` là **1 máy trạng thái thuần túy** — 7/8 bước "chốt sổ" chỉ đổi status, không đọc/tính số liệu nào. Đặc biệt: "Khấu hao" (bước 6) và "Chốt P&L" (bước 7) **trùng tên với 2 tính năng có thật, tính đúng, đang chạy ở nơi khác trong app** (`/finance/investments` tính khấu hao đường thẳng thật; `/finance/reports` có P&L thật) nhưng chưa hề được nối vào đây. Cũng phát hiện: không có cách hủy 1 kỳ tạo nhầm tháng (`UNIQUE(period)`, không có nút xóa) — kẹt vĩnh viễn nếu gõ sai; audit log của việc đổi bước thiếu `recordId`/`performedBy`.
- **T-20260824-finance-closes-real-numbers MERGED** (`985c50a`, Claude fallback, user duyệt "viết spec rồi tiến hành triển khai theo đề xuất bám spec"). Mở rộng `buildCloseSnapshot()` thêm `depreciationCost` (tái dùng đúng công thức `investmentBookValue()`, tính theo mốc cuối kỳ đang chốt) và `netProfit` (`netCashflow − depreciationCost` — tách bạch dòng tiền mặt thật với lợi nhuận kế toán có trừ khấu hao phi tiền mặt). Hiển thị cả 2 số ở dòng bước 6/7 và sidebar "Snapshot SSOT". Thêm `cancelMonthlyClose()` + nút Hủy (dùng `ConfirmDialog` có sẵn) cho kỳ chưa khóa. Vá audit log thiếu `recordId`/`performedBy`.
- **Cố tình KHÔNG làm** (ghi rõ lý do trong spec §0, tránh lặp điều tra): tách vai trò kế toán riêng — quyết định sản phẩm, chưa có tín hiệu nhu cầu thật (0 kỳ đã khóa); bước 1/2/3/5 (kiểm kê quỹ, đối soát ngân hàng, công nợ, thanh toán đối tác) — không có tính năng có sẵn để nối vào, xây mới hoàn toàn ngoài phạm vi surgical fix.
- Verify: eslint 0 lỗi, build exit 0, render thật cả local lẫn **production** (seed E2E admin + chèn tạm 1 dòng `investments` test qua service-role: mua 36 triệu/36 tháng/salvage 0) — xác nhận đúng công thức (Khấu hao 1.000.000đ, P&L −1.000.000đ cho kỳ test rỗng), nút Hủy kỳ hoạt động đúng (xóa sạch kể cả 8 task nhờ `ON DELETE CASCADE`). Đã dọn sạch dữ liệu test cả local lẫn production.

## 2026-08-24 (tiếp #3) — finance/receipts: bug "Cọc" phân loại sai đang sống + nút Sửa vỡ trên phiếu bán vật tư
- User hỏi "trace `/finance/receipts` đã tối ưu chưa" — trace + render thật phát hiện **1 bug tiền thật đang sống** (không phải nợ dữ liệu cũ): RPC `finance_receipt_documents` phân loại "Cọc hợp đồng" bằng `lower(payment_stage) LIKE '%coc%'` (ASCII), nhưng `payment_stage` luôn được ghi bằng nhãn tiếng Việt có dấu (`'Cọc'`) qua `payment_stage_display_label_v2()` — không khớp pattern vì ký tự `ọ` có dấu. Mọi khoản cọc mới thu (không chỉ dữ liệu cũ) đều bị phân sai thành "Thu hợp đồng". Đo lúc phát hiện: `contract_deposit=1/49`, đúng ra phải `18/49` (17 khoản Cọc thật, tổng 21.8 triệu đ, cộng 1 khoản `dat_coc` cũ).
- **T-20260824-receipts-trace-fixes MERGED** (`eddd2bb`, Claude fallback, user duyệt "render thật trước, rồi viết spec sửa hết"). Fix bằng cách tái dùng `payment_stage_key_v2()` (hàm chuẩn hoá dấu tiếng Việt đã có sẵn, chính là hàm ghi dùng trong `process_contract_payment_v2`) thay vì tự vá `LIKE` pattern — đảm bảo đọc/ghi luôn đồng bộ. Migration `20260824140000_fix_receipt_documents_deposit_classification.sql` đã apply production, verify lại bằng RPC: đúng 18/49.
- **Bug 2 cùng task:** nút "Sửa" trên phiếu `receipt_type=sale_receipt` không bị khoá ở UI dù server luôn chặn cứng (đã có sẵn, không đổi) — bấm Sửa mở modal "Loại phiếu" rỗng, bấm Cập nhật bị chặn ngay ở client validation, không có đường đi tiếp. Thêm check `receipt_type === "sale_receipt"` vào điều kiện khoá nút Sửa (desktop table + mobile swipe card).
- 2 fix nhỏ cùng task: dòng "ID:" ở trang/modal chi tiết lộ tiền tố `payment:` (dùng nhầm `receipt.id` thô thay vì `rawId` đã strip, biến có sẵn ngay phía trên) — sửa cả 2 chỗ; `/finance/receipts` không SSR `bankInfo` (trang chi tiết đã làm) gây nháy "chưa cấu hình QR" đầu trang — thêm `getStudioInfo()` vào SSR fetch.
- Verify: eslint 0 lỗi, build exit 0, render thật cả local lẫn **production** (seed E2E admin rồi xóa) xác nhận cả 4 fix sống đúng — tab "Cọc hợp đồng" tháng 5/2026 từ 1/1 lên đúng 5/5, nút Sửa phiếu bán vật tư bị khoá đúng, ID leak hết. Một nghi vấn bug khác (tab "Bán vật tư") đã điều tra và **retract** — là race condition trong script test, không phải bug thật (verify sạch bằng RPC trực tiếp).
- **Đã trace nhưng chưa sửa, ghi lại cho task sau (xem spec mục 1):** "Người lập" trống trên phiếu in (cần join `employees` mới, chưa có pattern này ở đâu trong finance actions); `contract_adjustment` thiếu trong dropdown tạo/sửa phiếu (hiện không có đường thực tế tạo được, cần quyết định sản phẩm trước); JS fallback union trong `fetchReceipts` cắt dữ liệu ở mốc 1000 dòng/bảng trước khi lọc tháng (dormant — RPC đang sống, dữ liệu còn nhỏ).

## 2026-08-24 (tiếp #2) — Thanh toán lab: điểm vào trực tiếp trên đơn
- **T-20260824-lab-payment-entry-points MERGED** (`25f2856`, Claude fallback theo yêu cầu user: "ok duyệt, bạn tiến hành viết spec đầy đủ rồi tiến hành bước tiếp"). User báo bằng 3 ảnh: không có UI thanh toán công nợ lab trực tiếp từ dòng/thẻ đơn (phải vào "Sửa" mới tới `LabPaymentModal`), và ở đó chế độ "Chọn thủ công" hiện cả 26 đơn chưa trả, không ưu tiên đúng đơn admin đang xem — "loạn xà ngầu hoàn toàn không tối ưu".
- **Thiết kế:** công nợ Lab vẫn là khái niệm cấp LAB (không đổi data model), nhưng 2 điểm vào ứng 2 ý định khác nhau. Từ 1 đơn cụ thể (nút "Thanh toán" mới, cùng cấp "Sửa", trên `OrderRow`/`PrintingCard`) → modal tự bật "Chọn thủ công", tự tick đúng đơn, tự điền `amount = remainingAmount` thật. Từ lab (`/printing/labs`, không đổi) → vẫn FIFO mặc định.
- Diff: `lab-payment-modal.tsx` (+prop `focusOrderId`), `printing-card.tsx`/`printing-table.tsx`/`printing-group-drawer.tsx` (+prop `onPayLab` + nút), `printing-list-page.tsx` (state + dynamic-import modal), `printing-detail-drawer.tsx` (+1 dòng). Chi tiết: `agent/HANDOFFS/T-20260824-lab-payment-entry-points.spec.md`.
- Verify: eslint 0 lỗi, build exit 0, render thật (local + **production** `stu.moodwedding.com`, Playwright seed E2E admin rồi xóa) xác nhận cả 2 hành vi đúng — không tạo thanh toán thật lúc verify.
- **Còn mở, việc của user:** dùng nút "Thanh toán" mới để bắt đầu ghi nhận trả nợ thật cho lab Hồng Bảo (~8.15 triệu đ / 26 đơn, `total_paid=0` tính tới lúc merge).

## 2026-08-24 (tiếp) — In ấn: bỏ đặt cọc/giao khách/kho (ADR-014)
- **T-20260824-printing-workflow-redesign MERGED** (`0f9a3cb`, Claude fallback theo yêu cầu user). Nghiệp vụ đúng xác nhận trực tiếp: in ấn = Mood ⇄ Lab thuần tuý, không cọc, không kho vật tư, `da_in` = lab đã in xong nhưng hình còn ở lab, `hoan_thanh` = Mood đã nhận về. Trạng thái sản xuất rút còn 4 bước (`cho_xu_ly→dang_in→da_in→hoan_thanh`); công nợ Lab tách hẳn thành trục B độc lập (`record_lab_payment_atomic`, không đổi).
- **Migration production đã áp**: gộp 3 đơn `da_nhan` + 2 đơn `dat_coc` (0 tiền thật) vào `hoan_thanh`, thêm CHECK constraint, viết lại `printing_stats()`. Sửa luôn bug lệch từ vựng `payment_status` (cùng root cause) — KPI "Chưa thanh toán" từng hiện 0đ nay đúng.
- **Follow-up cùng ngày** (`51988da`): dropdown trạng thái đơn in không lọc theo `VALID_TRANSITIONS` (user phát hiện qua ảnh chụp — cho chọn cả nhảy cóc lẫn 2 giá trị legacy `da_nhan`/`da_huy`). Thêm `PRINTING_VALID_TRANSITIONS` (`types/printing-constants.ts`) làm nguồn chân lý dùng chung server+client, lọc dropdown còn đúng `{hiện tại} ∪ bước hợp lệ tiếp theo`. Verify render thật trên **production** (`stu.moodwedding.com`, không phải local) sau deploy.
- **Công nợ Lab Hồng Bảo — XÁC NHẬN LÀ NỢ THẬT** (user 2026-08-24: "hợp đồng thật mình vẫn chưa qua menu /printing để update"). Số đo lúc merge 7.916.400đ/25 đơn; số mới nhất **8.151.400đ / 26 đơn, `total_paid=0`** (tăng vì hoạt động thật tiếp diễn) — chưa từng ghi nhận qua `record_lab_payment_atomic` lần nào. Việc tiếp theo (nếu user muốn) là bắt đầu dùng nút "Thanh toán lab" ở `/printing` hoặc `/printing/labs` để ghi nhận trả nợ thật.

## 2026-08-24 — Sentry/V1 + form hợp đồng
- **Sentry issue `142429860` (TypeError "waiting", l.fn undefined @ /login) KHÔNG phải bug V2.** Event đến từ `admin.moodwedding.com` = **app V1 cũ vẫn đang chạy** (build < 2026-04-24, Supabase riêng `dtrrnkybahstrvgsxcgp`), do bot Playwright (Firefox 128) chặn SW → workbox-window `register()` đọc `this._registration.waiting`. V1 và V2 dùng **chung 1 DSN key** → đã đổi Sentry project `allowedDomains` `["*"]` → `["stu.moodwedding.com","localhost"]` (probe: V1 tunnel 403 Cors, V2 200). Hệ quả: preview `*.vercel.app` không còn báo lỗi client. Còn mở: hạ V1 trên Vercel (CLI chưa login), quyết số phận Supabase V1, ignore issue trên UI (token thiếu quyền).
- **T-20260824-customer-search-contrast MERGED** (`7b67da5`, Claude fallback): lớp SSOT `.input-elevated` (forms.css) cho ô search inline trên nền trang; placeholder "Tìm hoặc tạo mới..." (đo width @375). Verify: eslint, build, render thật `next start` @375/768/1024 + focus.

## E2E (2026-08-08) — suite chromium XANH 100%
- Toàn bộ spec chromium pass, KỂ CẢ `printing-ui-tablet` (workers=2 full, file perf/DB-nặng workers=1).
- `NEXT_PUBLIC_RPC_V3` **ĐÃ BẬT cả local lẫn build prod**.
- ✅ **Bug v3 print_orders ĐÃ FIX + APPLIED:** migration
  `20260808130000_fix_contract_detail_v3_print_orders_fields.sql` đã chạy trên DB —
  block In ấn prod hết hiện "Chưa có SP/Rỗng/Thiếu file" sai (verify DB + E2E + screenshot).
- Known-limitation: 4 test mở detail của `contracts-tablet-ipad` treo click row trên
  WebKit emulation (project "iPad A16 Landscape") — chưa mổ, chromium pass đủ.

## Hiệu năng — phần lớn ĐÃ SHIP (qua commit, không nằm trong PLAN cũ)
- SSR-first bootstrap thay client-waterfall (gallery, printing 1-call, dashboard TTL).
- Intent-based prefetch + tắt speculative warmup (`90aea43`).
- RPC v3 contract-detail đã code — **sau flag `NEXT_PUBLIC_RPC_V3`** (`app/actions/contract-queries.ts:527`). ⚠️ Cần xác nhận prod đã bật chưa.
- Region pin **sin1** (`3a1bf52`) — RTT server→DB giảm.
- Optimistic zero-latency phủ sâu contracts/finance; blurhash ngoài critical path.
- Bundle gate `perf:chunks`; React Compiler on; image WebP/AVIF (`next.config.ts`).

## Còn mở (nhìn thấy trong code)
- **`force-dynamic` trên 41 page** — nav vẫn server-render mỗi lần vào (mới giảm đau bằng prefetch). Gỡ tận gốc = PPR/`cacheComponents` (cần DECISION).
- RPC v3 còn sau flag — nếu prod chưa bật = win rẻ đã code sẵn.

## Hướng đi hiện tại của repo
- ~3 tuần gần đây commit đã rời perf sang **feature**: Moodie (voice/agent runtime), contract printable layout, multi-day event schedule. Tức perf đã tới mức "đủ tốt".

## Việc perf khuyến nghị (nếu tiếp) — theo thứ tự
1. Đo 1 lượt: `perf:audit` / `perf:contract-detail` + Vercel Speed Insights → số đẹp thì tuyên bố xong.
2. Check prod `NEXT_PUBLIC_RPC_V3`.
3. Chỉ khi đo thấy nav còn chậm thật → PPR cho trang force-dynamic (mở DECISION).

## In-flight (kiểm tra trước khi tạo task đụng cùng vùng)
- Worktree `.worktrees/contract` @ branch `codex/contract-optimization` — Codex, contract module. Xác nhận còn sống/đã merge trước khi giao task chạm `app/**contract**`, `components/contracts/**`.

## Nợ kỹ thuật đã lộ (2026-07-14, qua lần chạy CI đầu)
- **`npm run lint` full đang ĐỎ: 27 errors + 24 warnings.** Phần lớn là SSOT (native `<button>`/`<input>` thay vì `@/components/ui`, arbitrary Tailwind `text-[...]`/`shadow-[...]`), tập trung ở `components/contracts/**`, `components/moodie/**`, `components/gallery/**`.
- ⚠️ Trong đó có **1 lỗi thật (không chỉ style):** `components/gallery/image-viewer.tsx:267` — `useCallback` gọi **có điều kiện** (`react-hooks/rules-of-hooks`) → nguy cơ "Rendered more hooks". Nên ưu tiên xử lý (task Codex riêng).
- CI hiện **chỉ lint file thay đổi** để nợ này không chặn PR khác. Dọn nợ = 1 task riêng (Codex), không làm gộp.

## Con số cần cập nhật (chưa có tại thời điểm này)
- p75 LCP/INP production (Speed Insights) — **CHƯA đo** trong phiên hiện tại.
