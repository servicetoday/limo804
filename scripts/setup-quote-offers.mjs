import mysql from 'mysql2/promise';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const c = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME });
try {
  await c.execute(`CREATE TABLE IF NOT EXISTS quote_offers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    quote_id INT UNSIGNED NOT NULL,
    recipient VARCHAR(254) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'AUD',
    nonce CHAR(64) NOT NULL,
    status ENUM('active','superseded','accepted') NOT NULL DEFAULT 'active',
    expires_at DATETIME NOT NULL,
    accepted_at DATETIME NULL,
    booking_id INT UNSIGNED NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_offer_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
    CONSTRAINT fk_offer_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    INDEX idx_offer_quote (quote_id, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await c.execute('INSERT IGNORE INTO schema_migrations (version, applied_at) VALUES (?, UTC_TIMESTAMP())', ['003_customer_quote_offers']);
  console.log('Customer quote offer links are ready.');
} finally { await c.end(); }
