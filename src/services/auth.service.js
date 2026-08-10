const { pool } = require('../config/db');

class AuthService {
  async register(username, password, email) {
    const existingCheck = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingCheck.rows.length > 0) {
      const error = new Error('Username or Email already registered');
      error.statusCode = 409;
      throw error;
    }

    const insertResult = await pool.query(
      'INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, password, email]
    );

    const newUser = insertResult.rows[0];
    console.log(`[REGISTER SUCCESS DB]: User created -> ${username} (${email})`);
    return newUser;
  }

  async login(username, password) {
    const userCheck = await pool.query(
      'SELECT id, username, email, fb_access_token FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );

    if (userCheck.rows.length === 0) {
      const error = new Error('Invalid username or password');
      error.statusCode = 401;
      throw error;
    }

    const user = userCheck.rows[0];
    console.log(`[LOGIN SUCCESS DB]: ${username}`);
    return {
      token: `mock-jwt-token-for-${user.username}`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        hasFacebook: !!user.fb_access_token,
      },
    };
  }

  async forgotPassword(username) {
    const userCheck = await pool.query(
      'SELECT id, username FROM users WHERE username = $1',
      [username]
    );

    if (userCheck.rows.length === 0) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return { username };
  }
}

module.exports = new AuthService();
