import mysql from 'mysql2/promise';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const c = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
try {
  // Snapshot the removed driver so notification retries work after clearing the link.
  const [columns] = await c.query("SHOW COLUMNS FROM bookings LIKE 'unassigned_driver_name'");
  if (!columns.length) await c.execute('ALTER TABLE bookings ADD COLUMN unassigned_driver_name VARCHAR(150) NULL');
  await c.execute('INSERT IGNORE INTO schema_migrations (version, applied_at) VALUES (?, UTC_TIMESTAMP())', ['007_driver_unassignment_notifications']);
  console.log('Driver unassignment notifications are ready. Existing records preserved.');
} finally { await c.end(); }
