---
title: "Chỉ mục ADR"
tags: [quyet-dinh, adr]
cap-nhat: 2026-08-07
---

# Chỉ mục ADR

Nguồn đầy đủ: [`agent/DECISIONS.md`](../../agent/DECISIONS.md) — **append-only**, không sửa quyết định cũ; muốn đổi thì thêm ADR mới "Supersedes ADR-x".

Note này là mục lục + tóm tắt điều **phải nhớ**.

| # | Ngày | Quyết định | Điều phải nhớ |
|---|---|---|---|
| 001 | 14/07 | Pipeline 3-agent (Claude spec → user duyệt → Codex code → Roo test → Claude review) | Mọi việc qua spec + cổng người |
| 002 | 14/07 | Single-writer: chỉ Codex ghi source, Roo read-only | Không để 2 agent sửa cùng vùng code |
| 003 | 14/07 | Giữ subagent `coder`/`reviewer` làm **fallback** | Chỉ dùng khi chạy Claude một mình |
| 004 | 14/07 | Khoá kiến trúc thuộc Claude; `DECISIONS.md` là cổng | Đổi data-flow / thêm lib / đổi schema / RLS → phải có ADR + user duyệt |
| **005** | 14/07 | **Perf coi như "đủ tốt"** | **Không mở lại đợt perf diện rộng.** Muốn làm tiếp: đo trước (Speed Insights + `perf:*`), chỉ sửa cái số đo chỉ ra, mở ADR riêng. Lever nav còn lại dùng **PPR/`cacheComponents`**, KHÔNG client-direct |
| 006 | 15/07 | Codex trên Windows: cấm `apply_patch`, ghi qua `write_file` | `apply_patch` qua PS 5.1 → mojibake |
| **007** | 15/07 | **Gỡ branch protection** — `main` nhận push thẳng | **Không còn cổng cưỡng chế nào.** `push main` = deploy. Vercel chỉ chặn build hỏng; review mới chặn lỗi hành vi. Bằng chứng: Codex làm mất `fill-` ở icon Heart — lint/build/CI đều xanh, chỉ review bắt được |
| **008** | 15/07 | **Gallery: quyền 2 tầng** — xem/tim tự do, **chọn cần mật khẩu** | `PasswordGate` chặn-xem là dead code **cố ý**. Capability so EXACT hai chiều. Nhãn UI là "Mật khẩu chọn ảnh" |
| 009 | 17/07 | Moodie memory: recency dùng `last_used_at` | Không thêm số hạng tần suất riêng |
| 010 | 17/07 | Moodie: **HOÃN** contradiction detection | Lúc quyết định chỉ có 1 memory active toàn hệ thống. Mở lại khi **đo được** near-duplicate. Ưu tiên fix rẻ (vocabulary đóng cho predicate) trước khi thêm LLM call |
| **011** | 21/07 | **Cổng tải ảnh gốc = UX-gate, không phải security-gate** | Chấp nhận lộ ảnh gốc qua URL `lh3` (`=s0`). **Đừng vá bằng cách giấu `drive_file_id`** — fileId nằm sẵn trong URL. Đóng kín thật chỉ mở lại nếu thu tiền tải ảnh thành nguồn thu chính |
| 012 | 21/07 | Gallery public: tối ưu LCP mobile theo số đo | Trong phạm vi ADR-005 (có số đo mới sửa). Nguyên tắc: thumbnail **một cỡ cố định** |
| **013** | 07/08 | **Gắn generic `Database` cho Supabase client — từng module, KHÔNG một lượt** · *Proposed, chờ duyệt* | Đo được: gắn một lượt = **232 lỗi / 68 file**, trong đó **57 lỗi là đọc cột không tồn tại**. Đã bắt được bug thật ngay lần đo đầu (`export-actions.ts` 4/5 export trả HTTP 400). Thứ tự: finance → contracts → inventory/printing → gallery → còn lại. Khai `SupabaseClient<Database>` tại **từng action file**, chỉ đổi `auth_utils.ts` ở bước cuối |

## ADR-nhỏ kèm ADR-008 (CSS)

Token `--spacing-*` của dự án đụng namespace spacing scale của Tailwind v4 → mọi `max-w-sm/md/lg/xl` thành 8–32px, vỡ 18 chỗ. Đã đổi toàn cục sang `--space-*`.
**CẤM** định nghĩa `--spacing-*`, `--container-*`, hay namespace utility Tailwind trong `@theme`.

## Ba ADR hay bị quên nhất

1. **ADR-005** — đừng tự ý mở việc tối ưu. Không có số đo thì không sửa.
2. **ADR-007** — không ai chặn bạn push code hỏng. Verify là tự giác.
3. **ADR-011** — ảnh gốc lộ được là **quyết định**, không phải bug chưa sửa.

## Liên quan

[[bay-trien-khai]] · [[gallery]] · [[moodie-ai]] · [[trien-khai-va-verify]]
