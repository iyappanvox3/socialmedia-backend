const express = require('express');
const geminiController = require('../controllers/gemini.controller');

const router = express.Router();

router.post('/gemini/generate-all', (req, res, next) => geminiController.generateAll(req, res, next));

module.exports = router;
