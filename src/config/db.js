const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        fb_access_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS fb_access_token TEXT;');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS youtube_tokens (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        channel_id VARCHAR(255),
        channel_title VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[DB INITIALIZED]: "users" and "youtube_tokens" tables ready');
  } catch (err) {
    console.error('[DB INIT ERROR]: Failed to initialize PostgreSQL users table:', err.message);
  }
};

module.exports = {
  pool,
  initDb,
};
