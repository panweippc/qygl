import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const decodeFileName = (name) => {
  try { return decodeURIComponent(name); } catch { return name; }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const decodedName = decodeFileName(file.originalname);
    const ext = path.extname(decodedName);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const decodedName = decodeFileName(file.originalname);
    const allowedTypes = /jpeg|jpg|png|gif|bmp|pdf|doc|docx|xls|xlsx|ppt|pptx|txt/;
    const extname = allowedTypes.test(path.extname(decodedName).toLowerCase());
    if (extname) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

const router = express.Router();

router.post('/upload', upload.array('file', 10), (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: '请选择文件' });
    }
    const fileList = files.map(f => ({
      name: decodeFileName(f.originalname),
      url: '/uploads/' + f.filename,
      size: f.size
    }));
    res.json({ success: true, data: fileList });
  } catch (error) {
    console.error('上传文件失败:', error);
    res.status(500).json({ success: false, message: '上传失败' });
  }
});

export default router;
