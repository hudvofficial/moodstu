# AGENT_RULES.md — Luật vận hành (mood-studio)

> **NGUỒN CHÂN LÝ DUY NHẤT cho cách làm việc.** Đọc file này TRƯỚC khi làm bất cứ
> việc gì. Xung đột giữa file này và hướng dẫn riêng của tool → **file này thắng**.
> Chỉ user được sửa luật ở đây.
>
> **Chốt 2026-08-29 (ADR-018): pipeline 3-agent ĐÃ BÃI BỎ.** Chỉ còn **Claude Code**.
> Codex + Roo không còn chạy (bằng chứng: 40/40 commit gần nhất cùng một tác giả;
> 6/8 spec gần nhất ghi `Owner: claude (spec + code trực tiếp — đường lùi)`).
> Luật cũ về `locks`/worktree/handoff giữa agent → **bỏ**. Lịch sử: xem ADR-001/002/003.

---

## 1. Pipeline chuẩn (không được nhảy bước)

```
Bạn (user)
  ↓  yêu cầu
Claude  — phân tích + viết SPECIFICATION (agent/HANDOFFS/<task>.spec.md)
  ↓
Bạn duyệt specification  ← CỔNG NGƯỜI 1: không code khi chưa duyệt
  ↓
Claude  — code (đúng phạm vi spec, không mở rộng)
  ↓
Claude  — verify: build + lint file đổi + render/đo (§6). Ghi SỐ THẬT vào spec §Kết quả
  ↓
Bạn xem diff            ← CỔNG NGƯỜI 2: lưới an toàn DUY NHẤT còn lại
  ↓
push main               (= deploy thẳng Vercel, không có cổng tự động)
```

**Vì sao 2 cổng người:** pipeline cũ có Codex viết → Claude review chéo → Roo chạy.
Giờ Claude vừa viết vừa tự review vừa tự verify — **không còn mắt thứ hai**. Cộng với
`push main` = deploy và dev/prod chung 1 DB, giữa Claude và production **không còn gì**.
Hai cổng người là thứ thay thế.

---

## 2. Phạm vi ghi + luật cứng

| Vai | ĐƯỢC ghi | Ràng buộc |
|---|---|---|
| **Claude** | Toàn bộ: source ứng dụng, `agent/**`, `plans/**`, spec, config, git | Xem 5 luật dưới |

1. **Khóa kiến trúc (giữ nguyên từ ADR-004):** đổi data-flow / thêm thư viện / đổi state pattern / đổi schema / RLS / client-direct → **DỪNG**, ghi ADR vào `DECISIONS.md`, **user duyệt** rồi mới làm. Đây là ràng buộc **không** bị bãi bỏ cùng pipeline.
2. **Surgical:** mỗi dòng đổi phải trace thẳng về yêu cầu user. Không "tiện tay" sửa lân cận. Dead code không liên quan → **mention, đừng xóa**.
3. **Grep trước khi viết mới:** helper/util đã tồn tại thì tái dùng (`runOptimisticMutation`, `dashboardAccessFromArgs`, `sweepStaleE2EOrphans`…). Tự viết trùng = vi phạm LESSONS A2.
4. **File shared** (`lib/swr.ts`, `components/layout/bottom-nav.tsx`, `lib/server-cache-invalidation.ts`): chỉ **additive**, hoặc phải verify đa module.
5. **Không tự push khi user chưa xem diff** — trừ khi user nói rõ "cứ đẩy".

---

## 2b. Trước mọi hành động có tác dụng phụ — BẮT BUỘC

Trước khi chạy test / chạm DB / build / deploy, trả lời 2 câu bằng **tài liệu**, không bằng suy đoán:

1. **Việc này chạm vào gì?** (DB thật? prod? file chung? port?)
2. **Dự án đã quy định gì về nó?** → grep `agent/`, `.github/`, `vault/`, config liên quan.

> **Ca thật 28/08/2026:** chạy full suite e2e trên **prod build** trong khi
> `playwright.config.ts:84` chỉ định `npm run dev` → 41 fail vô nghĩa, và **rò 11 dòng
> seed vào DB thật**. `ci.yml` dòng 10 đã ghi sẵn *"e2e từng rò seed vào prod"* —
> file 40 dòng ở gốc repo, đọc sau khi đã phá. Lỗi không nằm ở thiếu năng lực mà ở
> **hành động trước khi hỏi nó chạm vào cái gì**.

