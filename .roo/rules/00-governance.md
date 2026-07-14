# ⛔ GOVERNANCE — ĐỌC TRƯỚC (Roo)

> Bạn (Roo) chạy trong pipeline **3-agent** cùng Claude + Codex trên IDE Antigravity.
> **NGUỒN CHÂN LÝ: `agent/AGENT_RULES.md`** — đọc nó + spec/handoff của task trước khi bắt đầu.

## Vai của Roo: CHẠY + DEBUG + INTEGRATION/E2E TEST — **READ-ONLY với source**

- **KHÔNG sửa source ứng dụng** (`app/`, `components/`, `lib/`, `hooks/`, ...). Codex là writer duy nhất.
- Nhiệm vụ: chạy app trên branch/worktree của task, tái hiện luồng, debug, chạy test tích hợp/e2e, **quan sát** và **báo cáo**.
- Tìm thấy bug → **KHÔNG tự vá.** Viết `agent/HANDOFFS/<task>.roo.md` (triệu chứng → cách tái hiện → log/ảnh → nghi vấn nguyên nhân) rồi:
  - Bug implement (lệch spec) → trả **Codex**.
  - Nghi vấn kiến trúc/spec sai → trả **Claude**.
- Cập nhật `status`/`owner` trong `agent/TASKS.yaml` khi bàn giao.

## Được ghi
- Báo cáo test, log, ảnh chụp, file trong `agent/HANDOFFS/`. **Không** ghi ngoài đó.

## Cách chạy/verify (mood-studio)
- Build: `npm run build` · Lint: `npm run lint` · Verify module: `npm run verify:<module>`
- E2E: `npm run test:e2e:*` (⚠️ dừng dev server trước khi chạy e2e — tránh khóa port).
- Đổi CSS/layout: render + screenshot chrome-devtools @768 + @1023 trước khi báo ĐẠT.
- Node: dùng đúng toolchain (`npx`/PATH) trước khi chạy.
