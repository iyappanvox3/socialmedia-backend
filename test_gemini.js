require('dotenv').config();
const axios = require('axios');
const apiKey = process.env.GEMINI_API_KEY || process.env.YOUTUBE_API_KEY;

const models = ['gemini-flash-latest', 'gemini-1.5-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash-lite'];

async function testAll() {
  for (const m of models) {
    try {
      console.log('Testing model:', m);
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: 'Respond with valid JSON: {"title": "Flutter App Tutorial", "hashtags": "#flutter #coding"}' }] }],
          generationConfig: { responseMimeType: 'application/json' }
        }
      );
      console.log(`✅ SUCCESS WITH MODEL "${m}":`, res.data.candidates[0].content.parts[0].text);
      return;
    } catch (err) {
      console.error(`❌ FAILED WITH MODEL "${m}":`, err.response?.data?.error?.message || err.message);
    }
  }
}

testAll();
