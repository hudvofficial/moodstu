-- ═══════════════════════════════════════════════════════════
-- Contract module hot-path indexes — 2026-06-10
-- ═══════════════════════════════════════════════════════════
-- 1) contract_notes: get_contract_list_v2 có LATERAL per-row
--    "SELECT … WHERE contract_id = c.id ORDER BY created_at DESC LIMIT 10"
--    → hiện seq-scan contract_notes 20 lần mỗi page load (chưa có index nào
--    trên contract_id). Composite (contract_id, created_at DESC) phục vụ
--    đúng cả filter + sort + limit.
-- 2) customers bride/groom name: list RPC search ILIKE '%…%' trên
--    bride_name/groom_name — full_name/phone/customer_code đã có gin trgm
--    (20260422070000 + 20260423090000), 2 cột này còn thiếu.
-- Additive thuần (CREATE INDEX IF NOT EXISTS) — không đổi schema/data.
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_contract_notes_contract_created_desc
  ON public.contract_notes(contract_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customers_bride_name_trgm
  ON public.customers USING gin(bride_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_groom_name_trgm
  ON public.customers USING gin(groom_name gin_trgm_ops);
