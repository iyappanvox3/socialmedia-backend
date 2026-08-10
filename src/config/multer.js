const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Use os.tmpdir() on Vercel/Serverless (since /var/task is read-only)
const uploadDir = process.env.VERCEL
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(__dirname, '../../uploads');

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn('[MULTER MKDIR WARNING]:', err.message);
}

const upload = multer({ dest: uploadDir });

module.exports = upload;
