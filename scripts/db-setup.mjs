/**
 * One-shot DB setup script: runs supabase/full_setup.sql against the
 * Supabase Postgres instance using the pg driver.
 *
 * Usage: node scripts/db-setup.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, '..', 'supabase', 'full_setup.sql');

const client = new pg.Client({
  host: 'aws-0-ap-south-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.oaswnnztmkxcclvmfeck',
  password: 'Vansharora#21',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log('Connected to Supabase Postgres.');

  const sql = readFileSync(sqlPath, 'utf8');
  console.log(`Executing ${sql.length} bytes of SQL...`);

  // Run in a transaction so a failure rolls everything back.
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Setup committed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Setup failed, rolled back:', error.message);
    process.exitCode = 1;
  }

  // Verify row counts.
  const tables = [
    'accounts',
    'transactions',
    'graph_edges',
    'fraud_patterns',
    'fraud_alerts',
    'investigator_feedback',
    'str_ctr_reports',
    'federated_nodes',
    'alert_embeddings',
    'graph_communities',
    'graph_paths',
  ];
  for (const table of tables) {
    try {
      const res = await client.query(`SELECT count(*)::int AS n FROM ${table}`);
      console.log(`  ${table}: ${res.rows[0].n} rows`);
    } catch (error) {
      console.log(`  ${table}: ERROR (${error.message})`);
    }
  }

  await client.end();
}

main().catch((error) => {
  console.error('Fatal:', error.message);
  process.exit(1);
});