import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const name = file.originalname || '';
    const ext = name.includes('.') ? name.split('.').pop() : '';
    cb(null, uniqueSuffix + (ext ? '.' + ext : ''));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const name = file.originalname || '';
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
    const allowed = ['jpeg', 'jpg', 'png', 'gif', 'bmp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

const router = express.Router();

router.post('/upload', upload.array('file', 10), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: '请选择文件' });
    }
    const { pool } = req.app.locals;
    const categoryId = req.body.categoryId || null;
    const uploaderId = req.body.uploaderId || null;
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '');

    const fileList = [];
    for (const f of files) {
      const url = '/uploads/' + f.filename;
      const ext = f.originalname?.includes('.') ? f.originalname.split('.').pop().toLowerCase() : '';
      await pool.execute(
        'INSERT INTO files (name, size, type, url, uploaderId, categoryId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [f.originalname || '', f.size, ext, url, uploaderId, categoryId, now]
      );
      fileList.push({ name: f.originalname || '', url, size: f.size });
    }
    res.json({ success: true, data: fileList });
  } catch (error) {
    console.error('上传文件失败:', error);
    res.status(500).json({ success: false, message: '上传失败' });
  }
});

// multer 错误处理（文件类型不支持、大小超限等）
router.use((err, req, res, next) => {
  console.error('[upload error]', JSON.stringify({message: err.message, code: err.code, name: err.name, stack: err.stack?.split('\n')[0]}));
  const msg = err.message || '';
  if (msg.includes('不支持的文件类型')) {
    return res.status(400).json({ success: false, message: '不支持的文件类型' });
  }
  if (msg.includes('File too large') || err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: '文件大小不能超过50MB' });
  }
  res.status(500).json({ success: false, message: msg || '上传失败' });
});

export default router;
