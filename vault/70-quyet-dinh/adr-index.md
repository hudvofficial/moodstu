---
title: "Chỉ mục ADR"
tags: [quyet-dinh, adr]
cap-nhat: 2026-08-31
trang-thai: da-kiem-2026-08-31
doi-chieu: agent/DECISIONS.md (18 ADR, đếm 31/08/2026)
---

# Chỉ mục ADR

Nguồn đầy đủ: [`agent/DECISIONS.md`](../../agent/DECISIONS.md) — **append-only**, không sửa quyết định cũ; muốn đổi thì thêm ADR mới "Supersedes ADR-x".

Note này là mục lục + tóm tắt điều **phải nhớ**. **Hiện có 18 ADR (001–018).** Trang này từng dừng ở ADR-013 trong khi `DECISIONS.md` đã có 17 — chính ADR-018 lấy đó làm ví dụ về cái giá của tài liệu trôi. Thêm ADR mới thì thêm dòng ở đây luôn.

| # | Ngày | Quyết định | Điều phải nhớ |
|---|---|---|---|
| ~~001~~ | 14/07 | ~~Pipeline 3-agent (Claude spec → user duyệt → Codex code → Roo test → Claude review)~~ | **HẾT HIỆU LỰC — ADR-018.** Điều còn giữ: mọi việc qua spec + cổng người |
| ~~002~~ | 14/07 | ~~Single-writer: chỉ Codex ghi source, Roo read-only~~ | **HẾT HIỆU LỰC — ADR-018.** Không còn agent nào ngoài Claude Code |
| ~~003~~ | 14/07 | ~~Giữ subagent `coder`/`reviewer` làm **fallback**~~ | **HẾT HIỆU LỰC — ADR-018.** "Fallback" đã thành đường duy nhất; subagent vẫn dùng được cho việc lớn |
| 004 | 14/07 | Khoá kiến trúc thuộc Claude; `DECISIONS.md` là cổng | Đổi data-flow / thêm lib / đổi schema / RLS → phải có ADR + user duyệt |
| **005** | 14/07 | **Perf coi như "đủ tốt"** | **Không mở lại đợt perf diện rộng.** Muốn làm tiếp: đo trước (Speed Insights + `perf:*`), chỉ sửa cái số đo chỉ ra, mở ADR riêng. Lever nav còn lại dùng **PPR/`cacheComponents`**, KHÔNG client-direct |
| 006 | 15/07 | Codex trên Windows: cấm `apply_patch`, ghi qua `write_file` | `apply_patch` qua PS 5.1 → mojibake |
| **007** | 15/07 | **Gỡ branch protection** — `main` nhận push thẳng | **Không còn cổng cưỡng chế nào.** `push main` = deploy. Vercel chỉ chặn build hỏng; review mới chặn lỗi hành vi. Bằng chứng: Codex làm mất `fill-` ở icon Heart — lint/build/CI đều xanh, chỉ review bắt được |
| **008** | 15/07 | **Gallery: quyền 2 tầng** — xem/tim tự do, **chọn cần mật khẩu** | `PasswordGate` chặn-xem là dead code **cố ý**. Capability so EXACT hai chiều. Nhãn UI là "Mật khẩu chọn ảnh" |
| 009 | 17/07 | Moodie memory: recency dùng `last_used_at` | Không thêm số hạng tần suất riêng |
| 010 | 17/07 | Moodie: **HOÃN** contradiction detection | Lúc quyết định chỉ có 1 memory active toàn hệ thống. Mở lại khi **đo được** near-duplicate. Ưu tiên fix rẻ (vocabulary đóng cho predicate) trước khi thêm LLM call |
| **011** | 21/07 | **Cổng tải ảnh gốc = UX-gate, không phải security-gate** | Chấp nhận lộ ảnh gốc qua URL `lh3` (`=s0`). **Đừng vá bằng cách giấu `drive_file_id`** — fileId nằm sẵn trong URL. Đóng kín thật chỉ mở lại nếu thu tiền tải ảnh thành nguồn thu chính |
| 012 | 21/07 | Gallery public: tối ưu LCP mobile theo số đo | Trong phạm vi ADR-005 (có số đo mới sửa). Nguyên tắc: thumbnail **một cỡ cố định** |
| **013** | 07/08 | **Gắn generic `Database` cho Supabase client — từng module, KHÔNG một lượt** | Đo được: gắn một lượt = **232 lỗi / 68 file**, trong đó **57 lỗi là đọc cột không tồn tại**. Đã bắt được bug thật ngay lần đo đầu (`export-actions.ts` 4/5 export trả HTTP 400). Thứ tự: finance → contracts → inventory/printing → gallery → còn lại. Khai `SupabaseClient<Database>` tại **từng action file**, chỉ đổi `auth_utils.ts` ở bước cuối |
| **014** | 24/08 | **In ấn: bỏ `dat_coc`/`da_giao`/kho khỏi trạng thái đơn** | Trục thật còn **`cho_xu_ly → dang_in → da_in → hoan_thanh`** + `huy_don`/`gap_su_co`; `da_nhan`/`da_huy` là legacy **chỉ đọc**. Mood↔Lab **không có khái niệm cọc**; giao khách thuộc `contract_events.giao_san_pham`. Đơn in **không có kho**. Đo: 0/27 đơn từng dùng `da_giao`, 0/27 có giao dịch kho. Công nợ lab là trục độc lập, không gate bước nào |
| 015 | 25/08 | In ấn: SSOT cho reason/rollback/overdue; drawer đồng bộ theo key; xoá "Hoàn tiền" khỏi luồng huỷ đơn | "Khi nào bắt buộc lý do" / "bước lùi" / "quá hạn" đặt **duy nhất** ở `types/printing-constants.ts`. Lớp bug "2 nơi tự định nghĩa 1 luật" **đã tái diễn** ngay sau ADR-014 → đừng để client tự chép luật của server |
| **016** | 25/08 | **Dòng tiền "Ba sổ": phiếu chi = tiền thật; ngày ghi sổ = ngày nghiệp vụ** | **Không còn phiếu chi "trích trước"** — `upsert_vendor_expense`, `upsert_printing_expense`, trigger vendor đã DROP; `lab_payments`/`vendor_payments` di trú vào `expenses` rồi drop hẳn (M2b). Cam kết đọc từ bản ghi gốc (`work_tasks.cost`, `printing_orders.total_amount`, `inventory_transactions`); `expenses` chỉ ghi khi **tiền rời két**, phân bổ qua `expense_allocations`. Ngày ghi sổ = ngày nghiệp vụ nhập tay, **không bao giờ** `updated_at`. Lợi nhuận HĐ = **một hàm** `contract_financials(uuid[])`, trừ **4** khoản. Sổ kỳ duy nhất = `finance_period_ledger`. → [[luong-tien]] |
| 017 | 26/08 | Huỷ đơn in đi **đúng một đường**; gỡ vết kho khỏi đơn in + 7 object DB phase-1 | `updatePrintingOrderStatus` là SSOT cho mọi đổi trạng thái **kể cả huỷ** (ghi cả `cancelled_at` + `cancellation_reason`); `cancelOrder()` đã xoá. `npm run migrate:latest` không tham số nay **dừng báo lỗi** thay vì chạy ngầm file phase-1 cũ |
| **018** | 29/08 | **Bãi bỏ pipeline 3-agent — chỉ còn Claude Code + 2 cổng người** | ADR-001/002/003 **hết hiệu lực**. Hai cổng thay cho review chéo đã mất: (1) user duyệt spec, (2) **user xem diff trước khi push**. **ADR-004 (khoá kiến trúc) GIỮ NGUYÊN.** Thêm §2b (trước mọi hành động có tác dụng phụ phải trả lời "chạm vào gì" + "dự án quy định gì" **bằng tài liệu**) và §2c (đối chứng hợp lệ: cùng cỡ mẫu, cùng môi trường, đổi một biến). Ca thật: chạy e2e sai môi trường → **rò 11 dòng seed vào DB production** |

