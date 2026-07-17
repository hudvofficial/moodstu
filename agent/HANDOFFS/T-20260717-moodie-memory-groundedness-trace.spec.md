# T-20260717-moodie-memory-groundedness-trace — Đo memory retrieved có thực sự được model dùng không

**Owner:** Claude (fallback `coder` — Codex CLI lỗi hạ tầng lần 2, xem TASKS.yaml) · **Spec:** Claude · **Status:** MERGED (áp dụng + verify, xem `agent/TASKS.yaml` mục `done`)

**Locks (7 file — 2 file mới, 5 file sửa):**
- MỚI: `lib/moodie/memory-grounding.ts`
- MỚI: `tests/unit/moodie-memory-grounding.test.ts`
- SỬA: `lib/moodie/memory-store.ts`
- SỬA: `lib/moodie/context-planner.ts`
- SỬA: `lib/moodie/trace.ts`
- SỬA: `lib/moodie/engine.ts`
- SỬA: `types/moodie.ts` (chỉ thêm 1 field, không đổi field khác)

**KHÔNG đổi hành vi runtime của Moodie (không đổi câu trả lời, không đổi UI, không thêm LLM call, không đổi tốc độ).** Đây thuần túy là đo lường ghi vào `trace` — additive.

---

## Bối cảnh — đã xác minh bằng đọc code, không suy đoán

