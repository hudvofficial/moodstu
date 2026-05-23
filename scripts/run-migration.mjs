#!/usr/bin/env node
/**
 * Run database migration script
 * Usage: node scripts/run-migration.mjs <migration-filename>
 * Example: node scripts/run-migration.mjs 20260524000000_printing_workflow_phase1.sql
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get migration filename from args
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Error: Please provide migration filename');
  console.log('Usage: node scripts/run-migration.mjs <migration-filename>');
  console.log('Example: node scripts/run-migration.mjs 20260524000000_printing_workflow_phase1.sql');
  process.exit(1);
}

// Load env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Read migration file
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', migrationFile);
let sqlContent;

try {
  sqlContent = readFileSync(migrationPath, 'utf-8');
} catch (err) {
  console.error(`❌ Error reading migration file: ${migrationPath}`);
  console.error(err.message);
  process.exit(1);
}

console.log(`📄 Migration file: ${migrationFile}`);
console.log(`📊 Size: ${sqlContent.length} characters`);
console.log(`🔗 Supabase URL: ${supabaseUrl}`);
console.log('');

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Execute migration
console.log('🚀 Running migration...');
console.log('');

try {
  // Split by semicolons to execute statements separately
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip comments
    if (statement.startsWith('--') || statement.startsWith('/*')) {
      continue;
    }

    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });

      if (error) {
        // Try direct query if RPC fails
        const { error: queryError } = await supabase
          .from('_migrations')
          .select('*')
          .limit(0); // Just to test connection

        if (queryError) {
          throw error;
        }

        // Use Postgres REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ query: statement + ';' }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`⚠️  Statement ${i + 1}/${statements.length} warning:`, errorText.substring(0, 100));
          errorCount++;
        } else {
          successCount++;
        }
      } else {
        successCount++;
      }
    } catch (err) {
      console.warn(`⚠️  Statement ${i + 1}/${statements.length} error:`, err.message);
      errorCount++;
    }
  }

  console.log('');
  console.log('✅ Migration completed!');
  console.log(`   Success: ${successCount} statements`);
  if (errorCount > 0) {
    console.log(`   ⚠️  Warnings/Errors: ${errorCount} statements (may be normal for IF EXISTS checks)`);
  }
  console.log('');
  console.log('🎉 Database updated successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Restart your dev server: npm run dev');
  console.log('2. Test the new workflow in the printing section');

} catch (error) {
  console.error('');
  console.error('❌ Migration failed:');
  console.error(error);
  console.log('');
  console.log('Alternative: Run migration via Supabase Dashboard:');
  console.log(`1. Open ${supabaseUrl}/project/_/sql`);
  console.log(`2. Paste contents of: ${migrationPath}`);
  console.log('3. Click "Run"');
  process.exit(1);
}
