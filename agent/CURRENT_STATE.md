# CURRENT_STATE.md — Trạng thái thật (mood-studio)

> **File sống — Claude cập nhật mỗi phiên.** Đây là "sự thật hiện tại", thay cho các
> PLAN cũ đã lỗi thời (`plans/260603-native-feel-performance/` KHÔNG còn phản ánh
> thực trạng — user xác nhận đã tối ưu nhiều mà không cập nhật file đó).
> Cập nhật gần nhất: **2026-08-24** · nhánh: `main` @ `25f2856`.

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
