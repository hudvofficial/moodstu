#!/usr/bin/env node
/**
 * Direct migration using PostgreSQL connection
 * Auto-detects connection string from env
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables
config({ path: join(rootDir, '.env.local') });

console.log('🚀 Direct Migration via PostgreSQL\n');

// Try to get connection string from multiple sources
let connectionString = process.env.DATABASE_URL ||
                      process.env.DIRECT_URL ||
                      process.env.POSTGRES_URL ||
                      process.env.SUPABASE_DB_URL ||
                      process.env.SUPABASE_POOLER_URL;

// If no direct URL, construct from Supabase credentials
if (!connectionString) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;

  if (supabaseUrl && dbPassword) {
    const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (match) {
      const projectRef = match[1];
      // Encode password for URL (special chars like !@# need encoding)
      const encodedPassword = encodeURIComponent(dbPassword);
      // Use session pooler (port 5432) with pgbouncer user
      // Pooler format: postgres:[ref].[password]@aws-0-region.pooler.supabase.com:6543
      connectionString = `postgresql://postgres:${projectRef}%5B${encodedPassword}%5D@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true`;
      console.log(`📊 Connection to: pooler.supabase.com:5432 (session mode)\n`);
    }
  }
}

if (!connectionString) {
  console.error('❌ No database connection string found\n');
  console.log('💡 Add one of these to .env.local:');
  console.log('   DATABASE_URL=postgresql://...');
  console.log('   or');
  console.log('   SUPABASE_DB_PASSWORD=your-db-password\n');
  process.exit(1);
}

// Get migration file
// ADR-017: không còn mặc định file phase-1 (chạy lại sẽ tạo lại object đã drop) — bắt buộc truyền tên file.
const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('❌ Thiếu tên file: node scripts/migrate-direct.mjs <ten_file_trong_supabase/migrations>');
  process.exit(1);
}
const migrationPath = join(rootDir, 'supabase', 'migrations', migrationFile);

async function runMigration() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Read migration SQL
    const sql = readFileSync(migrationPath, 'utf-8');
    console.log(`📄 Migration: ${migrationFile}`);
    console.log(`📊 Size: ${(sql.length / 1024).toFixed(1)} KB\n`);

    // Connect
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    // Execute migration in transaction
    console.log('⚙️  Executing migration...\n');

    await client.query('BEGIN');

    try {
      await client.query(sql);
      await client.query('COMMIT');

      console.log('✅ Migration completed successfully!\n');
      console.log('=' .repeat(50));
      // ADR-017: bỏ banner "Created: order_payments…" cố định từ phase-1 in ấn (sai với mọi migration sau đó).
      console.log('Next steps: npm run db:types → npx tsc --noEmit → node scripts/vault-gen-schema.mjs\n');

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('   Full error:', error, '\n');

    if (error.message.includes('already exists')) {
      console.log('💡 Tables may already exist. Run: npm run migrate:verify\n');
    } else if (error.message.includes('password') || error.message.includes('authentication')) {
      console.log('💡 Connection failed. Check your DATABASE_URL or SUPABASE_DB_PASSWORD\n');
    } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
      console.log('💡 Cannot reach database. Check network or use Supabase Dashboard\n');
    }

    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
