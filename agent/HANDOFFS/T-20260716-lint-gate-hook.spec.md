# T-20260716-lint-gate-hook — Cổng máy chặn push khi lint đỏ + dọn nợ lint ma

**Owner:** Claude (đây là **config**, không phải source ứng dụng → không giao Codex)
**Status:** ⏳ CHỜ USER DUYỆT ĐÍCH DANH (xem mục "Cần duyệt" cuối file)

---

## Vì sao — sự cố 16/07 (thật, không phải giả định)

Mình chạy eslint trước khi push `b884a4a` → **exit 1** → **vẫn push** → **CI đỏ**. Tự bào chữa: *"lỗi có sẵn, không phải mình gây ra"*.

Lý luận đó **đúng về nguồn gốc, sai về trách nhiệm**: `.github/workflows/ci.yml` **CHỈ lint FILE THAY ĐỔI** (vì repo còn nợ lint) → **chạm file nào là nhận cổng CI của file đó**, kể cả nợ người khác để lại.

**Memory KHÔNG sửa được việc này.** Mình đã ghi memory rồi — nhưng memory là *ý chí*, mà ý chí vừa chứng minh là không đáng tin. Tài liệu Claude Code nói thẳng: hành vi tự động kiểu "trước khi X" **bắt buộc là hook**; memory/preference **không thực thi được**. → Cần **cổng máy**.

---

## Sự thật đã đo (không suy đoán)

| Điều | Bằng chứng |
|---|---|
| CI trigger | `on: push: branches:[main]` + `pull_request: branches:[main]` (`ci.yml:19-23`) |
| CI tính file (push event) | `BASE="HEAD~1"` → `git diff --name-only --diff-filter=ACMR "$BASE"...HEAD \| grep -E '\.(ts\|tsx\|js\|jsx\|mjs)$'` (`ci.yml:49-53`) |
| CI lint | `npx eslint $FILES`; rỗng thì `exit 0` |
| **`jq` trên máy này** | ❌ **KHÔNG CÓ** → cấm dùng jq trong hook |
| `node` | ✅ v24.16.0 |
| **`git diff --cached` lúc push** | ❌ **RỖNG** (code đã commit) → script mẫu kiểu `--cached` = **cổng giả, không bao giờ chặn** |
| `.claude/settings.json` | ❌ chưa tồn tại. Chỉ có `settings.local.json` (đang được git track) + `launch.json` |
| Nợ lint `npx eslint .` | 195 lỗi — **164 (84%) nằm ở `playwright-report/trace/*.js`** (bundle Playwright, gitignore, **không track**, CI không bao giờ thấy) |
| Nợ lint THẬT | **~31 lỗi / ~20 file** |
| `eslint.config.mjs` | dùng `globalIgnores([...])` (dòng 37-56), **thiếu** `playwright-report`, `test-results` |

---

## Task A — Dọn nợ lint ma (164/195 lỗi, rủi ro 0)

