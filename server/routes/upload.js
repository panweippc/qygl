import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createOperationLog, getOperator } from '../utils/audit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 白名单扩展名（禁止可执行/可解析脚本：html/svg/js/css等）
const ALLOWED_EXTS = new Set(['jpeg', 'jpg', 'png', 'gif', 'bmp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'xlsm']);

// 文件魔数校验（真实文件类型）
const MAGIC_CHECK = (buf, ext) => {
  if (!buf || buf.length < 8) return false;
  const b = buf;
  const isGif = b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38;
  const isPng = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
  const isJpeg = b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
  const isBmp = b[0] === 0x42 && b[1] === 0x4D;
  const isPdf = b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
  const isZip = b[0] === 0x50 && b[1] === 0x4B && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07); // docx/xlsx/pptx 是 zip
  switch (ext) {
    case 'jpg': case 'jpeg': return isJpeg;
    case 'png': return isPng;
    case 'gif': return isGif;
    case 'bmp': return isBmp;
    case 'pdf': return isPdf;
    case 'doc': case 'docx': case 'xls': case 'xlsx': case 'ppt': case 'pptx': case 'xlsm': return isZip;
    case 'txt': case 'md': return true; // 纯文本不校验魔数
    default: return false;
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    // 文件名：随机 UUID（不保留用户原始文件名，防路径穿越/覆盖）
    const name = file.originalname || '';
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
    const safeExt = ALLOWED_EXTS.has(ext) ? ext : '';
    cb(null, crypto.randomBytes(16).toString('hex') + (safeExt ? '.' + safeExt : ''));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const name = file.originalname || '';
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
    if (ALLOWED_EXTS.has(ext)) {
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
    const uploaderId = req.body.uploaderId ? parseInt(req.body.uploaderId) : null;
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '');

    const fileList = [];
    for (const f of files) {
      const url = '/uploads/' + f.filename;
      const ext = f.originalname?.includes('.') ? f.originalname.split('.').pop().toLowerCase() : '';

      // 魔数校验：读取文件头，确认真实文件类型与扩展名匹配，防止伪装文件（如 .png 的脚本）
      try {
        const filePath = path.join(__dirname, '../../uploads', f.filename);
        const fd = fs.openSync(filePath, 'r');
        const header = Buffer.alloc(8);
        fs.readSync(fd, header, 0, 8, 0);
        fs.closeSync(fd);
        if (!MAGIC_CHECK(header, ext)) {
          fs.unlinkSync(filePath); // 删除伪装文件
          console.error('拒绝上传：文件类型与扩展名不符', f.filename, ext);
          continue; // 跳过该文件
        }
      } catch (e) {
        // 读文件头失败则删除该文件，防止异常文件
        try { fs.unlinkSync(path.join(__dirname, '../../uploads', f.filename)); } catch (e2) {}
        continue;
      }

      const rawName = f.originalname || '';
      let originalName;
      if (rawName.includes('%')) {
        try {
          originalName = decodeURIComponent(rawName);
        } catch (e) {
          originalName = Buffer.from(rawName, 'latin1').toString('utf8');
        }
      } else {
        originalName = Buffer.from(rawName, 'latin1').toString('utf8');
      }
      await pool.execute(
        'INSERT INTO files (name, size, type, url, uploaderId, categoryId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [originalName, f.size, ext, url, uploaderId, categoryId, now]
      );
      fileList.push({ name: originalName, url, size: f.size });
    }
    // 审计：文件上传
    if (fileList.length > 0) {
      try {
        await createOperationLog(pool, {
          username: getOperator(req),
          action: 'upload',
          module: 'file',
          targetName: fileList[0].name + (fileList.length > 1 ? ` 等${fileList.length}个文件` : ''),
          detail: `上传文件${fileList.length}个`
        });
      } catch (e) { /* 日志失败不影响上传 */ }
    }
    res.json({ success: true, data: fileList });
  } catch (error) {
    console.error('上传文件失败:', error);
    res.status(500).json({ success: false, message: '上传失败' });
  }
});

// 附件下载（保持上传时的原始文件名，不预览直接下载）
router.get('/attachments/download', (req, res) => {
  try {
    const file = decodeURIComponent(req.query.file || '');
    const rawName = decodeURIComponent(req.query.name || '');
    const fileName = file.replace(/^\/uploads\//, '');
    if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return res.status(400).json({ success: false, message: '非法文件路径' });
    }
    const safeName = rawName.replace(/[\\/\r\n"]/g, '_') || fileName;
    const filePath = path.join(__dirname, '../../uploads', fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: '文件不存在' });
    }
    res.download(filePath, safeName);
  } catch (error) {
    console.error('附件下载失败:', error);
    res.status(500).json({ success: false, message: '下载失败' });
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
