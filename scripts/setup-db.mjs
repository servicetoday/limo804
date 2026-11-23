import mysql from 'mysql2/promise';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());

const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME });
try {
  await connection.execute(`CREATE TABLE IF NOT EXISTS fleet (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    category ENUM('sedan','suv') NOT NULL,
    passengers TINYINT UNSIGNED NOT NULL,
    suitcases TINYINT UNSIGNED NOT NULL DEFAULT 0,
    image VARCHAR(1000) NOT NULL,
    image_alt VARCHAR(200) NOT NULL DEFAULT '',
    tagline VARCHAR(180) NOT NULL DEFAULT '',
    description TEXT NOT NULL,
    details TEXT NOT NULL,
    features JSON NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_fleet_public (is_active, deleted_at, category, sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  console.log('Fleet table is ready. Existing data was preserved.');
} finally { await connection.end(); }
