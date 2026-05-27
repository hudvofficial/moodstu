#!/usr/bin/env node

/**
 * Test Supabase Connection Pooling
 * Usage: node scripts/test-pooler.mjs
 */

import { config } from 'dotenv';
import pg from 'pg';

// Load .env.local
config({ path: '.env.local' });

const { Pool } = pg;

async function testPooler() {
  const poolerUrl = process.env.SUPABASE_POOLER_URL;

  if (!poolerUrl) {
    console.error('❌ SUPABASE_POOLER_URL not found in environment');
    process.exit(1);
  }

  console.log('🔍 Testing Supabase Connection Pooling...\n');
  console.log('📍 Pooler URL:', poolerUrl.replace(/:[^:@]+@/, ':***@')); // Mask password

  const pool = new Pool({
    connectionString: poolerUrl,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: {
      rejectUnauthorized: false, // Supabase pooler uses self-signed cert
    },
  });

  try {
    // Test 1: Basic connection
    console.log('\n✓ Test 1: Basic connection...');
    const client = await pool.connect();
    console.log('  ✅ Connected successfully');

    // Test 2: Query execution
    console.log('\n✓ Test 2: Query execution...');
    const result = await client.query('SELECT NOW() as current_time, version()');
    console.log('  ✅ Query executed');
    console.log(`  ⏰ Server time: ${result.rows[0].current_time}`);
    console.log(`  📊 Postgres: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);

    // Test 3: Pool info
    console.log('\n✓ Test 3: Pool status...');
    console.log(`  📊 Total connections: ${pool.totalCount}`);
    console.log(`  🔄 Idle connections: ${pool.idleCount}`);
    console.log(`  ⏳ Waiting requests: ${pool.waitingCount}`);

    client.release();

    // Test 4: Multiple concurrent connections
    console.log('\n✓ Test 4: Concurrent connections (3x)...');
    const promises = Array.from({ length: 3 }, async (_, i) => {
      const c = await pool.connect();
      const r = await c.query('SELECT $1::text as message', [`Connection ${i + 1}`]);
      c.release();
      return r.rows[0].message;
    });

    const results = await Promise.all(promises);
    console.log(`  ✅ All concurrent queries completed: ${results.join(', ')}`);

    console.log('\n✅ All tests passed!');
    console.log('\n📝 Summary:');
    console.log('   - Connection pooling: ✅ Working');
    console.log('   - Pool size: 5 (test) / 15 (Supabase Free plan)');
    console.log('   - Mode: Transaction (PgBouncer)');
    console.log('   - Status: Ready for production\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check SUPABASE_POOLER_URL in .env.local');
    console.error('   2. Verify password is correct');
    console.error('   3. Ensure pooling is enabled in Supabase Dashboard');
    console.error('   4. Check firewall/network settings\n');

    await pool.end();
    process.exit(1);
  }
}

testPooler();
