import mysql from 'mysql2/promise';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const c = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME });
try {
  await c.execute(`CREATE TABLE IF NOT EXISTS quote_emails (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    quote_id INT UNSIGNED NOT NULL,
    email_type VARCHAR(40) NOT NULL DEFAULT 'acknowledgement',
    recipient VARCHAR(254) NOT NULL,
    sender VARCHAR(254) NOT NULL,
    status ENUM('pending','sending','accepted','failed','unknown') NOT NULL DEFAULT 'pending',
    provider_message_id VARCHAR(200) NULL,
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    last_error VARCHAR(1000) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    accepted_at DATETIME NULL,
    CONSTRAINT fk_email_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
    UNIQUE KEY uq_quote_email_recipient (quote_id, email_type, recipient)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await c.execute('INSERT IGNORE INTO schema_migrations (version, applied_at) VALUES (?, UTC_TIMESTAMP())', ['002_quote_emails']);
  console.log('Quote email delivery log is ready.');
} finally { await c.end(); }
