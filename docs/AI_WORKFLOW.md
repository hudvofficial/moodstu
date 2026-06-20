# AI_WORKFLOW.md — Quy trình làm việc cho AI Agent trên Mood Studio

## Rule cốt lõi
Hermes (hoặc bất kỳ AI lead agent nào) **phải** làm việc theo mô hình:

```
Lead Agent (Hermes) → spawn Sub-agents chuyên biệt → tổng hợp kết quả → báo anh
```

Lead agent **không tự code, không tự fix, không tự retry vòng lặp**.  
Lead agent điều phối, đọc kết quả, quyết định bước tiếp theo.

---

## Trình tự chuẩn cho mỗi feature/fix

| # | Bước | Sub-agent | Lý do làm trước |
|---|------|-----------|-----------------|
| 1 | **Dọn working tree** — review file modified + xử lý file untracked/rác | cleaner | Không thể QA/commit/rollout khi code dirty |
| 2 | **Lint + typecheck + build** trên code hiện tại | reviewer | Phải biết code lỗi syntax/type không trước khi chạy E2E |
| 3 | **Chạy E2E** + chụp QA screenshot các viewport cần thiết | qa | Đây là "done criteria" của plan |
| 4 | **Phân tích kết quả QA** — nếu fail/visual lỗi → list issues | reviewer | Tách bước phân tích khỏi bước test để objective |
| 5 | **Fix các issue** (chỉ khi có evidence từ bước 4) | coder | Không fix mù, không fix khi chưa có QA |

---

## Rules bổ sung

### Về báo cáo
- Context dài → **xuất file `.md`**, không dump vào chat
- Mỗi blocker → **1 file `.md` ngắn gọn** mô tả triệu chứng + nơi xảy ra + đề xuất fix
- Không giải thích dài trong chat khi anh không hỏi

### Về retry
- Gặp blocker → **dừng**, xuất `.md`, chờ fix
- Không tự retry cùng một lệnh lỗi quá 2 lần
- Không tự suy diễn thêm khi đã có đủ evidence

### Về commit/push
- **Không push** nếu chưa được anh duyệt
- Chỉ commit scoped files liên quan đến task
- Không commit file rác, untracked doc, temp screenshot

### Về QA
- Phải có screenshot thật + metrics thật trước khi kết luận "UI ok"
- Không kết luận từ code review đơn thuần
- Playwright phải login thành công, vào đúng route, chụp đúng viewport

---

## File liên quan
- `docs/HERMES_CONTEXT.md` — SSOT kiến trúc + conventions
- `docs/plans/` — các plan feature
- `docs/reports/` — audit reports
- `AGENTS.md` — Vercel/React best practices (không phải workflow rule)
