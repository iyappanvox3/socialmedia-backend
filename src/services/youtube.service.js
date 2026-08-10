const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

// In-memory fallback token store if PostgreSQL is temporarily unreachable
const inMemoryTokenStore = new Map();

class YoutubeService {
  getOAuth2Client() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri ='https://socialmedia-backend-jkq6o5nz2-voxlom1.vercel.app/oauth/callback';

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  getAuthUrl(username = 'User') {
    const oauth2Client = this.getOAuth2Client();
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: username,
    });
  }

  async handleOAuthCallback(code, username = 'User') {
    try {
      const oauth2Client = this.getOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      let channelId = null;
      let channelTitle = null;

      try {
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        const channelRes = await youtube.channels.list({
          part: ['snippet'],
          mine: true,
        });

        if (channelRes.data.items && channelRes.data.items.length > 0) {
          const channel = channelRes.data.items[0];
          channelId = channel.id;
          channelTitle = channel.snippet.title;
        }
      } catch (chErr) {
        console.warn('[YOUTUBE CHANNEL FETCH WARNING]:', chErr.message);
      }

      // Save to PostgreSQL
      try {
        await pool.query(
          `INSERT INTO youtube_tokens (username, access_token, refresh_token, channel_id, channel_title, updated_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
           ON CONFLICT (username)
           DO UPDATE SET
             access_token = EXCLUDED.access_token,
             refresh_token = COALESCE(EXCLUDED.refresh_token, youtube_tokens.refresh_token),
             channel_id = EXCLUDED.channel_id,
             channel_title = EXCLUDED.channel_title,
             updated_at = CURRENT_TIMESTAMP;`,
          [username, tokens.access_token, tokens.refresh_token || null, channelId, channelTitle]
        );
      } catch (dbErr) {
        console.warn('[DB TOKEN SAVE WARNING]: Using in-memory fallback:', dbErr.message);
      }

      // In-memory fallback
      inMemoryTokenStore.set(username, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        channelId,
        channelTitle,
      });

      console.log(`[YOUTUBE OAUTH SUCCESS]: Connected Channel "${channelTitle || channelId || 'Connected Channel'}" for user "${username}"`);

      return {
        success: true,
        username,
        channelId,
        channelTitle: channelTitle || 'Connected YouTube Channel',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      };
    } catch (err) {
      console.error('[YOUTUBE OAUTH CALLBACK ERROR]:', err.message);
      throw new Error(`Failed to exchange YouTube authorization code: ${err.message}`);
    }
  }

  async getConnectedChannel(username = 'User') {
    try {
      let tokenData = null;

      try {
        const res = await pool.query(
          'SELECT access_token, refresh_token, channel_id, channel_title FROM youtube_tokens WHERE username = $1',
          [username]
        );
        if (res.rows.length > 0) {
          tokenData = res.rows[0];
        }
      } catch (dbErr) {
        tokenData = inMemoryTokenStore.get(username);
      }

      if (!tokenData && inMemoryTokenStore.has(username)) {
        tokenData = inMemoryTokenStore.get(username);
      }

      if (tokenData && (tokenData.access_token || tokenData.accessToken)) {
        return {
          isConnected: true,
          channelId: tokenData.channel_id || tokenData.channelId || 'YouTube Channel',
          channelTitle: tokenData.channel_title || tokenData.channelTitle || 'Connected YouTube Channel',
        };
      }

      return {
        isConnected: false,
        message: 'No YouTube channel connected yet. Please connect your Google/YouTube account.',
      };
    } catch (err) {
      return { isConnected: false, error: err.message };
    }
  }

  async uploadVideo({ videoFile, thumbnailFile, title, description, tags, privacyStatus, username = 'User', accessToken, autoGenerateAI = false, topic }) {
    try {
      const geminiService = require('./gemini.service');

      let effectiveTitle = title;
      let effectiveDescription = description;
      let effectiveTags = tags;
      let effectiveThumbnailPath = thumbnailFile ? thumbnailFile.path : null;
      let autoCleanTempThumbnail = false;

      // 1-Tap AI Background Auto-Generation
      if (autoGenerateAI === true || autoGenerateAI === 'true' || (!title && !description)) {
        try {
          const promptTopic = topic || (title && title.trim().length > 0 ? title : path.basename(videoFile.originalname, path.extname(videoFile.originalname)));
          console.log(`[AI AUTO-PILOT]: Auto-generating metadata & thumbnail for topic "${promptTopic}"...`);
          
          const aiResult = await geminiService.generateAllInOne({ topic: promptTopic, platform: 'YouTube' });
          
          effectiveTitle = aiResult.title;
          effectiveDescription = `${aiResult.description}\n\n${aiResult.hashtags}`;
          effectiveTags = aiResult.hashtags.replace(/#/g, '').replace(/\s+/g, ',');

          // Save AI thumbnail SVG to temp file if no thumbnail file was manually uploaded
          if (!effectiveThumbnailPath && aiResult.thumbnailSvg) {
            const tempThumbPath = path.join(__dirname, `../../temp_ai_thumb_${Date.now()}.svg`);
            fs.writeFileSync(tempThumbPath, aiResult.thumbnailSvg);
            effectiveThumbnailPath = tempThumbPath;
            autoCleanTempThumbnail = true;
          }
        } catch (aiErr) {
          console.warn('[AI AUTO-PILOT FALLBACK]: AI generation failed, proceeding with defaults:', aiErr.message);
          if (!effectiveTitle) effectiveTitle = path.basename(videoFile.originalname, path.extname(videoFile.originalname));
        }
      }

      let effectiveAccessToken = accessToken;
      let effectiveRefreshToken = null;

      if (!effectiveAccessToken || effectiveAccessToken.trim().length < 10) {
        // Fetch from DB
        try {
          const res = await pool.query(
            'SELECT access_token, refresh_token FROM youtube_tokens WHERE username = $1',
            [username]
          );
          if (res.rows.length > 0) {
            effectiveAccessToken = res.rows[0].access_token;
            effectiveRefreshToken = res.rows[0].refresh_token;
          }
        } catch (dbErr) {
          const mem = inMemoryTokenStore.get(username);
          if (mem) {
            effectiveAccessToken = mem.accessToken;
            effectiveRefreshToken = mem.refreshToken;
          }
        }
      }

      if (!effectiveAccessToken && inMemoryTokenStore.has(username)) {
        const mem = inMemoryTokenStore.get(username);
        effectiveAccessToken = mem.accessToken;
        effectiveRefreshToken = mem.refreshToken;
      }

      if (!effectiveAccessToken) {
        const customError = new Error('No YouTube Access Token found. Please connect your YouTube account using Google OAuth first.');
        customError.statusCode = 401;
        customError.isTokenMissing = true;
        customError.solution = 'Tap "Connect YouTube Channel" to log in with your Google account and grant YouTube permissions.';
        throw customError;
      }

      const oauth2Client = this.getOAuth2Client();
      oauth2Client.setCredentials({
        access_token: effectiveAccessToken,
        refresh_token: effectiveRefreshToken || undefined,
      });

      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

      const parsedTags = effectiveTags
        ? (Array.isArray(effectiveTags) ? effectiveTags : effectiveTags.split(',').map(t => t.trim()))
        : [];

      console.log(`[YOUTUBE UPLOADING]: Uploading video "${effectiveTitle || 'Untitled Video'}" to YouTube...`);

      const res = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: effectiveTitle || 'New Video Post',
            description: effectiveDescription || '',
            tags: parsedTags,
            categoryId: '22', // People & Blogs default category
          },
          status: {
            privacyStatus: privacyStatus || 'public', // 'public', 'unlisted', 'private'
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: fs.createReadStream(videoFile.path),
        },
      });

      // Clean temp video file
      if (fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);

      const videoId = res.data.id;
      const youtubeVideoUrl = `https://youtu.be/${videoId}`;

      console.log('[YOUTUBE UPLOAD SUCCESS]: Video ID ->', videoId);

      // Upload custom AI thumbnail if provided or auto-generated
      if (effectiveThumbnailPath && fs.existsSync(effectiveThumbnailPath)) {
        try {
          console.log(`[YOUTUBE THUMBNAIL]: Uploading AI thumbnail for video ID ${videoId}...`);
          await youtube.thumbnails.set({
            videoId: videoId,
            media: {
              body: fs.createReadStream(effectiveThumbnailPath),
            },
          });
          console.log('[YOUTUBE THUMBNAIL SUCCESS]: Thumbnail updated successfully!');
        } catch (thumbErr) {
          console.warn('[YOUTUBE THUMBNAIL WARNING]: Thumbnail set failed:', thumbErr.message);
        } finally {
          if (autoCleanTempThumbnail && fs.existsSync(effectiveThumbnailPath)) {
            fs.unlinkSync(effectiveThumbnailPath);
          } else if (thumbnailFile && fs.existsSync(thumbnailFile.path)) {
            fs.unlinkSync(thumbnailFile.path);
          }
        }
      }

      return {
        videoId,
        youtubeVideoUrl,
        title: res.data.snippet?.title || title,
      };
    } catch (err) {
      if (videoFile && fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
      if (thumbnailFile && fs.existsSync(thumbnailFile.path)) fs.unlinkSync(thumbnailFile.path);

      console.error('[YOUTUBE UPLOAD ERROR]:', err.message);

      const isTokenExpired = err.message && (err.message.includes('invalid_grant') || err.message.includes('Invalid Credentials') || err.code === 401);

      const customError = new Error(err.message || 'Failed to upload video to YouTube');
      customError.statusCode = err.code || 400;
      customError.isTokenExpired = isTokenExpired;
      customError.solution = isTokenExpired
        ? 'Your YouTube session expired. Please tap "Connect YouTube Channel" to sign in again.'
        : err.message;
      throw customError;
    }
  }
}

module.exports = new YoutubeService();
