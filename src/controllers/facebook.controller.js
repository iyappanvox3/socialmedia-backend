const facebookService = require('../services/facebook.service');

class FacebookController {
  getAuthUrl(req, res) {
    const url = facebookService.getAuthUrl();
    return res.json({ url });
  }

  async exchangeToken(req, res) {
    const { shortLivedToken } = req.query;

    if (!shortLivedToken) {
      return res.status(400).json({ error: 'shortLivedToken query parameter is required' });
    }

    try {
      const result = await facebookService.exchangeToken(shortLivedToken);
      return res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      const msg = err.response && err.response.data && err.response.data.error
        ? err.response.data.error.message
        : err.message;
      console.error('[FACEBOOK TOKEN EXCHANGE ERROR]:', msg);
      return res.status(400).json({ error: 'Failed to exchange Facebook token', details: msg });
    }
  }

  async postVideo(req, res) {
    const { accessToken, description, hashtags, title } = req.body;
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({ error: 'Please attach a video file to upload' });
    }

    if (!accessToken && !process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
      const fs = require('fs');
      if (fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
      return res.status(400).json({ error: 'Facebook Access Token is required to post video' });
    }

    try {
      const result = await facebookService.postVideo({
        videoFile,
        accessToken,
        description,
        hashtags,
        title,
      });

      return res.json({
        success: true,
        message: 'Video posted to Facebook successfully!',
        videoId: result.videoId,
        facebookPostUrl: result.facebookPostUrl,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        error: err.message,
        details: err.details,
        isTokenExpired: err.isTokenExpired || false,
        isPermissionError: err.isPermissionError || false,
        solution: err.solution,
      });
    }
  }

  async postFeed(req, res) {
    const { accessToken, description, hashtags } = req.body;
    const imageFile = req.file;

    if (!accessToken && !process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
      if (imageFile && require('fs').existsSync(imageFile.path)) {
        require('fs').unlinkSync(imageFile.path);
      }
      return res.status(400).json({ error: 'Facebook Access Token is required to post feed update' });
    }

    try {
      const result = await facebookService.postFeed({
        imageFile,
        accessToken,
        description,
        hashtags,
      });

      return res.json({
        success: true,
        message: 'Post published to Facebook successfully!',
        postId: result.postId,
        facebookPostUrl: result.facebookPostUrl,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        error: err.message,
        details: err.details,
        isTokenExpired: err.isTokenExpired || false,
        isPermissionError: err.isPermissionError || false,
        solution: err.solution,
      });
    }
  }
}

module.exports = new FacebookController();
