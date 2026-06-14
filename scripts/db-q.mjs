#!/usr/bin/env node
/** Reusable READ query runner (pooler + pinned CA). Usage: node scripts/db-q.mjs "SELECT ..." */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import pg from "pg";
const { Client } = pg;
const root = process.cwd();
function loadEnv(fp){ if(!existsSync(fp))return; for(const raw of readFileSync(fp,"utf8").split(/\r?\n/)){const l=raw.trim(); if(!l||l.startsWith("#"))continue; const i=l.indexOf("="); if(i===-1)continue; const k=l.slice(0,i).trim(); let v=l.slice(i+1).trim(); if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1); process.env[k]??=v;} }
loadEnv(path.join(root,".env.local"));
const caPath = path.join(root,"scripts/supabase-pooler-ca.crt");
const sslConfig = existsSync(caPath)?{ca:readFileSync(caPath,"utf8"),rejectUnauthorized:true}:true;
const sql = process.argv.slice(2).join(" ");
if(!sql){ console.error('usage: node scripts/db-q.mjs "SELECT ..."'); process.exit(1); }
const client = new Client({ connectionString: process.env.SUPABASE_POOLER_URL, ssl: sslConfig });
try { await client.connect(); const r = await client.query(sql); console.log(JSON.stringify(r.rows, null, 2)); }
catch(e){ console.error("❌", e.message, e.code||""); process.exit(1); } finally { await client.end(); }
