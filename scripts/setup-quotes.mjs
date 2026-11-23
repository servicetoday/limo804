import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const c = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME });
try {
  await c.execute('CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(100) PRIMARY KEY, applied_at DATETIME NOT NULL) ENGINE=InnoDB');
  const [applied] = await c.execute('SELECT version FROM schema_migrations WHERE version = ?', ['001_quotes_and_bookings']);
  if (applied.length) console.log('Quote schema is already up to date.');
  else {
    const sql = await readFile(new URL('./quote-schema.sql', import.meta.url), 'utf8');
    for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) await c.execute(statement);
    await c.execute('INSERT INTO schema_migrations (version, applied_at) VALUES (?, UTC_TIMESTAMP())', ['001_quotes_and_bookings']);
    console.log('Quote, customer, journey, stop, attachment, history and booking tables created.');
  }
} finally { await c.end(); }
