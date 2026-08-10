const app = require('../src/app');
const { initDb } = require('../src/config/db');

// Initialize database tables if not already created
initDb();

module.exports = app;
