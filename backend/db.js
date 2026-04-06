import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '152.42.227.103',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'megroup@72147321',
  database: process.env.DB_NAME || 'smashpang_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
