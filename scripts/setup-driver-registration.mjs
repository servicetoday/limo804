import mysql from 'mysql2/promise';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const c = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
try {
  const [columns] = await c.query("SHOW COLUMNS FROM drivers LIKE 'vehicle_registration'");
  if (!columns.length) await c.execute('ALTER TABLE drivers ADD COLUMN vehicle_registration VARCHAR(20) NULL');
  await c.execute('INSERT IGNORE INTO schema_migrations (version, applied_at) VALUES (?, UTC_TIMESTAMP())', ['008_driver_vehicle_registration']);
  console.log('Driver vehicle registration is ready. Existing records preserved.');
} finally { await c.end(); }
