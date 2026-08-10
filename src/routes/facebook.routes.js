const express = require('express');
const upload = require('../config/multer');
const facebookController = require('../controllers/facebook.controller');

const router = express.Router();

router.get('/facebook/auth-url', (req, res, next) => facebookController.getAuthUrl(req, res, next));
router.get('/facebook/exchange-token', (req, res, next) => facebookController.exchangeToken(req, res, next));
router.post('/facebook/post-video', upload.single('video'), (req, res, next) => facebookController.postVideo(req, res, next));
router.post('/facebook/post-feed', upload.single('image'), (req, res, next) => facebookController.postFeed(req, res, next));

module.exports = router;
