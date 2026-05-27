# Supabase Connection Pooling Setup Guide

**Status**: ⚠️ NOT CONFIGURED  
**Priority**: 🔴 HIGH (Required for 100+ concurrent users)  
**Effort**: 15 minutes (config only)

---

## Why Connection Pooling?

### Current Behavior (Without Pooling)

```typescript
// Every request creates a new database connection
const supabase = createServerClient(SUPABASE_URL, KEY);
await supabase.from('galleries').select();  // New connection
```

**Problem**:
- Postgres has limited connections (default: 25-100)
- Each Next.js request = 1+ DB connections
- At 100 concurrent requests → Exhausted connections → **App crashes**

### With Connection Pooling

```
[Next.js] → [PgBouncer Pool] → [Postgres]
  ↓              ↓                  ↓
 1000 requests   20 active      Limit: 25
                 connections
```

**Benefit**: Handle 10x-100x more concurrent users

---

## Setup Instructions

### Step 1: Enable Pooler in Supabase Dashboard

1. Go to: [Supabase Dashboard](https://app.supabase.com)
2. Select project: `mood-studio`
3. Navigate to: **Settings → Database → Connection Pooling**
4. Enable **Connection Pooling** (PgBouncer)
5. Choose mode: **Transaction** (recommended for Next.js)
6. Copy the **Pooler Connection String**

Example pooler URL:
```
postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

---

### Step 2: Add Environment Variables

**File**: `.env.local`

Add new variable:
```bash
# Standard connection (keep existing)
NEXT_PUBLIC_SUPABASE_URL=https://mnoqeluywookswpcykha.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# New: Pooler URL for high-traffic scenarios
SUPABASE_POOLER_URL=postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

---

### Step 3: Update Supabase Client (Optional)

**Option A**: Keep current implementation (recommended)

No code changes needed. Supabase `@supabase/ssr` automatically uses pooling if available.

**Current implementation is fine**:
```typescript
// lib/supabase/server.ts
export const createClient = cache(async () => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,  // REST API URL
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { /* ... */ }
  );
});
```

**Why it works**: Supabase REST API internally uses pooling on server-side.

---

**Option B**: Direct Postgres pooler (for raw SQL)

Only if you need raw SQL queries (not common in Mood):

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_POOLER_URL,
  max: 20,  // Max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function queryDatabase(sql: string, params: any[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}
```

---

## Verification

### Check Current Connection Count

**SQL Query** (run in Supabase SQL Editor):

```sql
SELECT 
  count(*) as total_connections,
  max_conn,
  ROUND(100.0 * count(*) / max_conn, 2) as pct_used
FROM pg_stat_activity
CROSS JOIN (SELECT setting::int AS max_conn FROM pg_settings WHERE name = 'max_connections') AS max;
```

**Healthy State**:
- `pct_used` < 50% → OK
- `pct_used` 50-80% → Add pooling soon
- `pct_used` > 80% → 🔴 CRITICAL - Add pooling NOW

---

### Monitor After Pooling

Run same query after deploying pooler:

**Expected**:
- Direct connections should decrease
- Pooled connections appear in separate stat view

---

## Connection Modes Explained

Supabase offers 3 pooling modes:

| Mode | Use Case | Mood Fit |
|------|----------|----------|
| **Transaction** | Short-lived queries (REST API, Server Actions) | ✅ **Best for Mood** |
| Session | Long-lived (migrations, pg_dump) | ❌ Not needed |
| Statement | Ultra-high concurrency (>1000 RPS) | ⚠️ Overkill |

**Recommendation**: Use **Transaction mode**

---

## Cost

**Supabase Pooling**: Included in all paid plans (Free/Pro/Team/Enterprise)

- Free tier: Limited connections (25)
- Pro tier: 50+ connections
- Pooler: FREE (no extra cost)

---

## Impact

### Before Pooling

| Metric | Value |
|--------|-------|
| Max concurrent requests | ~25-50 |
| Connection exhaustion risk | 🔴 HIGH |
| Crash under load | Yes (>100 users) |

### After Pooling

| Metric | Value |
|--------|-------|
| Max concurrent requests | 500-1000+ |
| Connection exhaustion risk | 🟢 LOW |
| Crash under load | No |

---

## Action Items

- [ ] Enable Connection Pooling in Supabase Dashboard
- [ ] Add `SUPABASE_POOLER_URL` to `.env.local`
- [ ] Deploy to staging
- [ ] Monitor connection count
- [ ] Load test (optional)

**Estimated Time**: 15 minutes  
**Priority**: 🔴 HIGH  
**ROI**: Prevent production crashes

---

## References

- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [PgBouncer Transaction Mode](https://www.pgbouncer.org/features.html)
- [Next.js + Supabase Performance](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