Research (deep-research 16/07) + đọc code thật cho thấy: `memory_context_used` trong trace hiện tại ([`context-planner.ts:78`](lib/moodie/context-planner.ts#L78)) chỉ là `Boolean(memory)` — biết "có nạp context vào prompt" chứ không biết **model có thực sự dùng nó trong câu trả lời hay bỏ qua**. Paper GroundEval (research 16/07) chứng minh: hỏi 1 LLM khác "câu trả lời có dùng memory không" không đáng tin (LLM-judge chấm 0.85-0.90 cho câu trả lời mà trace xác định agent chưa hề dùng bằng chứng). Giải pháp đúng: so sánh **xác định (deterministic)** nội dung memory đã nạp với nội dung câu trả lời cuối, không hỏi LLM.

**Đã kiểm tra trước khi thiết kế (tránh phá vỡ chỗ khác):**
- `loadMoodieMemoryContext` ([`memory-store.ts:32`](lib/moodie/memory-store.ts#L32)) chỉ có **1 call site duy nhất**: [`context-planner.ts:46`](lib/moodie/context-planner.ts#L46) — an toàn để đổi return type.
- `contextPacket.memory` (string) chỉ được đọc ở **2 chỗ**: [`engine.ts:191`](lib/moodie/engine.ts#L191) và [`context-planner.ts:96`](lib/moodie/context-planner.ts#L96) (`buildMoodieVoiceMemoryPacket`) — cả 2 vẫn hoạt động nguyên vẹn vì field `memory: string` giữ nguyên, chỉ **thêm** field mới `memoryRecords`.
- `types/moodie.ts` có khai báo `MoodieTrace` **riêng, trùng lặp** với `lib/moodie/trace.ts` (2 type độc lập cùng tên, đã lệch sẵn — bản `types/moodie.ts` thiếu `working_memory_used` mà bản kia có). Đây là drift có sẵn từ trước, **KHÔNG thuộc phạm vi task này để sửa** — chỉ thêm field mới vào cả 2 theo đúng pattern trùng lặp đã có, không hợp nhất 2 type.

---

## Task 1 — File mới `lib/moodie/memory-grounding.ts`

Tạo file với đúng nội dung sau:

```ts
function normalizeMoodieGroundingText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isMoodieMemoryGrounded(memoryContent: string, finalAnswer: string) {
  const memoryTokens = normalizeMoodieGroundingText(memoryContent).split(" ").filter((token) => token.length > 2);
  if (memoryTokens.length === 0) return false;
  const answerTokens = new Set(normalizeMoodieGroundingText(finalAnswer).split(" ").filter((token) => token.length > 2));
  const matched = memoryTokens.filter((token) => answerTokens.has(token)).length;
  return matched / memoryTokens.length >= 0.5;
}

export function summarizeMoodieMemoryGrounding(
  records: Array<{ id: string; content: string }>,
  finalAnswer: string,
) {
  if (records.length === 0) return { retrieved_count: 0, grounded_count: 0 };
  const ungroundedIds: string[] = [];
  let groundedCount = 0;
  for (const record of records) {
    if (isMoodieMemoryGrounded(record.content, finalAnswer)) {
      groundedCount += 1;
    } else {
      ungroundedIds.push(record.id);
    }
  }
  return {
    retrieved_count: records.length,
    grounded_count: groundedCount,
    ungrounded_ids: ungroundedIds.length > 0 ? ungroundedIds : undefined,
  };
}
```

**Vì sao ngưỡng 0.5 và filter length>2:** giống hệt pattern normalize đã có sẵn trong repo ([`memory-store.ts:117`](lib/moodie/memory-store.ts#L117): `normalize` + filter `token.length > 2`) — tái dùng convention, không phát minh mới. Ngưỡng 0.5 là lựa chọn khởi điểm hợp lý cho v1 đo lường (bắt được trích dẫn gần-nguyên-văn, bỏ lỡ paraphrase nặng) — chấp nhận được vì đây CHỈ là thêm số đo, không chặn/đổi hành vi gì; tinh chỉnh ngưỡng sau khi có dữ liệu thật, không phải bây giờ.

## Task 2 — Test mới `tests/unit/moodie-memory-grounding.test.ts`

```ts
import { describe, expect, it } from "@jest/globals";
import { isMoodieMemoryGrounded, summarizeMoodieMemoryGrounding } from "@/lib/moodie/memory-grounding";

describe("Moodie memory grounding", () => {
  it("marks a memory grounded when its significant words appear in the answer", () => {
    expect(isMoodieMemoryGrounded("Khách hàng thích liên hệ qua Zalo", "Mình sẽ liên hệ qua Zalo cho bạn nhé")).toBe(true);
  });

  it("marks a memory ungrounded when the answer shares no significant words", () => {
    expect(isMoodieMemoryGrounded("Khách hàng thích liên hệ qua Zalo", "Hôm nay trời đẹp quá")).toBe(false);
  });

  it("treats memory content with no significant tokens as ungrounded", () => {
    expect(isMoodieMemoryGrounded("ok", "ok là được rồi")).toBe(false);
  });

  it("summarizes an empty record list without dividing by zero", () => {
    expect(summarizeMoodieMemoryGrounding([], "bất kỳ câu trả lời nào")).toEqual({ retrieved_count: 0, grounded_count: 0 });
  });

  it("counts grounded vs ungrounded and lists ungrounded ids", () => {
    const records = [
      { id: "a", content: "Khách hàng thích liên hệ qua Zalo" },
      { id: "b", content: "Ngân sách dự kiến năm trăm triệu đồng" },
    ];
    const result = summarizeMoodieMemoryGrounding(records, "Mình sẽ liên hệ qua Zalo cho bạn nhé");
    expect(result.retrieved_count).toBe(2);
    expect(result.grounded_count).toBe(1);
    expect(result.ungrounded_ids).toEqual(["b"]);
  });
});
```

## Task 3 — `lib/moodie/memory-store.ts`: đổi return type của `loadMoodieMemoryContext`

Hàm hiện trả `Promise<string>` (ngầm định qua return type). Đổi thành `Promise<{ context: string; records: Array<{ id: string; content: string }> }>`. Có **ĐÚNG 5 điểm return** phải sửa đồng bộ — thiếu 1 điểm là lỗi type:

**3a.** Dòng khai báo hàm + early return (dòng 32-38 hiện tại):
```ts
export async function loadMoodieMemoryContext(params: {
  supabase: SupabaseClient<Database>;
  userId?: string;
  conversationId?: string;
  prompt?: string;
}) {
  if (!params.userId) return "";
```
→ đổi thành:
```ts
export async function loadMoodieMemoryContext(params: {
  supabase: SupabaseClient<Database>;
  userId?: string;
  conversationId?: string;
  prompt?: string;
}): Promise<{ context: string; records: Array<{ id: string; content: string }> }> {
  if (!params.userId) return { context: "", records: [] };
```

**3b.** Nhánh RPC thành công (dòng 51-64 hiện tại, bên trong `if (!matchError) {`):
```ts
    if (!matchError) {
      const ranked = (matched || []).map((memory) => ({
        id: memory.id,
        scope: memory.scope as "user" | "studio" | "conversation",
        memoryType: memory.memory_type as MoodieMemoryType,
        content: memory.content,
      }));
      if (ranked.length > 0) {
        const usedAt = new Date().toISOString();
        await Promise.all((matched || []).map((memory) => params.supabase.from("moodie_memories")
          .update({ last_used_at: usedAt, use_count: memory.use_count + 1 })).eq("id", memory.id))).catch(() => {});
      }
      return buildMoodieMemoryContext(ranked);
    }
```
→ CHỈ đổi dòng return cuối cùng (giữ nguyên mọi dòng khác y hệt):
```ts
      return { context: buildMoodieMemoryContext(ranked), records: ranked.map((memory) => ({ id: memory.id, content: memory.content })) };
    }
```

**3c.** Early return khi query lỗi (dòng 99 hiện tại):
```ts
    if (userResult.error || studioResult.error || conversationResult.error) return "";
```
→
```ts
    if (userResult.error || studioResult.error || conversationResult.error) return { context: "", records: [] };
```

**3d.** Return cuối nhánh fallback thủ công (dòng 139 hiện tại, SAU khối `if (ranked.length > 0) { ... }` update use_count/last_used_at — đây là dòng độc lập ở cuối hàm, KHÔNG nằm trong khối `if` nào, phân biệt với 3b ở trên bằng thụt lề 4-space thay vì 6-space):
```ts
    return buildMoodieMemoryContext(ranked);
  } catch {
    return "";
  }
}
```
→
```ts
    return { context: buildMoodieMemoryContext(ranked), records: ranked.map((memory) => ({ id: memory.id, content: memory.content })) };
  } catch {
    return { context: "", records: [] };
  }
}
```

**Không đổi bất kỳ dòng nào khác trong file này** (logic RPC, logic fallback thủ công, `createPendingMoodieMemory` giữ nguyên 100%).

## Task 4 — `lib/moodie/context-planner.ts`

**4a.** Thêm field vào type `MoodieContextPacket` (dòng 13-32 hiện tại) — thêm đúng 1 dòng sau `memory: string;`:
```ts
export type MoodieContextPacket = {
  identity: string;
  conversationSummary: string;
  memory: string;
  memoryRecords: Array<{ id: string; content: string }>;
  workingMemory: string;
  retrieval: { summary: string; hasContext: boolean };
  trace: {
```
(phần còn lại của type giữ nguyên y hệt)

**4b.** Đổi destructure + return (dòng 44-91 hiện tại):
```ts
  const identity = buildMoodieAuthenticatedUserPrompt(params.userContext);
  const conversationSummary = buildMoodieConversationSummaryContext(params.conversationSummary);
  const [memory, workingMemory, retrieval, braveConfig, browserConfig] = await Promise.all([
```
→
```ts
  const identity = buildMoodieAuthenticatedUserPrompt(params.userContext);
  const conversationSummary = buildMoodieConversationSummaryContext(params.conversationSummary);
  const [memoryResult, workingMemory, retrieval, braveConfig, browserConfig] = await Promise.all([
```
(phần bên trong mảng `Promise.all([...])` giữ nguyên y hệt — không đổi gì trong đó)

Rồi trong khối `return {` cuối hàm:
```ts
  return {
    identity,
    conversationSummary,
    memory,
    workingMemory,
    retrieval,
    trace: {
      identity_context_used: Boolean(identity),
      conversation_summary_used: Boolean(conversationSummary),
      memory_context_used: Boolean(memory),
```
→
```ts
  return {
    identity,
    conversationSummary,
    memory: memoryResult.context,
    memoryRecords: memoryResult.records,
    workingMemory,
    retrieval,
    trace: {
      identity_context_used: Boolean(identity),
      conversation_summary_used: Boolean(conversationSummary),
      memory_context_used: Boolean(memoryResult.context),
```
(phần còn lại của `trace: {...}` và hàm `buildMoodieVoiceMemoryPacket` bên dưới giữ nguyên y hệt — `packet.memory` vẫn hoạt động vì field `memory` vẫn là string)

## Task 5 — `lib/moodie/trace.ts`: thêm field `memory_grounding`

Thêm vào type `MoodieTrace` (sau dòng `tools: MoodieToolTrace[];`, trước `error?: string;`):
```ts
  tools: MoodieToolTrace[];
  memory_grounding?: { retrieved_count: number; grounded_count: number; ungrounded_ids?: string[] };
  error?: string;
};
```
(chỉ thêm đúng 1 dòng vào giữa — không đổi gì khác trong file, kể cả `createMoodieTrace`/`attachMoodieTrace`)

## Task 6 — `types/moodie.ts`: thêm field tương ứng (type riêng, KHÔNG hợp nhất với trace.ts)

Thêm vào `export interface MoodieTrace {` (sau dòng `tools: MoodieToolTrace[];`, trước `error?: string;`):
```ts
  tools: MoodieToolTrace[];
  memory_grounding?: { retrieved_count: number; grounded_count: number; ungrounded_ids?: string[] };
  error?: string;
}
```
**KHÔNG** thêm `working_memory_used` hay bất kỳ field nào khác đang lệch giữa 2 type — đó là drift có sẵn, ngoài phạm vi task này (chỉ mention, không sửa).

## Task 7 — `lib/moodie/engine.ts`: tính + gắn grounding vào trace lúc trả câu trả lời cuối

**7a.** Thêm import (đặt ngay sau dòng `import { attachMoodieTrace, createMoodieTrace } from "@/lib/moodie/trace";`):
```ts
import { attachMoodieTrace, createMoodieTrace } from "@/lib/moodie/trace";
import { summarizeMoodieMemoryGrounding } from "@/lib/moodie/memory-grounding";
```

**7b.** Trong nhánh trả kết quả cuối cùng (không còn tool call, verification đã pass) — tìm đúng khối này (nguyên văn, để định vị chính xác — đây là chỗ DUY NHẤT trong file có đoạn `tool_call_count: traceState.trace.tools.length,` theo sau bởi `provider_latency_ms` và `first_token_latency_ms`):

```ts
        }, traceState.finish({
          tool_call_count: traceState.trace.tools.length,
          provider_latency_ms: providerLatencyMs,
          first_token_latency_ms: firstTokenLatencyMs,
        })),
        };
      }
```

→ thêm đúng 1 dòng vào bên trong `traceState.finish({...})`:

```ts
        }, traceState.finish({
          tool_call_count: traceState.trace.tools.length,
          provider_latency_ms: providerLatencyMs,
          first_token_latency_ms: firstTokenLatencyMs,
          memory_grounding: summarizeMoodieMemoryGrounding(contextPacket.memoryRecords, finalContent),
        })),
        };
      }
```

**Không sửa** nhánh `verification.ok === false` (dòng `continue;`), không sửa vòng lặp tool-call, không sửa workflow-shortcut (dòng ~131-146), không sửa session-identity fast-path, không sửa core_fallback path trong `runMoodieEngine` — những nhánh đó không đi qua `contextPacket.memoryRecords` theo đúng cách này hoặc không phải điểm trả lời cuối cùng có dùng long-term memory.

---

## Verify (Codex/coder tự chạy trước khi báo xong)

1. `npx jest tests/unit/moodie-memory-grounding.test.ts` — **5/5 test pass**.
2. `npx tsc --noEmit` (hoặc `npm run build` nếu tsc riêng không có sẵn) — **0 lỗi type** (đặc biệt kiểm 5 điểm return của `memory-store.ts` và 2 chỗ dùng `contextPacket.memory`/`memoryRecords`).
3. `npx eslint lib/moodie/memory-grounding.ts lib/moodie/memory-store.ts lib/moodie/context-planner.ts lib/moodie/trace.ts lib/moodie/engine.ts types/moodie.ts tests/unit/moodie-memory-grounding.test.ts` — **0 lỗi, 0 warning** trên các file vừa đổi.
4. Báo diff đầy đủ. **KHÔNG commit, KHÔNG push.**

## Verify sau (Claude)

1. Đọc lại toàn bộ diff so với spec — xác nhận đúng 7 task, không thừa/thiếu.
2. Chạy `npm run build` toàn repo (build thật, không chỉ tsc) để chắc chắn không vỡ nơi khác dùng `MoodieContextPacket`/`MoodieTrace`.
3. Verify hành vi thật: gửi 1 tin nhắn Moodie thật có long-term memory active (dùng chính user `bc372706-e3b7-480a-b391-c30145276d40` đã dùng ở Task A) qua UI hoặc gọi `sendMoodieMessage` trực tiếp — kiểm `ai_messages.metadata.trace.memory_grounding` xuất hiện đúng dạng `{retrieved_count, grounded_count, ...}` bằng `scripts/db-q.mjs`.
4. Commit + push `main` sau khi build xanh + verify hành vi đạt.
