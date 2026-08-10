const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class FacebookService {
  getAuthUrl() {
    const appId = process.env.FACEBOOK_APP_ID;
    const redirectUri = encodeURIComponent(process.env.FACEBOOK_REDIRECT_URI);
    const scope = encodeURIComponent('email,public_profile,pages_show_list,pages_read_engagement,pages_manage_posts');
    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}`;
  }

  async exchangeToken(shortLivedToken) {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    const response = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken,
      },
    });

    return {
      accessToken: response.data.access_token,
      tokenType: response.data.token_type,
      expiresIn: response.data.expires_in,
    };
  }

  async postVideo({ videoFile, accessToken, description, hashtags, title }) {
    try {
      let fullDescription = description || '';
      if (hashtags && hashtags.trim().length > 0) {
        fullDescription += `\n\n${hashtags.trim()}`;
      }

      // Use provided token, or fall back to system Page Access Token from .env
      let effectiveToken = (accessToken && accessToken.trim().length > 10)
        ? accessToken.trim()
        : process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

      let targetId = process.env.FACEBOOK_PAGE_ID || '61592673825106';

      // Check if effectiveToken exists
      if (!effectiveToken) {
        const customError = new Error('No Facebook Access Token provided. Please enter an Access Token or configure FACEBOOK_PAGE_ACCESS_TOKEN in backend/.env');
        customError.statusCode = 400;
        customError.isTokenExpired = true;
        customError.solution = 'Paste a valid Facebook Access Token into the app field or set FACEBOOK_PAGE_ACCESS_TOKEN in backend/.env';
        throw customError;
      }

      try {
        const meRes = await axios.get(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${effectiveToken}`);
        if (meRes.data && meRes.data.id) {
          console.log(`[FACEBOOK ACCOUNT DETECTED]: ${meRes.data.name} (ID: ${meRes.data.id})`);

          // Check if user token manages any Pages (e.g. My App Tester page)
          try {
            const accountsRes = await axios.get(`https://graph.facebook.com/v19.0/me/accounts?access_token=${effectiveToken}`);
            if (accountsRes.data && accountsRes.data.data && accountsRes.data.data.length > 0) {
              const targetPage = accountsRes.data.data[0];
              targetId = targetPage.id;
              if (targetPage.access_token) {
                effectiveToken = targetPage.access_token;
              }
              console.log(`[FACEBOOK AUTO-PAGE RESOLVED]: Page -> ${targetPage.name} (ID: ${targetId})`);
            }
          } catch (accErr) {
            console.log(`[FACEBOOK PAGE TARGET]: Using Page ID -> ${targetId}`);
          }
        }
      } catch (meErr) {
        if (accessToken && process.env.FACEBOOK_PAGE_ACCESS_TOKEN && accessToken.trim() !== process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
          console.log('[FACEBOOK FALLBACK]: Retrying with system FACEBOOK_PAGE_ACCESS_TOKEN from .env...');
          effectiveToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
          targetId = process.env.FACEBOOK_PAGE_ID || '61592673825106';
        }
      }

      const formData = new FormData();
      formData.append('access_token', effectiveToken);
      formData.append('description', fullDescription);
      if (title) formData.append('title', title);
      formData.append('source', fs.createReadStream(videoFile.path));

      console.log(`[FACEBOOK POSTING]: Uploading video to https://graph-video.facebook.com/v19.0/${targetId}/videos ...`);

      const response = await axios.post(
        `https://graph-video.facebook.com/v19.0/${targetId}/videos`,
        formData,
        { headers: formData.getHeaders() }
      );

      // Clean temp file
      if (fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);

      console.log('[FACEBOOK POST SUCCESS]: Video ID ->', response.data.id);

      return {
        videoId: response.data.id,
        facebookPostUrl: `https://www.facebook.com/${response.data.id}`,
      };
    } catch (err) {
      // Clean temp file
      if (videoFile && fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);

      const fbError = err.response && err.response.data && err.response.data.error
        ? err.response.data.error
        : null;

      const errorMessage = fbError ? fbError.message : err.message;
      const isTokenExpired = fbError && (fbError.code === 190 || (errorMessage && (errorMessage.includes('Session has expired') || errorMessage.includes('invalid_token'))));
      const isPermissionError = fbError && (fbError.code === 100 || (errorMessage && (errorMessage.includes('permission') || errorMessage.includes('allowed'))));

      console.error('[FACEBOOK POST ERROR]:', errorMessage);

      let userFriendlyError = 'Failed to post video to Facebook';
      let solutionHint;

      if (isTokenExpired) {
        userFriendlyError = 'Facebook Access Token Expired or Invalid';
        solutionHint = 'Please copy a fresh Access Token from Facebook Graph API Explorer and paste it into the app.';
      } else if (isPermissionError) {
        userFriendlyError = 'Facebook Permission Error';
        solutionHint = `Facebook returned: "${errorMessage}".\n\nNote: In modern Graph API (v19.0+), video publishing requires a Page Access Token authorized with "pages_manage_posts" and "pages_read_engagement" permissions for your Facebook Page.`;
      } else {
        solutionHint = errorMessage;
      }

      const customError = new Error(errorMessage || userFriendlyError);
      customError.statusCode = 400;
      customError.isTokenExpired = isTokenExpired;
      customError.isPermissionError = isPermissionError;
      customError.solution = solutionHint;
      throw customError;
    }
  }

  async postFeed({ imageFile, accessToken, description, hashtags }) {
    try {
      let fullMessage = description || '';
      if (hashtags && hashtags.trim().length > 0) {
        fullMessage += (fullMessage ? `\n\n${hashtags.trim()}` : hashtags.trim());
      }

      let effectiveToken = (accessToken && accessToken.trim().length > 10)
        ? accessToken.trim()
        : process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

      let targetId = process.env.FACEBOOK_PAGE_ID || '61592673825106';

      if (!effectiveToken) {
        const customError = new Error('No Facebook Access Token provided. Please enter an Access Token or configure FACEBOOK_PAGE_ACCESS_TOKEN in backend/.env');
        customError.statusCode = 400;
        customError.isTokenExpired = true;
        customError.solution = 'Paste a valid Page Access Token into the app field or set FACEBOOK_PAGE_ACCESS_TOKEN in backend/.env';
        throw customError;
      }

      try {
        const meRes = await axios.get(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${effectiveToken}`);
        if (meRes.data && meRes.data.id) {
          console.log(`[FACEBOOK ACCOUNT DETECTED]: ${meRes.data.name} (ID: ${meRes.data.id})`);
          try {
            const accountsRes = await axios.get(`https://graph.facebook.com/v19.0/me/accounts?access_token=${effectiveToken}`);
            if (accountsRes.data && accountsRes.data.data && accountsRes.data.data.length > 0) {
              const targetPage = accountsRes.data.data[0];
              targetId = targetPage.id;
              if (targetPage.access_token) {
                effectiveToken = targetPage.access_token;
              }
              console.log(`[FACEBOOK AUTO-PAGE RESOLVED]: Page -> ${targetPage.name} (ID: ${targetId})`);
            }
          } catch (accErr) {
            console.log(`[FACEBOOK PAGE TARGET]: Using Page ID -> ${targetId}`);
          }
        }
      } catch (meErr) {
        if (accessToken && process.env.FACEBOOK_PAGE_ACCESS_TOKEN && accessToken.trim() !== process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
          console.log('[FACEBOOK FALLBACK]: Retrying with system FACEBOOK_PAGE_ACCESS_TOKEN from .env...');
          effectiveToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
          targetId = process.env.FACEBOOK_PAGE_ID || '61592673825106';
        }
      }

      let response;
      if (imageFile) {
        const formData = new FormData();
        formData.append('access_token', effectiveToken);
        formData.append('caption', fullMessage);
        formData.append('source', fs.createReadStream(imageFile.path));

        console.log(`[FACEBOOK POSTING]: Uploading photo to https://graph.facebook.com/v19.0/${targetId}/photos ...`);

        response = await axios.post(
          `https://graph.facebook.com/v19.0/${targetId}/photos`,
          formData,
          { headers: formData.getHeaders() }
        );

        if (fs.existsSync(imageFile.path)) fs.unlinkSync(imageFile.path);
      } else {
        console.log(`[FACEBOOK POSTING]: Creating text post at https://graph.facebook.com/v19.0/${targetId}/feed ...`);

        response = await axios.post(
          `https://graph.facebook.com/v19.0/${targetId}/feed`,
          {
            message: fullMessage,
            access_token: effectiveToken,
          }
        );
      }

      const postId = response.data.id || response.data.post_id;
      console.log('[FACEBOOK POST SUCCESS]: Post ID ->', postId);

      return {
        postId: postId,
        facebookPostUrl: `https://www.facebook.com/${postId}`,
      };
    } catch (err) {
      if (imageFile && fs.existsSync(imageFile.path)) fs.unlinkSync(imageFile.path);

      const fbError = err.response && err.response.data && err.response.data.error
        ? err.response.data.error
        : null;

      const errorMessage = fbError ? fbError.message : err.message;
      const isTokenExpired = fbError && (fbError.code === 190 || (errorMessage && (errorMessage.includes('Session has expired') || errorMessage.includes('invalid_token'))));
      const isPermissionError = fbError && (fbError.code === 100 || (errorMessage && (errorMessage.includes('permission') || errorMessage.includes('allowed'))));

      console.error('[FACEBOOK POST ERROR]:', errorMessage);

      let userFriendlyError = 'Failed to post feed update to Facebook';
      let solutionHint;

      if (isTokenExpired) {
        userFriendlyError = 'Facebook Access Token Expired or Invalid';
        solutionHint = 'Please copy a fresh Page Access Token from Facebook Graph API Explorer and paste it into the app.';
      } else if (isPermissionError) {
        userFriendlyError = 'Facebook Permission Error';
        solutionHint = `Facebook returned: "${errorMessage}".\n\nNote: In modern Graph API (v19.0+), publishing to Facebook Page requires a Page Access Token authorized with "pages_manage_posts" and "pages_read_engagement" permissions for your Facebook Page.`;
      } else {
        solutionHint = errorMessage;
      }

      const customError = new Error(errorMessage || userFriendlyError);
      customError.statusCode = 400;
      customError.isTokenExpired = isTokenExpired;
      customError.isPermissionError = isPermissionError;
      customError.solution = solutionHint;
      throw customError;
    }
  }
}

module.exports = new FacebookService();
