# 🚀 RPC v3 Implementation Guide

## Tổng quan

**Mục tiêu:** Giảm `get_contract_detail` từ **677ms → ~150ms** (78% faster)

**Approach:** Single-query LATERAL JOINs thay vì 8 sequential queries

**Status:** ✅ Code ready, pending deployment

---

## 📋 Implementation Checklist

### Phase 1: Local Testing (30 phút)

- [x] ✅ Viết migration: `supabase/migrations/20260530000000_contract_detail_v3_single_query.sql`
- [x] ✅ Update code: `app/actions/contract-queries.ts` với feature flag
- [x] ✅ Tạo test script: `scripts/test-rpc-v3.mjs`
- [ ] ⏳ Run migration local:
  ```bash
  npm run migrate supabase/migrations/20260530000000_contract_detail_v3_single_query.sql
  ```
- [ ] ⏳ Test v3 vs v2:
  ```bash
  node scripts/test-rpc-v3.mjs
  ```
  **Expected output:**
  ```
  ✅ v2: 677ms
  ✅ v3: ~150ms
  ✅ Improvement: -527ms (78% faster)
  ✅ Output structures match perfectly!
  ```
- [ ] ⏳ Fix mismatches nếu có

---

### Phase 2: Staging Deployment (1 giờ)

- [ ] Deploy migration to staging DB
- [ ] Enable feature flag staging:
  ```bash
  # staging .env
  NEXT_PUBLIC_RPC_V3=true
  ```
- [ ] Run perf script staging:
  ```bash
  node scripts/perf-contract-detail.mjs
  ```
  **Target:** Total SSR < 500ms (hiện tại ~1255ms)
  
- [ ] Manual test staging:
  - [ ] Load contract detail page
  - [ ] Check DevTools Network: RPC call time
  - [ ] Verify all tabs load correctly (Events, Tasks, Payments, etc.)
  - [ ] Test Realtime updates still work
  
- [ ] Monitor staging logs 24h:
  - [ ] Check for RPC errors
  - [ ] Verify no fallback warnings

---

### Phase 3: Production Rollout (1 tuần)

#### Week 1: Canary (10% traffic)

- [ ] Deploy migration to production DB
- [ ] Enable v3 for 10% users:
  ```typescript
  // app/actions/contract-queries.ts
  const useV3 = 
    process.env.NEXT_PUBLIC_RPC_V3 === "true" ||
    (Math.random() < 0.1); // 10% canary
  ```
- [ ] Monitor metrics 48h:
  - [ ] RPC latency p50, p95, p99
  - [ ] Error rate
  - [ ] Fallback frequency
  - [ ] User complaints

**Rollback plan:** Set `NEXT_PUBLIC_RPC_V3=false` → instant rollback to v2

---

#### Week 2: Ramp to 50%

- [ ] If 10% OK → increase to 50%
- [ ] Monitor 48h
- [ ] Compare performance:
  | Metric | v2 (50%) | v3 (50%) | Delta |
  |--------|----------|----------|-------|
  | p50 latency | | | |
  | p95 latency | | | |
  | Error rate | | | |

---

#### Week 3: Full rollout 100%

- [ ] If 50% OK → enable for all users:
  ```typescript
  const useV3 = true; // or process.env.NEXT_PUBLIC_RPC_V3 !== "false"
  ```
- [ ] Monitor 1 week
- [ ] Remove v2 fallback code:
  ```typescript
  // Delete 100+ lines of fallback N+1 queries
  // Keep only RPC path
  ```

---

### Phase 4: Cleanup (1 ngày)

- [ ] Deprecate `get_contract_detail_v2`:
  ```sql
  -- Mark v2 as deprecated
  COMMENT ON FUNCTION get_contract_detail_v2(uuid) IS 
  'DEPRECATED: Use get_contract_detail_v3. Will be removed in 2026-07.';
  ```
- [ ] Update documentation
- [ ] Remove feature flag code
- [ ] Celebrate 🎉

---

## 🧪 Testing Commands

```bash
# Local test
node scripts/test-rpc-v3.mjs

# Specific contract
node scripts/test-rpc-v3.mjs 8b9268a0-8f46-4a5a-a464-ffea1a029daa

# Benchmark staging
NODE_ENV=staging node scripts/perf-contract-detail.mjs

# Production benchmark (read-only)
NODE_ENV=production node scripts/perf-contract-detail.mjs
```

---

## 📊 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **RPC latency** | <180ms | perf script |
| **Total SSR** | <500ms | Chrome DevTools |
| **Error rate** | <0.1% | Logs |
| **Fallback rate** | <1% | Console.warn logs |
| **User complaints** | 0 | Support tickets |

---

## ⚠️ Rollback Procedure

**If v3 has issues:**

1. **Instant rollback (30 seconds):**
   ```bash
   # Set env var
   NEXT_PUBLIC_RPC_V3=false
   
   # Redeploy (no code change needed)
   vercel --prod
   ```

2. **Verify rollback:**
   ```bash
   # Check logs show v2 usage
   grep "get_contract_detail_v2" logs.txt
   ```

3. **Post-mortem:**
   - Analyze what went wrong
   - Fix v3 function
   - Re-test locally
   - Try again next week

---

## 🔧 Troubleshooting

### Issue: v3 slower than v2

**Possible causes:**
- Missing indexes
- Query planner chose wrong plan
- LATERAL JOINs not optimized

**Debug:**
```sql
EXPLAIN ANALYZE 
SELECT * FROM get_contract_detail_v3('contract-id');
```

**Fix:** Add missing indexes or adjust query

---

### Issue: Output mismatch

**Symptoms:**
```
⚠️  v3 missing keys: employees.department
```

**Fix:** Add missing fields to v3 jsonb_build_object

---

### Issue: RPC timeout

**Symptoms:**
```
Error: statement timeout
```

**Fix:** Increase timeout or optimize subquery

---

## 📞 Support

**Questions?** 
- Check logs: `grep "contract_detail" logs.txt`
- Run test: `node scripts/test-rpc-v3.mjs`
- Rollback if stuck

**Owner:** Đinh Hân (huhrevn@gmail.com)

**Created:** 2026-05-30