File `eslint.config.mjs`. Trong `globalIgnores([...])`, thêm **2 dòng ngay sau `"tmp/**",`** ([dòng 51](eslint.config.mjs#L51)):

```js
    "tmp/**",
    // Artifact của Playwright: bundle của THƯ VIỆN (trace viewer), không phải code mình.
    // Đã gitignore (.gitignore:15-16) + không git track → CI (checkout sạch) không bao giờ thấy.
    // Không ignore ở đây thì `npx eslint .` local phình 195 lỗi trong khi nợ THẬT chỉ ~31.
    "playwright-report/**",
    "test-results/**",
    ".openclaw/**",
```

**Giá trị thật KHÔNG phải con số** mà là: **đống nhiễu này tiếp tay cho ngụy biện.** Lint quăng 195 lỗi thì "thêm 1 lỗi có sẵn" trông như hạt cát → dễ bước qua. Dọn nhiễu → mỗi lỗi thật đều chói mắt.

**Verify A:** `npx eslint . 2>&1 | tail -3` → tổng lỗi **195 → ~31**; và `npx eslint .` **không còn** liệt kê file nào dưới `playwright-report/`.

---

## Task B — Script cổng (`.claude/hooks/pre-push-lint.sh`, file MỚI)

```sh
#!/bin/sh
# Chặn `git push` khi eslint đỏ trên ĐÚNG các file mà CI sẽ lint.
#
# Vì sao: .github/workflows/ci.yml CHỈ lint FILE THAY ĐỔI (repo còn nợ lint ~31 lỗi),
# nên chạm file nào là nhận cổng CI của file đó — kể cả nợ người khác để lại.
# 16/07: Claude thấy eslint exit 1 vẫn push ("lỗi có sẵn mà") → CI đỏ. Memory không
# chặn được ý chí; hook thì chặn được.
#
# KHÔNG dùng jq (máy này không có). KHÔNG dùng `git diff --cached` (lúc push đã commit
# → staged RỖNG → cổng giả không bao giờ chặn).

INPUT=$(cat)

# Không phải git push → cho qua ngay, không spawn tiến trình nào (~1ms).
case "$INPUT" in
  *"git push"*) ;;
  *) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# MIRROR CHÍNH XÁC ci.yml (push event dùng BASE="HEAD~1"). Rộng hơn CI → chặn nhầm →
# sinh ức chế và tìm cách né. Hẹp hơn CI → không đoán được CI. Phải đúng bằng.
FILES=$(git diff --name-only --diff-filter=ACMR HEAD~1...HEAD 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|mjs)$')

if [ -z "$FILES" ]; then
  exit 0
fi

OUT=$(npx eslint $FILES 2>&1)
if [ $? -ne 0 ]; then
  echo "🚫 CHẶN PUSH — eslint ĐỎ trên file mà CI sẽ lint (mirror ci.yml: HEAD~1...HEAD)." >&2
  echo "" >&2
  echo "$OUT" >&2
  echo "" >&2
  echo "Sửa cho xanh rồi push lại." >&2
  echo "KHÔNG được bỏ qua vì 'lỗi có sẵn, không phải mình gây ra': CI chỉ lint FILE THAY ĐỔI," >&2
  echo "nên nợ lint cũ của file này tính vào commit hiện tại. Động file nào = nhận cổng file đó." >&2
  echo "Nếu lỗi có sẵn KHÔNG nên refactor (vd set-state-in-effect ở form modal là CỐ Ý, xem" >&2
  echo "3961e926): dùng eslint-disable-next-line + comment nêu lý do — đừng refactor mù." >&2
  exit 2
fi

exit 0
```

**Vì sao exit 2:** theo tài liệu Claude Code, PreToolUse **exit 2 = chặn tool**, stderr được đưa cho Claude làm phản hồi. exit 0 = cho qua. Exit khác = lỗi không chặn (tool vẫn chạy).

**Vì sao đọc `stdin` bằng `case` chứ không parse JSON:** không có `jq`; spawn `node` cho **mọi** lệnh Bash (kể cả `ls`) là lãng phí. So khớp chuỗi thô trên JSON stdin đủ dùng: lệnh nào chứa `git push` mới làm việc nặng. Nhận nhầm (vd `echo "git push"`) chỉ tốn 1 lần lint thừa — vô hại.

---

## Task C — Đăng ký hook (`.claude/settings.json`, file MỚI)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "timeout": 120,
            "command": "sh \"$CLAUDE_PROJECT_DIR/.claude/hooks/pre-push-lint.sh\""
          }
        ]
      }
    ]
  }
}
```

**Vì sao `settings.json` (mới) chứ không nhét vào `settings.local.json`:** theo tài liệu, `settings.json` = **cấu hình dự án, commit cho cả team**; `.local.json` = cá nhân/máy. Đây là **kỷ luật của dự án** nên thuộc `settings.json`. `settings.local.json` hiện **không có** key `hooks` → **không xung đột** (local chỉ đè khi trùng key).
**KHÔNG động** `settings.local.json` (nó đang giữ `permissions`, ngoài phạm vi).

**Vì sao KHÔNG dùng trường `if: "Bash(git push *)"`:** tài liệu trả về **mâu thuẫn** về vị trí đặt (`if` trong hook object hay ngang `matcher`). Đặt sai → hook **im lặng không chạy** = cổng giả. Tự lọc trong script thì **chắc chắn chạy**, giá phải trả chỉ là ~1ms/lệnh Bash. Chọn cái chắc.

---

## Verify — BẮT BUỘC chứng minh nó CHẶN THẬT, không phải placebo

⚠️ Hook lỗi/không tìm thấy → **fail-open** (tool vẫn chạy). Nghĩa là **cổng hỏng trông y hệt cổng ngon**. Đây đúng cái bẫy vừa dính ở script `--cached`. **Không có 4 bước dưới thì coi như chưa xong.**

**V1 — lệnh thường phải cho qua (không chậm):**
```sh
echo '{"tool_name":"Bash","tool_input":{"command":"ls -la"}}' | sh .claude/hooks/pre-push-lint.sh; echo "exit=$?"
```
→ kỳ vọng `exit=0`, trả về tức thì.

**V2 — push khi lint XANH phải cho qua:**
```sh
echo '{"tool_name":"Bash","tool_input":{"command":"git push origin main"}}' | sh .claude/hooks/pre-push-lint.sh; echo "exit=$?"
```
→ kỳ vọng `exit=0` (HEAD hiện tại đang xanh).

**V3 — push khi lint ĐỎ phải CHẶN** (bằng chứng cốt lõi):
```sh
printf 'export const x = 1;\nexport function Bad() { if (x) { const [a] = require("react").useState(0); return a; } }\n' > lint-gate-probe.tsx
git add lint-gate-probe.tsx && git commit -q -m "temp: probe lint gate (sẽ xoá ngay)"
echo '{"tool_name":"Bash","tool_input":{"command":"git push origin main"}}' | sh .claude/hooks/pre-push-lint.sh; echo "exit=$?"
```
→ **kỳ vọng `exit=2`** + in ra lỗi eslint. Nếu ra `0` → **cổng giả, DỪNG, sửa script**.

**Dọn ngay sau V3 (commit này TUYỆT ĐỐI không được push):**
```sh
git reset --hard HEAD~1 && rm -f lint-gate-probe.tsx && git log --oneline -1
```
→ xác nhận HEAD quay lại commit trước, `git status` sạch.

**V4 — end-to-end thật, an toàn:** lặp lại commit probe của V3, rồi gọi qua **Bash tool thật**: `git push --dry-run origin main`.
→ kỳ vọng: **harness CHẶN tool call**, hiện thông điệp của hook.
→ **An toàn:** kể cả hook không chặn thì `--dry-run` **không đẩy gì lên remote**. Xong thì `git reset --hard HEAD~1` như trên.
*(Không bao giờ test bằng `git push` thật: hook hỏng = đẩy commit rác lên main = Vercel deploy thẳng.)*

---

## Rủi ro + đường lùi

| Rủi ro | Xử lý |
|---|---|
| Hook chặn nhầm (false positive) khiến việc tắc | Gỡ: xoá key `hooks` trong `.claude/settings.json`. Ảnh hưởng 0 tới app/CI. |
| Hook fail-open âm thầm | Chính V3/V4 để bắt. Không pass V3 = không nhận là xong. |
| Chậm mọi lệnh Bash | Lọc `case` trước, không spawn gì cho lệnh thường (V1 đo). |
| `$CLAUDE_PROJECT_DIR` không tồn tại | `${CLAUDE_PROJECT_DIR:-.}` fallback về cwd (hook chạy trong cwd dự án). |
| Task A ignore nhầm code thật | 2 thư mục này **không git track** (`git ls-files` rỗng) → không thể chứa code mình. |

**KHÔNG đụng:** `settings.local.json`, `ci.yml`, source ứng dụng, 31 lỗi lint thật.

---

## Cố ý KHÔNG làm (lớp 2 — nợ lint thật ~31 lỗi)

**Không mở đợt "dọn 31 lỗi".** Lý do có bằng chứng: ~12 lỗi `set-state-in-effect` nằm ở loạt form modal (customer/lead/dress/receipt/lab/credit-card, mỗi file đúng 1 lỗi) — **cùng nguồn** với `gallery-filter-modal`: commit `3961e926` (audit 8 fix, có cross-review) **cố ý** đổi form state sang `useEffect` *"instead of prevReset"* để diệt bug reset-theo-realtime. **Fix lint mù ở đây = tái sinh đúng bug họ vừa diệt.**
→ Để **CI ratchet** tự dọn: ai chạm file nào thì trả nợ file đó, có ngữ cảnh mới sửa đúng. Cơ chế hiện tại **không hỏng**.

---

## Cần user duyệt ĐÍCH DANH

Bộ phân loại quyền đã **chặn** mình sửa config của Claude Code khi bạn mới duyệt chung chung — **đúng**. Để triển khai, bạn cần nói rõ đồng ý **tạo `.claude/settings.json` chứa PreToolUse hook + tạo `.claude/hooks/pre-push-lint.sh`**.

Tóm tắt thứ sẽ đổi:
1. `eslint.config.mjs` — +2 dòng ignore *(không phải config Claude)*
2. `.claude/hooks/pre-push-lint.sh` — **file mới**
3. `.claude/settings.json` — **file mới**, chứa PreToolUse hook chặn `git push` khi lint đỏ
