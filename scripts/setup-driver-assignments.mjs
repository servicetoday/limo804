import mysql from 'mysql2/promise';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const c = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
try {
  for (const [table, column, definition] of [
    ['drivers', 'assigned_fleet_id', 'INT UNSIGNED NULL'],
    ['bookings', 'assigned_driver_id', 'INT UNSIGNED NULL'],
    ['bookings', 'driver_assignment_version', 'INT UNSIGNED NOT NULL DEFAULT 0'],
  ]) {
    const [rows] = await c.query('SHOW COLUMNS FROM ?? LIKE ?', [table, column]);
    if (!rows.length) await c.query(`ALTER TABLE ${c.escapeId(table)} ADD COLUMN ${c.escapeId(column)} ${definition}`);
  }
  for (const [table, name, column, parent] of [
    ['drivers', 'fk_driver_vehicle', 'assigned_fleet_id', 'fleet'],
    ['bookings', 'fk_booking_driver', 'assigned_driver_id', 'drivers'],
  ]) {
    const [rows] = await c.execute('SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?', [table, name]);
    if (!rows.length) await c.query(`ALTER TABLE ${c.escapeId(table)} ADD CONSTRAINT ${c.escapeId(name)} FOREIGN KEY (${c.escapeId(column)}) REFERENCES ${c.escapeId(parent)} (id) ON DELETE SET NULL`);
  }
  // Temporary shared driver address requested by the operator.
  await c.execute('UPDATE drivers SET email = ?', ['altaf@servicetoday.com.au']);
  await c.execute('INSERT IGNORE INTO schema_migrations (version, applied_at) VALUES (?, UTC_TIMESTAMP())', ['006_driver_booking_assignments']);
  console.log('Driver vehicles and booking assignments are ready. Existing records preserved.');
} finally { await c.end(); }
