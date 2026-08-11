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
      const customError = new Error('GEMINI_API_KEY is not configured in backend/.env');
      customError.statusCode = 400;
      throw customError;
    }

    const promptText = `
You are a top-tier viral social media strategist and AI content creator.
Generate optimized video metadata and a visual thumbnail concept for topic: "${topic}" tailored for platform: "${platform}".

PERFORM A SINGLE-HIT GENERATION and return ONLY a valid raw JSON object (no markdown, no backticks) with these exact keys:
1. "title": Catchy, high-CTR, SEO-optimized title (under 70 chars).
2. "description": Engaging multi-paragraph description summarizing the topic.
3. "hashtags": 5-8 trending, relevant hashtags formatted as a single string (e.g. "#Flutter #Coding #Viral #Tech").
4. "thumbnailTitle": Bold 2-4 word headline text for the video thumbnail banner (e.g. "BUILD APPS FAST").
5. "thumbnailSubtitle": Secondary subtitle text for the thumbnail (e.g. "Complete 2026 Guide").
6. "thumbnailBgColor": Primary hex color for thumbnail background (e.g. "#FF0000" or "#1E293B" or "#0F172A").
7. "thumbnailTextColor": Accent text hex color (e.g. "#FFFFFF" or "#FACC15").
`;

    try {
      const modelCandidates = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash-latest'];
      let responseText = null;
      let lastError = null;

      for (const model of modelCandidates) {
        try {
          console.log(`[GEMINI AI SINGLE-HIT]: Requesting model "${model}" for topic "${topic}"...`);
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
            console.log(`[GEMINI AI SUCCESS]: Model "${model}" responded successfully!`);
            break;
          }
        } catch (err) {
          lastError = err;
          console.warn(`[GEMINI MODEL RETRY]: Model "${model}" failed:`, err.response?.data?.error?.message || err.message);
        }
      }

      if (!responseText) {
        console.warn('[GEMINI API FALLBACK]: All model candidates failed, generating fallback AI metadata');
        const fallbackTitle = topic.length > 5 ? topic : 'Viral Video Showcase';
        parsedData = {
          title: `${fallbackTitle} - Complete Guide 2026`,
          description: `Discover everything about ${fallbackTitle} in this full video guide. Learn the key insights, step-by-step techniques, and top tips to succeed.`,
          hashtags: `#${fallbackTitle.replace(/[^a-zA-Z0-9]/g, '')} #Viral #Trending #Tutorial`,
          thumbnailTitle: fallbackTitle.toUpperCase().slice(0, 20),
          thumbnailSubtitle: 'Watch Full Video',
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
            title: `${topic} - Complete Guide`,
            description: responseText.slice(0, 300),
            hashtags: '#Viral #Trending #SocialMedia',
            thumbnailTitle: topic.toUpperCase().slice(0, 20),
            thumbnailSubtitle: 'Watch Now',
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
  <text x="240" y="153" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#000" text-anchor="middle">OFFICIAL TUTORIAL</text>

  <!-- Title Text -->
  <text x="100" y="290" font-family="Impact, Arial, sans-serif" font-size="76" font-weight="900" fill="#FFFFFF" filter="url(#shadow)">${this.escapeXml(thumbnailTitle)}</text>

  <!-- Subtitle Text -->
  <text x="100" y="380" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="${thumbnailTextColor}" filter="url(#shadow)">${this.escapeXml(thumbnailSubtitle)}</text>

  <!-- Play Button Icon Container -->
  <g transform="translate(1000, 480)" filter="url(#shadow)">
    <circle cx="0" cy="0" r="80" fill="#FF0000"/>
    <polygon points="-20,-35 40,0 -20,35" fill="#FFFFFF"/>
  </g>

  <!-- Footer Tag -->
  <text x="100" y="600" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#94A3B8">AI GENERATED • HIGH QUALITY</text>
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
