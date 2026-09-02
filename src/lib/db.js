import { createClient } from '@libsql/client/web';

let db;

// For production on Vercel, use Turso (cloud SQLite).
// For local dev, use a file-based SQLite database.
const DB_URL = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:football-ai.db';
const DB_TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.libsql_AUTH_TOKEN || undefined;

export function getDb() {
  if (db) return db;

  db = createClient({
    url: DB_URL,
    authToken: DB_TOKEN,
  });

  return db;
}

export async function initDb() {
  const client = getDb();

  await client.execute(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id TEXT,
      competition TEXT,
      home_team TEXT,
      away_team TEXT,
      match_date TEXT,
      prediction TEXT,
      markets TEXT,
      market TEXT,
      confidence REAL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: ensure market column exists if table was created without it
  try {
    const cols = await client.execute(`PRAGMA table_info(predictions)`);
    const hasMarket = cols.rows.some(r => r.name === 'market');
    if (!hasMarket) {
      await client.execute(`ALTER TABLE predictions ADD COLUMN market TEXT`);
    }
    const hasConfidence = cols.rows.some(r => r.name === 'confidence');
    if (!hasConfidence) {
      await client.execute(`ALTER TABLE predictions ADD COLUMN confidence REAL`);
    }
  } catch (e) {
    console.error('Migration check failed:', e.message);
  }

  await client.execute(`
    CREATE TABLE IF NOT EXISTS match_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id TEXT,
      home_team TEXT,
      away_team TEXT,
      home_score INTEGER,
      away_score INTEGER,
      result TEXT,
      settled_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS learning_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prediction_id INTEGER,
      market TEXT,
      expected TEXT,
      actual TEXT,
      won INTEGER,
      reason TEXT,
      lesson TEXT,
      logged_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Daily 2.0 odds rollover accumulator
  await client.execute(`
    CREATE TABLE IF NOT EXISTS rollovers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roll_date TEXT UNIQUE,
      selections TEXT,
      combined_odds REAL,
      combined_probability REAL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS rollover_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roll_date TEXT,
      selection_index INTEGER,
      match_id TEXT,
      home_team TEXT,
      away_team TEXT,
      market TEXT,
      expected TEXT,
      confidence REAL,
      won INTEGER,
      settled_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return client;
}