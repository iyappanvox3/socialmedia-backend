require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class GeminiService {
  getApiKey() {
    return process.env.GEMINI_API_KEY || process.env.YOUTUBE_API_KEY;
  }

  async generateAllInOne({ topic, platform = 'YouTube' }) {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      console.warn('[GEMINI API WARNING]: GEMINI_API_KEY is missing, generating fallback Tamil AI metadata');
      const fallbackTitle = topic && topic.length > 3 ? topic : 'பிரபலமான வீடியோ';
      return {
        success: true,
        title: `${fallbackTitle} - தமிழ் முழு விளக்கம் 2026`,
        description: `${fallbackTitle} பற்றிய அனைத்து முக்கியமான தகவல்களையும் இந்த வீடியோவில் விரிவாகக் காணலாம். சிறந்த குறிப்புகள் மற்றும் தகவல்கள் சேர்க்கப்பட்டுள்ளன.`,
        hashtags: `#${fallbackTitle.replace(/[^a-zA-Z0-9]/g, '')} #தமிழ் #Tamil #Viral #Trending`,
        thumbnailTitle: 'தமிழ் விளக்கம்',
        thumbnailSubtitle: 'முழு தகவல் 2026',
        thumbnailBgColor: '#0F172A',
        thumbnailTextColor: '#FACC15',
        thumbnailSvg: this.generateSvgThumbnail('தமிழ் விளக்கம்', 'முழு தகவல் 2026', '#0F172A', '#FACC15'),
      };
    }

    const promptText = `
You are a top-tier viral social media strategist specializing in Tamil (தமிழ்) digital content creation.
Analyze the video topic: "${topic}" for platform: "${platform}".

PERFORM A SINGLE-HIT GENERATION and return ONLY a valid raw JSON object (no markdown, no backticks) with these exact keys:
1. "title": Catchy, high-CTR, SEO-optimized title strictly in TAMIL (தமிழ்) language (under 70 chars, e.g. "நதி நீர் இணைப்பு திட்ட உண்மையின் பின்னணி").
2. "description": Engaging multi-paragraph description strictly in TAMIL (தமிழ்) language summarizing the topic for Tamil audience.
3. "hashtags": 5-8 trending hashtags including Tamil and English tags (e.g. "#தமிழ் #Tamil #Viral #Trending #Video").
4. "thumbnailTitle": Bold 2-4 word headline text in TAMIL (தமிழ்) script for the thumbnail banner (e.g. "முழுமையான விளக்கம்").
5. "thumbnailSubtitle": Secondary subtitle text in Tamil or English (e.g. "முழு தகவல் 2026").
6. "thumbnailBgColor": Primary hex color for thumbnail background (e.g. "#0F172A" or "#FF0000" or "#1E1B4B").
7. "thumbnailTextColor": Accent text hex color (e.g. "#FACC15" or "#FFFFFF").
`;

    try {
      const modelCandidates = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash-latest'];
      let responseText = null;
      let lastError = null;
      let parsedData = null;

      for (const model of modelCandidates) {
        try {
          console.log(`[GEMINI AI TAMIL SINGLE-HIT]: Requesting model "${model}" for topic "${topic}"...`);
          const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              contents: [
                {
                  parts: [{ text: promptText }]
                }
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.7
              }
            },
            { headers: { 'Content-Type': 'application/json' } }
          );

          responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (responseText) {
            console.log(`[GEMINI AI SUCCESS]: Model "${model}" responded with Tamil content successfully!`);
            break;
          }
        } catch (err) {
          lastError = err;
          console.warn(`[GEMINI MODEL RETRY]: Model "${model}" failed:`, err.response?.data?.error?.message || err.message);
        }
      }

      if (!responseText) {
        console.warn('[GEMINI API FALLBACK]: All model candidates failed, generating fallback Tamil AI metadata');
        const fallbackTitle = topic.length > 3 ? topic : 'பிரபலமான வீடியோ';
        parsedData = {
          title: `${fallbackTitle} - தமிழ் முழு விளக்கம் 2026`,
          description: `${fallbackTitle} பற்றிய அனைத்து முக்கியமான தகவல்களையும் இந்த வீடியோவில் விரிவாகக் காணலாம். சிறந்த குறிப்புகள் மற்றும் தகவல்கள் சேர்க்கப்பட்டுள்ளன.`,
          hashtags: `#${fallbackTitle.replace(/[^a-zA-Z0-9]/g, '')} #தமிழ் #Tamil #Viral #Trending`,
          thumbnailTitle: 'தமிழ் விளக்கம்',
          thumbnailSubtitle: 'முழு தகவல் 2026',
          thumbnailBgColor: '#0F172A',
          thumbnailTextColor: '#FACC15'
        };
      } else {
        try {
          const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          parsedData = JSON.parse(cleanedText);
        } catch (jsonErr) {
          console.warn('[GEMINI JSON PARSE FALLBACK]: Parsing failed, using raw response');
          parsedData = {
            title: `${topic} - தமிழ் விளக்கம்`,
            description: responseText.slice(0, 300),
            hashtags: '#தமிழ் #Tamil #Trending #SocialMedia',
            thumbnailTitle: 'தமிழ் விளக்கம்',
            thumbnailSubtitle: 'இப்போதே பாருங்கள்',
            thumbnailBgColor: '#1877F2',
            thumbnailTextColor: '#FFFFFF'
          };
        }
      }

      const {
        title = `${topic} Tutorial`,
        description = `Learn everything about ${topic}.`,
        hashtags = `#${topic.replace(/\s+/g, '')} #Viral`,
        thumbnailTitle = topic.toUpperCase(),
        thumbnailSubtitle = 'Watch Full Video',
        thumbnailBgColor = '#0F172A',
        thumbnailTextColor = '#FACC15'
      } = parsedData;

      // Generate SVG Thumbnail Graphic
      const svgThumbnail = `
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${thumbnailBgColor}"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="4" dy="8" stdDeviation="6" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>
  <!-- Background -->
  <rect width="1280" height="720" fill="url(#bg)"/>
  
  <!-- Decorative Grid & Accent Circles -->
  <circle cx="1100" cy="150" r="250" fill="${thumbnailTextColor}" opacity="0.15"/>
  <circle cx="200" cy="600" r="180" fill="#1877F2" opacity="0.2"/>
  <rect x="60" y="60" width="1160" height="600" rx="30" fill="none" stroke="${thumbnailTextColor}" stroke-width="4" opacity="0.4"/>

  <!-- Badge Header -->
  <rect x="100" y="120" width="280" height="50" rx="25" fill="${thumbnailTextColor}"/>
  <text x="240" y="153" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Noto Sans Tamil, Latha, Arial, sans-serif" font-size="22" font-weight="bold" fill="#000" text-anchor="middle">சிறப்பு வீடியோ</text>

  <!-- Title Text -->
  <text x="100" y="290" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Noto Sans Tamil, Latha, Arial, sans-serif" font-size="64" font-weight="900" fill="#FFFFFF" filter="url(#shadow)">${this.escapeXml(thumbnailTitle)}</text>

  <!-- Subtitle Text -->
  <text x="100" y="380" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Noto Sans Tamil, Latha, Arial, sans-serif" font-size="40" font-weight="bold" fill="${thumbnailTextColor}" filter="url(#shadow)">${this.escapeXml(thumbnailSubtitle)}</text>

  <!-- Play Button Icon Container -->
  <g transform="translate(1000, 480)" filter="url(#shadow)">
    <circle cx="0" cy="0" r="80" fill="#FF0000"/>
    <polygon points="-20,-35 40,0 -20,35" fill="#FFFFFF"/>
  </g>

  <!-- Footer Tag -->
  <text x="100" y="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Noto Sans Tamil, Latha, Arial, sans-serif" font-size="26" font-weight="bold" fill="#94A3B8">AI உருவாக்கம் • தமிழ்</text>
</svg>
`.trim();

      const thumbnailBase64 = Buffer.from(svgThumbnail).toString('base64');
      const thumbnailDataUrl = `data:image/svg+xml;base64,${thumbnailBase64}`;

      console.log('[GEMINI AI SUCCESS]: Single-hit content generation completed!');

      return {
        success: true,
        title,
        description,
        hashtags,
        thumbnailTitle,
        thumbnailSubtitle,
        thumbnailDataUrl,
        thumbnailSvg: svgThumbnail,
      };
    } catch (err) {
      console.error('[GEMINI API ERROR]:', err.response?.data || err.message);
      const msg = err.response?.data?.error?.message || err.message;
      const customError = new Error(`Gemini AI Generation Failed: ${msg}`);
      customError.statusCode = 400;
      throw customError;
    }
  }

  escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

module.exports = new GeminiService();
