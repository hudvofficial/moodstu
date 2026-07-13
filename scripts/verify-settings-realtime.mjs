#!/usr/bin/env node

import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const connectionString =
  process.env.DATABASE_URL ||
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.SUPABASE_POOLER_URL;

if (!connectionString) throw new Error("Missing database connection string");

const sourceTables = ["notification_preferences", "system_settings", "credit_cards"];
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  const triggers = await client.query(
    `SELECT event_object_table, trigger_name,
            string_agg(event_manipulation, ',' ORDER BY event_manipulation) AS events
       FROM information_schema.triggers
      WHERE trigger_name = $1 AND event_object_table = ANY($2::text[])
      GROUP BY event_object_table, trigger_name ORDER BY event_object_table`,
    ["emit_realtime_signal", sourceTables],
  );
  const publication = await client.query(
    `SELECT schemaname, tablename FROM pg_publication_tables
      WHERE pubname = $1 AND tablename = ANY($2::text[]) ORDER BY tablename`,
    ["supabase_realtime", ["realtime_signals", ...sourceTables]],
  );
  const triggerTables = new Set(triggers.rows.map((row) => row.event_object_table));
  const missingTriggers = sourceTables.filter((table) => !triggerTables.has(table));
  const publishedTables = publication.rows.map((row) => row.tablename);
  const exposedSourceTables = publishedTables.filter((table) => sourceTables.includes(table));

  console.log(JSON.stringify({ triggers: triggers.rows, publication: publication.rows }, null, 2));
  if (missingTriggers.length) throw new Error(`Missing realtime triggers: ${missingTriggers.join(", ")}`);
  if (!publishedTables.includes("realtime_signals")) throw new Error("realtime_signals is missing from supabase_realtime");
  if (exposedSourceTables.length) throw new Error(`Sensitive source tables are directly published: ${exposedSourceTables.join(", ")}`);
} finally {
  await client.end();
}
