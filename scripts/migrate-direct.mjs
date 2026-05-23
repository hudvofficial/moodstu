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
                      process.env.SUPABASE_DB_URL;

// If no direct URL, construct from Supabase credentials
if (!connectionString) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;

  if (supabaseUrl && dbPassword) {
    const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (match) {
      const projectRef = match[1];
      // Direct connection via IPv6 endpoint
      connectionString = `postgresql://postgres:${dbPassword}@${projectRef}.supabase.co:5432/postgres`;
      console.log(`📊 Connection to: ${projectRef}.supabase.co:5432\n`);
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
const migrationFile = process.argv[2] || '20260524000000_printing_workflow_phase1.sql';
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
      console.log('🎉 Database schema updated!\n');
      console.log('📋 Created:');
      console.log('   - order_payments table');
      console.log('   - inventory_reservations table');
      console.log('   - order_payment_summary view');
      console.log('   - inventory_available_stock view');
      console.log('   - Enhanced printing_orders columns\n');
      console.log('Next steps:');
      console.log('   npm run migrate:verify');
      console.log('   npm run dev\n');

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error('   ', error.message, '\n');

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
