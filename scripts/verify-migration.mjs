#!/usr/bin/env node
/**
 * Verify if Phase 1 migration was successful
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Verifying Phase 1 migration...\n');

async function checkTable(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(0);

  if (error) {
    if (error.message.includes('does not exist')) {
      return { exists: false, error: error.message };
    }
    return { exists: false, error: error.message };
  }

  return { exists: true };
}

async function checkView(viewName) {
  try {
    const { data, error } = await supabase
      .from(viewName)
      .select('*')
      .limit(0);

    if (error) {
      if (error.message.includes('does not exist')) {
        return { exists: false };
      }
      return { exists: false, error: error.message };
    }

    return { exists: true };
  } catch (err) {
    return { exists: false };
  }
}

async function main() {
  const checks = [
    { type: 'table', name: 'order_payments' },
    { type: 'table', name: 'inventory_reservations' },
    { type: 'view', name: 'order_payment_summary' },
    { type: 'view', name: 'inventory_available_stock' },
  ];

  let allGood = true;
  const results = [];

  for (const check of checks) {
    const result = check.type === 'table'
      ? await checkTable(check.name)
      : await checkView(check.name);

    results.push({ ...check, ...result });

    const icon = result.exists ? '✅' : '❌';
    const status = result.exists ? 'EXISTS' : 'MISSING';

    console.log(`${icon} ${check.type.toUpperCase()}: ${check.name} - ${status}`);

    if (!result.exists) {
      allGood = false;
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  }

  console.log('\n' + '='.repeat(50));

  if (allGood) {
    console.log('✅ All Phase 1 tables/views exist!');
    console.log('\n🎉 Migration was successful!\n');
    console.log('Next steps:');
    console.log('  1. Start dev server: npm run dev');
    console.log('  2. Test printing workflow');
    console.log('  3. Try creating an order and recording deposit\n');
  } else {
    console.log('❌ Some tables/views are missing');
    console.log('\n💡 Solutions:');
    console.log('  1. Run migration via Supabase Dashboard SQL Editor');
    console.log('  2. Copy file: supabase/migrations/20260524000000_printing_workflow_phase1.sql');
    console.log('  3. Paste into SQL Editor and click Run\n');
  }
}

main().catch(console.error);
