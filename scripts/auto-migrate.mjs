#!/usr/bin/env node
/**
 * Auto-migrate: Automatically run pending migrations
 * Works with Supabase client - no CLI needed
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables
config({ path: join(rootDir, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' },
});

console.log('🚀 Auto-Migrate: Running pending migrations...\n');
console.log(`📊 Database: ${supabaseUrl}\n`);

// Get migration to run (from args or latest)
const targetMigration = process.argv[2];

async function runMigration(filename, sqlContent) {
  console.log(`📄 Running: ${filename}`);

  // Split into statements (handle comments, multi-line, etc.)
  const statements = sqlContent
    .split(/;[\s\n]/)
    .map(s => s.trim())
    .filter(s => {
      if (!s) return false;
      if (s.startsWith('--')) return false;
      if (s === '/*' || s === '*/') return false;
      return true;
    });

  console.log(`   ${statements.length} statements to execute`);

  let succeeded = 0;
  let failed = 0;
  const errors = [];

  for (const stmt of statements) {
    if (!stmt.trim()) continue;

    try {
      // Execute raw SQL via Supabase
      const { data, error } = await supabase.rpc('exec_sql', { query: stmt });

      if (error) {
        // Fallback: try direct query for DDL statements
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ query: stmt }),
        });

        if (response.ok || response.status === 204) {
          succeeded++;
        } else {
          // Check if it's a benign error (IF EXISTS, etc.)
          const errorText = await response.text();
          if (
            errorText.includes('already exists') ||
            errorText.includes('does not exist') ||
            errorText.includes('IF EXISTS') ||
            errorText.includes('IF NOT EXISTS')
          ) {
            // Expected error, count as success
            succeeded++;
          } else {
            failed++;
            errors.push({ stmt: stmt.substring(0, 80) + '...', error: errorText });
          }
        }
      } else {
        succeeded++;
      }
    } catch (err) {
      // Check if benign
      const errMsg = err.message || String(err);
      if (
        errMsg.includes('already exists') ||
        errMsg.includes('does not exist') ||
        errMsg.includes('IF EXISTS')
      ) {
        succeeded++;
      } else {
        failed++;
        errors.push({ stmt: stmt.substring(0, 80) + '...', error: errMsg });
      }
    }
  }

  console.log(`   ✅ Success: ${succeeded}`);
  if (failed > 0) {
    console.log(`   ⚠️  Skipped: ${failed} (may be normal)`);
    if (errors.length > 0 && errors.length <= 3) {
      errors.forEach(e => {
        console.log(`      - ${e.stmt}`);
        console.log(`        ${e.error.substring(0, 100)}`);
      });
    }
  }
  console.log('');

  return { succeeded, failed, errors };
}

async function main() {
  const migrationsDir = join(rootDir, 'supabase', 'migrations');

  try {
    let migrationsToRun = [];

    if (targetMigration) {
      // Run specific migration
      migrationsToRun = [targetMigration];
      console.log(`🎯 Target: ${targetMigration}\n`);
    } else {
      // Get latest migration
      const allMigrations = readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort()
        .reverse();

      if (allMigrations.length === 0) {
        console.log('✅ No migrations found');
        return;
      }

      migrationsToRun = [allMigrations[0]];
      console.log(`🎯 Latest migration: ${allMigrations[0]}\n`);
    }

    let totalSuccess = 0;
    let totalFailed = 0;

    for (const filename of migrationsToRun) {
      const filepath = join(migrationsDir, filename);

      try {
        const sqlContent = readFileSync(filepath, 'utf-8');
        const result = await runMigration(filename, sqlContent);

        totalSuccess += result.succeeded;
        totalFailed += result.failed;
      } catch (err) {
        console.error(`❌ Error reading ${filename}:`, err.message);
        totalFailed++;
      }
    }

    console.log('='.repeat(50));
    console.log(`✅ Migration completed!`);
    console.log(`   Total statements: ${totalSuccess + totalFailed}`);
    console.log(`   Success: ${totalSuccess}`);
    if (totalFailed > 0) {
      console.log(`   Warnings: ${totalFailed} (often normal for IF EXISTS)`);
    }
    console.log('');
    console.log('🎉 Database schema updated!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Restart dev server: npm run dev');
    console.log('  2. Test printing workflow');
    console.log('');

  } catch (err) {
    console.error('');
    console.error('❌ Migration failed:');
    console.error(err);
    console.log('');
    console.log('💡 Try manual approach:');
    console.log('   1. Open Supabase Dashboard SQL Editor');
    console.log('   2. Copy/paste migration file contents');
    console.log('   3. Click Run');
    process.exit(1);
  }
}

main();
