const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const sql = fs.readFileSync('supabase/migrations/20260611230000_printing_phase3_issue_history.sql', 'utf8');

async function runMigration() {
  const { Client } = require('pg');
  
  const client = new Client({
    connectionString: envConfig.SUPABASE_POOLER_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase');

    // Run entire migration inside a transaction block
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('🎉 Migration applied successfully!');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
      console.log('🔄 Rolled back transaction');
    } catch (rbErr) {
      console.error('Rollback failed:', rbErr.message);
    }
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
