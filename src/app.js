const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Status Endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'UP',
    message: 'Social Media Monolith Backend API is running on Vercel!',
    healthCheck: '/api/health',
  });
});

// Routes
app.use('/api', routes);
app.use('/', routes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
