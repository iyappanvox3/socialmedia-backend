const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    })
  : {
      query: async () => {
        throw new Error('DATABASE_URL is not set in environment variables.');
      },
    };

const initDb = async () => {
  if (!connectionString) {
    console.warn('[DB INIT WARNING]: DATABASE_URL is not configured in Vercel Environment Variables.');
    return;
  }
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
    console.error('[DB INIT ERROR]: Failed to initialize PostgreSQL tables:', err.message);
  }
};

module.exports = {
  pool,
  initDb,
};
