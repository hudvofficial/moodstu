# AGENT_RULES.md — Luật vận hành 3-agent (mood-studio)

> **NGUỒN CHÂN LÝ DUY NHẤT cho phối hợp đa-agent.** Mọi agent (Claude / Codex / Roo)
> đọc file này TRƯỚC khi làm bất cứ việc gì. Xung đột giữa file này và hướng dẫn
> riêng của từng tool → **file này thắng**. Chỉ user được sửa luật ở đây.

---

## 1. Pipeline chuẩn (không được nhảy bước)

```
Bạn (user)
  ↓  yêu cầu
Claude  — phân tích + viết SPECIFICATION (agent/HANDOFFS/<task>.spec.md)
  ↓
Bạn duyệt specification  ← CỔNG NGƯỜI: không code khi chưa duyệt
  ↓
Codex   — triển khai trên branch/worktree RIÊNG (chỉ trong lock của task)
  ↓
Roo     — chạy app + debug + integration test (READ-ONLY, không sửa source)
  ↓
Claude  — review diff SO VỚI spec (không so ý thích cá nhân)
  ↓
Codex   — sửa theo review
  ↓
CI gate — bộ verify local + build phải XANH (xem §6)
  ↓
Merge   — vào main (Vercel auto-deploy)
```

Vòng lặp `Claude review ↔ Codex fix` lặp tới khi **ĐẠT**. Roo test lại sau mỗi lần Codex sửa nếu review chạm runtime.

---

## 2. Phân vai + PHẠM VI GHI (quan trọng nhất)

| Agent | Vai | ĐƯỢC ghi | CẤM ghi |
|---|---|---|---|
| **Claude** | Phân tích, spec, review, điều phối, cập nhật docs | `agent/**`, `plans/**`, spec, `CLAUDE.md`/config, git | **KHÔNG** ghi source ứng dụng (`app/`, `components/`, `lib/`, `hooks/`) trong luồng 3-tool |
| **Codex** | Người thực thi — **WRITER DUY NHẤT của source** | source ứng dụng, **chỉ trong `locks` của task**, **chỉ trong worktree/branch của task** | file ngoài `locks`; `agent/**` governance; kiến trúc mới |
| **Roo** | Chạy app, debug, integration/e2e test, quan sát | báo cáo test, log, HANDOFF trả lại | **KHÔNG sửa source** — tìm bug thì viết HANDOFF, không tự vá |

**Fallback (chỉ Claude, không có Codex/Roo):** Claude được dùng subagent `.claude/agents/coder.md` + `reviewer.md` để tự code+review. Đây là ĐƯỜNG LÙI, không phải mặc định. Khi có Codex/Roo → theo pipeline §1.

---

## 3. Luật cứng chống va chạm

1. **Single-writer / task:** mỗi task có đúng **1 `owner`** tại một thời điểm (xem `TASKS.yaml`). Chỉ `owner` được ghi trong vùng `locks` của task đó.
2. **Lock không chồng nhau:** hai task chưa `merged` **KHÔNG được** có `locks` giao nhau (cùng file/thư mục/module). Claude kiểm điều này khi tạo task; giao nhau → tách task hoặc xếp hàng.
3. **Khóa kiến trúc:** **CHỈ Claude** đề xuất kiến trúc, và mọi quyết định kiến trúc phải ghi vào `DECISIONS.md` + user duyệt. Codex/Roo **CẤM** tự đổi kiến trúc (đổi data-flow, thêm lib, đổi pattern state, đổi schema). Gặp chỗ cần đổi kiến trúc → **DỪNG**, viết HANDOFF trả Claude.
4. **Worktree cô lập:** Codex làm trong worktree/branch riêng của task (`.worktrees/<task>` hoặc `codex/<task>`). Không đụng cây làm việc chính khi task chưa merge.
5. **Handoff bắt buộc:** mỗi lần chuyển bước trong pipeline = **(a)** ghi 1 file trong `HANDOFFS/` + **(b)** cập nhật `status` + `owner` trong `TASKS.yaml`. Không "chuyển miệng".
6. **Không nhảy cổng người:** Codex không bắt đầu khi spec chưa được user duyệt (`status: approved`).
7. **File shared** (`lib/swr.ts`, `components/layout/bottom-nav.tsx`, `lib/server-cache-invalidation.ts`): chỉ **additive** hoặc task phải khai báo `verify: multi-module`.

---

## 4. Bộ tài liệu chung (đọc theo nhu cầu)

| File | Ai cập nhật | Dùng để |
|---|---|---|
| `PROJECT_BRIEF.md` | Claude (hiếm) | Biết mood-studio là gì, mục tiêu, stack |
| `ARCHITECTURE.md` | Claude (khi có DECISION) | Bất biến kiến trúc — thứ CẤM đổi khi chưa duyệt |
| `CURRENT_STATE.md` | Claude (mỗi phiên) | Trạng thái thật hiện tại (đã ship gì, đang dở gì) |
| `TASKS.yaml` | Agent đang `owner` | Hàng đợi việc + bảng khóa/quyền sở hữu |
| `DECISIONS.md` | Claude (append-only) | Nhật ký quyết định kiến trúc (ADR) |
| `AGENT_RULES.md` | User | Chính file này |
| `HANDOFFS/` | Agent bàn giao | Gậy tiếp sức giữa các bước |

---

## 5. Vòng đời status (TASKS.yaml)

```
spec → approved → implementing → testing → review → fixing → ci → merged
                                     ↑__________________|   (lặp review↔fix)
   blocked  (bất cứ lúc nào; ghi lý do + agent cần gỡ)
```

`owner` theo status: `spec/review`=Claude · `implementing/fixing`=Codex · `testing`=Roo · `ci/merged`=Claude(hoặc user).

---

## 6. CI gate — 2 tầng

**Tầng 1 — GitHub Actions** (`.github/workflows/ci.yml`, job `quality`): tự chạy `npm run lint` + `npm run build` trên PR/push `main`. An toàn, không đụng DB.
- Chỉ **CHẶN merge thật** khi: (a) bật branch protection cho `main` yêu cầu check `quality`, **và** (b) làm việc qua **PR** (Codex push branch → PR → xanh → merge). 2 bước này do **user** làm 1 lần (xem comment đầu file workflow). Nếu còn push thẳng `main` → CI chỉ báo SAU, như Vercel.

**Tầng 2 — verify local** (KHÔNG đưa lên CI vì nối thẳng Supabase + rủi ro e2e-seed-leak), chạy trước khi merge:
- `npm run verify:<module>` của module bị đụng — **bắt buộc** (Claude/Roo chạy)
- `npm run test:e2e:<x>` nếu task chạm runtime — Roo chạy (dừng dev server trước, tránh khóa port)
- Đổi CSS/layout → render + screenshot chrome-devtools **trước** merge

Chưa xanh cả 2 tầng → không `merged`. Vercel build (sau push) chỉ là lưới build-error, **không thay** gate này.

---

## 7. Deploy

Merge vào `main` → Vercel auto-deploy. **KHÔNG** `npx vercel --prod` (CLI chưa auth). Xem `CLAUDE.md` → Ràng buộc dự án.
