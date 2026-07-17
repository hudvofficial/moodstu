# T-20260717-moodie-memory-recency-last-used — Recency điểm memory dùng `last_used_at`, không phải `updated_at`

**Owner:** Claude (fallback coder-subagent — Codex CLI lỗi hạ tầng 404, xem TASKS.yaml) · **Spec:** Claude · **Status:** MERGED (áp dụng prod + verify 3 lớp, xem `agent/TASKS.yaml` mục `done`)
**Locks (1 file mới, không sửa file cũ):** `supabase/migrations/20260717000000_moodie_memory_recency_last_used.sql`

**KHÔNG đụng app code (TypeScript), KHÔNG đổi schema/cột, KHÔNG đổi chữ ký RPC, KHÔNG thêm trọng số mới.**

---

## Bối cảnh — đã xác minh bằng đọc code, không suy đoán

Research (deep-research 16/07, xem `agent/HANDOFFS/` note trong chat — không có file riêng) đối chiếu Moodie với Generative Agents (Park et al., arXiv 2304.03442): công thức retrieval chuẩn = **recency + importance + relevance**, trong đó *recency* nghĩa là "thời gian kể từ lần **truy hồi cuối**" (last accessed), không phải "thời gian kể từ lần **sửa cuối**".

Đọc RPC hiện tại — [`supabase/migrations/20260712100000_moodie_memory_hybrid_retrieval.sql:44-57`](supabase/migrations/20260712100000_moodie_memory_hybrid_retrieval.sql#L44) — cho thấy Moodie **đã có sẵn** công thức recency+importance+relevance (không phải chưa làm), nhưng số hạng recency dùng sai tín hiệu:

```sql
+ greatest(0, 1 - extract(epoch FROM (now() - m.updated_at)) / 15552000.0) * 0.08
```

`m.updated_at` = lần **sửa** bản ghi cuối (chỉ đổi khi memory bị edit/consolidate). Cột `last_used_at` (đã có trong schema từ [`20260711180000_moodie_companion_memory.sql:20`](supabase/migrations/20260711180000_moodie_companion_memory.sql#L20)) mới đúng là "lần truy hồi cuối" — được cập nhật mỗi khi memory được nạp vào context, tại [`lib/moodie/memory-store.ts:60-61`](lib/moodie/memory-store.ts#L60):

```ts
await Promise.all((matched || []).map((memory) => params.supabase.from("moodie_memories")
  .update({ last_used_at: usedAt, use_count: memory.use_count + 1 })).eq("id", memory.id))).catch(() => {});
```

**Hậu quả của bug:** một memory được model dùng liên tục (last_used_at luôn mới) không được "củng cố" thứ hạng — recency chỉ phản ánh khi nó được *sửa*, không phải khi nó được *dùng*. Một memory tạo lâu rồi, dùng đều đặn, xếp hạng thấp hơn một memory mới tạo nhưng chưa từng dùng lần nào — sai hướng so với ý định thiết kế ban đầu của chính công thức này.

**Phạm vi cố ý KHÔNG làm (đã cân nhắc, loại bỏ):** KHÔNG thêm số hạng `use_count`/tần suất riêng vào công thức — không có hệ thống nào trong research (Mem0, Generative Agents) dùng frequency làm số hạng độc lập; thêm vào sẽ là suy đoán không có căn cứ, vi phạm Simplicity First. Đây là fix 1 dòng, không phải redesign công thức.

---

## Task — sửa đúng 1 dòng trong RPC, giữ nguyên toàn bộ phần còn lại

Tạo file mới `supabase/migrations/20260717000000_moodie_memory_recency_last_used.sql` với nội dung sau (copy nguyên function gốc từ `20260712100000_moodie_memory_hybrid_retrieval.sql`, CHỈ đổi đúng 1 dòng recency — dòng đánh dấu `-- CHANGED`):

```sql
CREATE OR REPLACE FUNCTION public.match_moodie_memories(
  p_user_id UUID,
  p_conversation_id UUID DEFAULT NULL,
  p_query_text TEXT DEFAULT '',
  p_query_embedding JSONB DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  scope TEXT,
  memory_type TEXT,
  content TEXT,
  subject TEXT,
  predicate TEXT,
  importance NUMERIC,
  updated_at TIMESTAMPTZ,
  use_count INTEGER,
  score DOUBLE PRECISION
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT m.id, m.scope, m.memory_type, m.content, m.subject, m.predicate,
         m.importance, m.updated_at, m.use_count,
         (
           CASE WHEN p_query_embedding IS NOT NULL AND m.embedding IS NOT NULL
             THEN greatest(0, public.moodie_jsonb_cosine_similarity(p_query_embedding, m.embedding)) * 0.45 ELSE 0 END
           + ts_rank_cd(
               to_tsvector('simple', coalesce(m.subject, '') || ' ' || coalesce(m.predicate, '') || ' ' || m.content),
               plainto_tsquery('simple', coalesce(p_query_text, ''))
             ) * 0.25
           + coalesce(m.importance, 0.5)::double precision * 0.12
           + CASE WHEN m.memory_type IN ('goal', 'project', 'decision') THEN 0.18 ELSE 0 END
           + CASE WHEN m.scope = 'conversation' THEN 0.12 WHEN m.scope = 'user' THEN 0.08 ELSE 0.04 END
           + greatest(0, 1 - extract(epoch FROM (now() - coalesce(m.last_used_at, m.updated_at))) / 15552000.0) * 0.08
         ) AS score
  FROM public.moodie_memories m
  WHERE m.status = 'active'
    AND (m.expires_at IS NULL OR m.expires_at > now())
    AND (m.review_after IS NULL OR m.review_after > now())
    AND (
      (m.scope = 'user' AND m.user_id = p_user_id)
      OR m.scope = 'studio'
      OR (m.scope = 'conversation' AND m.user_id = p_user_id AND m.conversation_id = p_conversation_id)
    )
  ORDER BY score DESC, m.updated_at DESC
  LIMIT greatest(1, least(p_limit, 20));
$$;

GRANT EXECUTE ON FUNCTION public.match_moodie_memories(UUID, UUID, TEXT, JSONB, INTEGER) TO authenticated, service_role;

COMMENT ON FUNCTION public.match_moodie_memories IS
  'RLS-scoped database-native hybrid memory retrieval over semantic JSON embeddings, lexical rank, scope, importance and recency (recency = last retrieval, not last edit).';
```

**Đúng 1 khác biệt so với bản gốc:** dòng recency đổi `m.updated_at` → `coalesce(m.last_used_at, m.updated_at)` (dùng `updated_at` làm fallback cho memory chưa từng được truy hồi lần nào, `last_used_at IS NULL`). Comment cuối file cũng cập nhật 1 câu để ghi lại lý do. **Không đổi** `moodie_jsonb_cosine_similarity` (không cần re-tạo, không nằm trong file mới này — chỉ cần định nghĩa lại `match_moodie_memories` vì nó là hàm bị đổi).

**KHÔNG** tạo lại `GRANT EXECUTE ON FUNCTION public.moodie_jsonb_cosine_similarity` (hàm đó không đổi, không cần re-grant).

---

## Verify (Codex tự chạy trước khi báo xong)

1. `npx eslint supabase/migrations/20260717000000_moodie_memory_recency_last_used.sql` — **bỏ qua** (không phải file lint được, chỉ SQL). Thay bằng: đọc lại file vừa tạo, xác nhận đúng 1 dòng khác so với file gốc `20260712100000_moodie_memory_hybrid_retrieval.sql` (diff 2 file bằng mắt hoặc `diff`/`Compare-Object`).
2. Báo diff. **KHÔNG tự chạy migration lên DB, KHÔNG commit, KHÔNG push** — Claude làm bước áp dụng + verify prod (cần quyền Supabase service key).

## Verify sau (Claude)

1. Chạy `npm run migrate supabase/migrations/20260717000000_moodie_memory_recency_last_used.sql` (theo đúng cách gọi `scripts/migrate-direct.mjs <file>` — **không** dùng `migrate:latest` không tham số, vì nó chạy file phase1 cũ hardcoded).
2. Query trực tiếp `match_moodie_memories` cho 1 user thật có ít nhất 2 memory active — 1 memory có `last_used_at` gần đây (dùng nhiều), 1 memory có `updated_at` gần đây nhưng `last_used_at` cũ/null — xác nhận thứ hạng đổi đúng hướng: memory được dùng gần đây điểm cao hơn ở cùng mức similarity/importance.
3. Nếu prod chưa có đủ 2 memory làm test case thật — chấp nhận verify bằng cách so sánh giá trị `score` trả về trước/sau cho **cùng 1 bộ dữ liệu** (áp dụng migration là thay đổi tức thời, không cần dữ liệu mới) bằng cách gọi RPC 1 lần trước khi áp dụng migration (ghi lại score), 1 lần sau khi áp dụng, trên đúng 1 user_id + query giống nhau.
4. Commit file migration + push `main` (deploy = `git push origin main`, không cần Vercel rebuild vì đây là DB function, nhưng vẫn qua git để giữ lịch sử/rollback).
