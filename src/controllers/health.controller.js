const { pool } = require('../config/db');

class HealthController {
  async checkHealth(req, res) {
    try {
      const dbRes = await pool.query('SELECT NOW()');
      return res.json({
        status: 'OK',
        message: 'Social Media Backend is running and connected to PostgreSQL',
        dbTime: dbRes.rows[0].now,
      });
    } catch (err) {
      return res.status(500).json({
        status: 'ERROR',
        message: 'Backend running, but DB connection failed',
        error: err.message,
      });
    }
  }
}

module.exports = new HealthController();
