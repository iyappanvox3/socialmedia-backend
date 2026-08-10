const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const facebookRoutes = require('./facebook.routes');
const youtubeRoutes = require('./youtube.routes');
const geminiRoutes = require('./gemini.routes');

const router = express.Router();

router.use('/', healthRoutes);
router.use('/', authRoutes);
router.use('/', facebookRoutes);
router.use('/', youtubeRoutes);
router.use('/', geminiRoutes);

module.exports = router;
