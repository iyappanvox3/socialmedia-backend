const express = require('express');
const healthController = require('../controllers/health.controller');

const router = express.Router();

router.get('/health', (req, res, next) => healthController.checkHealth(req, res, next));

module.exports = router;
