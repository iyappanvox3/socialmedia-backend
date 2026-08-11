const authService = require('../services/auth.service');

class AuthController {
  async register(req, res, next) {
    let { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (!email || email.trim().length === 0) {
      email = username.includes('@') ? username : `${username}@gmail.com`;
    }

    try {
      const newUser = await authService.register(username, password, email);
      return res.status(201).json({
        success: true,
        message: 'User registered successfully!',
        user: newUser,
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('[REGISTER ERROR DB]:', err.message);
      return res.status(500).json({ error: 'Internal server error during registration' });
    }
  }

  async login(req, res, next) {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
      const result = await authService.login(username, password);
      return res.json({
        message: 'Login successful!',
        token: result.token,
        user: result.user,
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('[LOGIN ERROR DB]:', err.message);
      return res.status(500).json({ error: 'Internal server error during login' });
    }
  }

  async forgotPassword(req, res, next) {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    try {
      const result = await authService.forgotPassword(username);
      return res.json({
        message: `Password reset instructions sent for ${result.username}!`,
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('[FORGOT PASSWORD ERROR DB]:', err.message);
      return res.status(500).json({ error: 'Internal server error during password reset' });
    }
  }
}

module.exports = new AuthController();
