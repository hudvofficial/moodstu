#!/usr/bin/env node
/**
 * Check database schema directly via pg_catalog
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

config({ path: join(rootDir, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' }
});

console.log('🔍 Checking database schema...\n');

async function checkSchema() {
  // Query pg_catalog to list all tables
  const { data: tables, error: tablesError } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND (table_name LIKE '%order_payment%' OR table_name LIKE '%inventory_reservation%')
        ORDER BY table_name;
      `
    });

  if (tablesError) {
    console.log('⚠️  Could not query via RPC, trying alternative...\n');

    // Try listing all columns in printing_orders to see if new columns exist
    const { data: columns, error: colError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'printing_orders'
          AND column_name IN ('deposit_amount', 'final_amount', 'paid_amount', 'inventory_status')
          ORDER BY column_name;
        `
      });

    if (colError) {
      console.error('❌ Cannot query database schema');
      console.log('\n📋 Anh có thấy message "Success" trong SQL Editor không?');
      console.log('📋 Hoặc có error messages nào không?');
      return;
    }

    console.log('✅ Checking printing_orders columns:');
    if (columns && Array.isArray(columns)) {
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });

      if (columns.length > 0) {
        console.log('\n✅ Migration đã chạy một phần (printing_orders đã có columns mới)');
        console.log('⚠️  Nhưng có thể tables mới (order_payments, inventory_reservations) chưa tạo');
      }
    }
    return;
  }

  console.log('📊 Tables found:');
  if (tables && Array.isArray(tables)) {
    tables.forEach(t => {
      console.log(`   ✅ ${t.table_type}: ${t.table_name}`);
    });
  } else {
    console.log('   ❌ No tables found');
  }
}

checkSchema().catch(err => {
  console.error('❌ Error:', err.message);
  console.log('\n💡 Thử check trong Supabase Dashboard → Table Editor');
  console.log('   Xem có tables: order_payments, inventory_reservations không?');
});
