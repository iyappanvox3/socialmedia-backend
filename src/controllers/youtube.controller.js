const youtubeService = require('../services/youtube.service');

class YoutubeController {
  getAuthUrl(req, res) {
    const { username } = req.query;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    
    const dynamicRedirectUri = process.env.GOOGLE_REDIRECT_URI && process.env.GOOGLE_REDIRECT_URI.trim().length > 0
      ? process.env.GOOGLE_REDIRECT_URI.trim()
      : `${protocol}://${host}/api/youtube/oauth/callback`;

    console.log(`[YOUTUBE AUTH URL]: Generated with redirectUri -> "${dynamicRedirectUri}"`);
    const url = youtubeService.getAuthUrl(username || 'User', dynamicRedirectUri);
    return res.json({ success: true, url });
  }

  async oauthCallback(req, res) {
    const { code, state: username } = req.query;

    if (!code) {
      return res.status(400).send('<h2>Authorization code is missing</h2>');
    }

    try {
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';

      const dynamicRedirectUri = process.env.GOOGLE_REDIRECT_URI && process.env.GOOGLE_REDIRECT_URI.trim().length > 0
        ? process.env.GOOGLE_REDIRECT_URI.trim()
        : `${protocol}://${host}/api/youtube/oauth/callback`;

      console.log(`[YOUTUBE OAUTH CALLBACK]: Exchanging code using redirectUri -> "${dynamicRedirectUri}"`);
      const result = await youtubeService.handleOAuthCallback(code, username || 'User', dynamicRedirectUri);
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>YouTube Connected</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 40px; background: #F8FAFC; }
            .card { background: white; max-width: 450px; margin: 0 auto; padding: 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
            h1 { color: #FF0000; margin-bottom: 10px; }
            p { color: #475569; font-size: 16px; }
            .btn { display: inline-block; margin-top: 20px; background: #FF0000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>YouTube Connected!</h1>
            <p>Your YouTube Channel <strong>"${result.channelTitle}"</strong> is now successfully connected to your account.</p>
            <p>You can close this window and return to your app to upload videos.</p>
          </div>
        </body>
        </html>
      `);
    } catch (err) {
      console.error('[YOUTUBE OAUTH CONTROLLER ERROR]:', err.message);
      return res.status(500).send(`<h2>YouTube OAuth Failed</h2><p>${err.message}</p>`);
    }
  }

  async getChannelStatus(req, res) {
    const username = req.query.username || req.body?.username || 'User';
    const result = await youtubeService.getConnectedChannel(username);
    return res.json(result);
  }

  async uploadVideo(req, res) {
    const { title, description, tags, privacyStatus, username, accessToken, autoGenerateAI, topic } = req.body;
    
    const videoFile = req.files && req.files.video ? req.files.video[0] : req.file;
    const thumbnailFile = req.files && req.files.thumbnail ? req.files.thumbnail[0] : null;

    if (!videoFile) {
      return res.status(400).json({ error: 'Please attach a video file to upload' });
    }

    try {
      const result = await youtubeService.uploadVideo({
        videoFile,
        thumbnailFile,
        title,
        description,
        tags,
        privacyStatus,
        username,
        accessToken,
        autoGenerateAI: autoGenerateAI === 'true' || autoGenerateAI === true,
        topic,
      });

      return res.json({
        success: true,
        message: 'Video uploaded to YouTube successfully!',
        videoId: result.videoId,
        youtubeVideoUrl: result.youtubeVideoUrl,
        title: result.title,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        error: err.message,
        isTokenMissing: err.isTokenMissing || false,
        isTokenExpired: err.isTokenExpired || false,
        solution: err.solution,
      });
    }
  }

  async initResumableUpload(req, res) {
    const { username, title, description, tags, privacyStatus, fileSize, mimeType, autoGenerateAI, topic } = req.body;
    try {
      const result = await youtubeService.initiateResumableUpload({
        username,
        title,
        description,
        tags,
        privacyStatus,
        fileSize,
        mimeType,
        autoGenerateAI: autoGenerateAI === 'true' || autoGenerateAI === true,
        topic,
      });

      return res.json({
        success: true,
        uploadUrl: result.uploadUrl,
        accessToken: result.accessToken,
        title: result.title,
        description: result.description,
        tags: result.tags,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        error: err.message,
        isTokenMissing: err.isTokenMissing || false,
        isTokenExpired: err.isTokenExpired || false,
        solution: err.solution,
      });
    }
  }
}

module.exports = new YoutubeController();
