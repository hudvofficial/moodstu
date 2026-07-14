# HANDOFF — <task-id> — <from> → <to>

> Copy file này thành `<task-id>.<step>.md` mỗi lần chuyển bước (vd `T-20260714-ppr-dresses.spec.md`,
> `.codex.md`, `.roo.md`, `.review.md`). Chuyển bước = ghi file này + cập nhật `TASKS.yaml`.

- **Task:** <id> — <title>
- **Từ → Đến:** <claude|codex|roo> → <codex|roo|claude|user>
- **Branch / worktree:** <codex/slug> / <.worktrees/slug>
- **Locks (vùng độc quyền):** <danh sách file/dir — phải khớp TASKS.yaml>
- **Ngày:** <YYYY-MM-DD>

## 1. Mục tiêu bước này
<1–3 câu: bước này cần đạt gì>

## 2. Đã làm / hiện trạng
<Claude: tóm tắt spec. Codex: liệt kê file đã đổi + tại sao. Roo: kết quả chạy/test.>

## 3. Files touched
<đường dẫn cụ thể — trace về locks; nếu chạm ngoài locks → DỪNG, đây là vi phạm>

## 4. Bước tiếp cần làm (cho người nhận)
<yêu cầu rõ, không placeholder. Nếu là spec: acceptance criteria đo được.>

## 5. Cách verify
<lệnh cụ thể: npm run build / verify:<module> / test:e2e:<x> / render chrome-devtools @768+@1023>

## 6. Ràng buộc / cạm bẫy phải giữ
<vd: finance giữ revalidatePath; không patch số server-computed; không đổi kiến trúc>

## 7. Câu hỏi mở / rủi ro
<chỗ chưa chắc → nêu tên, đừng đoán. Nếu chạm kiến trúc → trả Claude mở ADR.>
