require('dotenv').config({ override: true });
const app = require('./src/app');
const { initDb } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

// Initialize Database Table
initDb();

// Start HTTP Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[MONOLITH BACKEND]: Server running on http://localhost:${PORT}`);
});