⚠️ **E2E chạm DB PRODUCTION** (dev/prod chung 1 Supabase project):
- Chỉ chạy khi thật sự cần. Ưu tiên spec lẻ, tránh full suite.
- Chạy xong **luôn kiểm rác**: `node scripts/db-q.mjs "SELECT (SELECT count(*) FROM contracts WHERE contract_code LIKE 'E2E%') hd, (SELECT count(*) FROM employees WHERE department='E2E') ns"`
- Dọn bằng **`sweepStaleE2EOrphans`** (`tests/e2e/e2e-sweep.ts`) — nó xóa bảng con đúng thứ tự FK. **Không tự viết SQL xóa.** Ngưỡng `STALE_MS` = 30 phút (cố ý, tránh xóa nhầm run song song) → phải chờ rác đủ tuổi.

---

## 2c. Đối chứng hợp lệ (khi so trước/sau)

Sai lệch ở đây làm mọi kết luận vô giá trị. Bắt buộc:
- **Cùng cỡ mẫu**: full suite so full suite, không so "41 fail của 28 spec" với "3 fail của 3 spec".
- **Cùng môi trường**: cùng máy, cùng build, cùng server (dev hay prod build — theo đúng config).
- **Chỉ đổi MỘT biến** (`git stash` phần thay đổi để lấy baseline HEAD).
- **So danh sách, không so con số tổng**: `comm` hai danh sách spec fail — mới biết cái nào *chỉ* fail sau khi sửa.
- Số tích lũy dài hạn (vd `pg_stat_statements` 166 ngày) **không phải** số hiện tại.

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
spec → approved → implementing → verifying → merged
   blocked  (bất cứ lúc nào; ghi lý do + cần gì để gỡ)
```

`owner` luôn là **claude**, trừ khi chờ user (`approved` ở cổng duyệt spec, `merged` ở cổng xem diff).
Các status cũ `testing`/`review`/`fixing`/`ci` (buộc chuyển tay giữa 3 agent) đã **bỏ** theo ADR-018.

---

## 6. Verify — 2 tầng (KHÔNG có cổng chặn tự động)

> **Chốt 2026-07-15 (ADR-007): branch protection ruleset đã GỠ.** `main` nhận push thẳng như trước.
> Không còn cơ chế nào *cưỡng chế* chặn code hỏng vào `main`. Kỷ luật dưới đây là **tự giác**.

**Tầng 1 — GitHub Actions** (`.github/workflows/ci.yml`, job `quality`): lint **file thay đổi** (không lint full vì repo có ~27 lỗi tồn đọng — xem `CURRENT_STATE.md`) + `npm run build`. Chạy trên PR **và** trên push `main`. An toàn, không đụng DB.
- **Là chuông báo, KHÔNG phải cổng.** Nó báo đỏ *sau khi* code đã vào `main`. Đỏ → sửa ngay, đừng để đó.
- Lưới an toàn thật cho prod là **Vercel**: build hỏng → **không deploy**, prod giữ bản cũ. Nhưng Vercel chỉ bắt lỗi *build*, không bắt lỗi *hành vi*.

**Tầng 2 — verify local** (KHÔNG đưa lên CI vì nối thẳng Supabase + rủi ro e2e-seed-leak), chạy **trước khi push**:
- `npm run build` + `npx eslint <file đổi>` — **bắt buộc**. Lint đỏ → `git stash` rồi lint lại HEAD để tách nợ cũ (LESSONS A4).
- `npm run verify:<module>` của module bị đụng — **bắt buộc**.
- Đổi CSS/layout → render + screenshot chrome-devtools @768 + @1023 **trước** push.
- `npm run test:e2e:<x>` **chỉ khi thật sự cần** — xem cảnh báo DB prod ở §2b. Đúng môi trường `playwright.config.ts` chỉ định (`npm run dev`, port 3000), dừng server cũ trước để tránh khóa port.

**Thứ bắt được lỗi hành vi là MẮT NGƯỜI đọc diff** — không tự động, không thay thế được.
Task dogfood đầu tiên đã chứng minh: heart mất `fill-` → lint xanh, build xanh, chỉ review bắt được.
Trước đây mắt đó là Claude review code của Codex; **giờ Claude tự viết nên mắt đó là user**.
Vì vậy cổng "user xem diff" (§1) là bắt buộc, kể cả khi CI xanh.

---

## 7. Deploy

Merge vào `main` → Vercel auto-deploy. **KHÔNG** `npx vercel --prod` (CLI chưa auth). Xem `CLAUDE.md` → Ràng buộc dự án.
