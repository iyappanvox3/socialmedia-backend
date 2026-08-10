const geminiService = require('../services/gemini.service');

class GeminiController {
  async generateAll(req, res) {
    const { topic, platform } = req.body;

    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({ error: 'Topic or keyword prompt is required for AI generation.' });
    }

    try {
      const result = await geminiService.generateAllInOne({
        topic: topic.trim(),
        platform: platform || 'YouTube',
      });

      return res.json(result);
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }
}

module.exports = new GeminiController();
