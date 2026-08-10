const express = require('express');
const upload = require('../config/multer');
const youtubeController = require('../controllers/youtube.controller');

const router = express.Router();

router.get('/youtube/auth-url', (req, res, next) => youtubeController.getAuthUrl(req, res, next));
router.get('/youtube/oauth/callback', (req, res, next) => youtubeController.oauthCallback(req, res, next));
router.get('/youtube/channel', (req, res, next) => youtubeController.getChannelStatus(req, res, next));
router.post('/youtube/upload-video', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), (req, res, next) => youtubeController.uploadVideo(req, res, next));

module.exports = router;
