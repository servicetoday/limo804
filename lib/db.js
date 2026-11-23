import 'server-only';
import mysql from 'mysql2/promise';

const globalDb = globalThis;
export const db = globalDb.limoDb || mysql.createPool({
  host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'limo804',
  connectionLimit: 5, waitForConnections: true, enableKeepAlive: true, dateStrings: true, timezone: 'Z',
});
if (process.env.NODE_ENV !== 'production') globalDb.limoDb = db;