## ADR-nhỏ kèm ADR-008 (CSS)

Token `--spacing-*` của dự án đụng namespace spacing scale của Tailwind v4 → mọi `max-w-sm/md/lg/xl` thành 8–32px, vỡ 18 chỗ. Đã đổi toàn cục sang `--space-*`.
**CẤM** định nghĩa `--spacing-*`, `--container-*`, hay namespace utility Tailwind trong `@theme`.

## ADR hay bị quên nhất

1. **ADR-005** — đừng tự ý mở việc tối ưu. Không có số đo thì không sửa.
2. **ADR-007 + ADR-018** — không ai chặn bạn push code hỏng, và **không còn agent thứ hai review**. Verify là tự giác; user xem diff là lưới cuối.
3. **ADR-011** — ảnh gốc lộ được là **quyết định**, không phải bug chưa sửa.
4. **ADR-016** — phiếu chi là **tiền thật**, không phải cam kết. Viết spec tiền mà còn nhắc "trích trước" là đang mô tả hệ thống của tháng 7.
5. **ADR-014** — đơn in **không có `dat_coc`**, không có kho. Vault cũ ở nhiều chỗ vẫn ghi vòng đời cũ.

## ADR đã hết hiệu lực

**001 · 002 · 003** — bãi bỏ bởi ADR-018 (29/08/2026). Ba dòng ấy vẫn nằm trong bảng vì `DECISIONS.md` là append-only; đừng đọc chúng như luật đang chạy. **ADR-004 KHÔNG bị bãi bỏ.**

## Liên quan

[[bay-trien-khai]] · [[gallery]] · [[moodie-ai]] · [[trien-khai-va-verify]] · [[luong-tien]] · [[vong-doi-hop-dong]]
