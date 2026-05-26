#!/usr/bin/env node
/**
 * Run vendor expense tracking migrations via Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables
config({ path: join(rootDir, '.env.local') });

console.log('🚀 Running Vendor Expense Migrations\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Read migration files
const migration1 = readFileSync(
  join(rootDir, 'supabase/migrations/20260528000003_vendor_expense_tracking_safe.sql'),
  'utf-8'
);

const migration2 = readFileSync(
  join(rootDir, 'supabase/migrations/20260528000002_vendor_expense_profit_fix.sql'),
  'utf-8'
);

async function runMigration(name, sql) {
  console.log(`📊 Running: ${name}...`);

  try {
    // Split SQL by statements (rough split - works for most cases)
    const statements = sql
      .split(/;\s*$/gm)
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s !== '');

    let successCount = 0;

    for (const statement of statements) {
      if (!statement) continue;

      // Use rpc if available, otherwise try direct query via PostgREST
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: statement
      }).single();

      if (error) {
        // If RPC doesn't exist, we can't run raw SQL via Supabase client
        console.log(`⚠️  Cannot execute SQL via Supabase client (no exec_sql RPC)`);
        console.log(`\n📋 Please run this SQL manually in Supabase Dashboard:\n`);
        console.log(`--- ${name} ---`);
        console.log(sql);
        console.log(`\n--- End of ${name} ---\n`);
        return false;
      }

      successCount++;
    }

    console.log(`✅ ${name} completed (${successCount} statements)\n`);
    return true;
  } catch (err) {
    console.error(`❌ Error in ${name}:`, err.message);
    console.log(`\n📋 Please run this SQL manually in Supabase Dashboard:\n`);
    console.log(`--- ${name} ---`);
    console.log(sql);
    console.log(`\n--- End of ${name} ---\n`);
    return false;
  }
}

// Run migrations sequentially
(async () => {
  console.log('Migration 1: Vendor Expense Tracking (Schema + Functions)');
  const success1 = await runMigration('20260528000003_vendor_expense_tracking_safe.sql', migration1);

  console.log('Migration 2: Profit Report Fix (Exclude vendor tasks)');
  const success2 = await runMigration('20260528000002_vendor_expense_profit_fix.sql', migration2);

  if (success1 && success2) {
    console.log('🎉 All migrations completed successfully!');
  } else {
    console.log('⚠️  Some migrations need manual execution (see above)');
  }
})();
