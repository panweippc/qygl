import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createOperationLog, getOperator } from '../utils/audit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 文件分组白名单（取代原单一 ALLOWED_EXTS）
 * - 每组独立大小上限与预览策略；汇总上限用于 multer 全局限制
 * - 代码/文本类允许在线查看（前端以纯文本取回后高亮，绝不执行）
 * - 压缩包/安装包/二进制类禁止内联渲染，只能下载
 */
const FILE_GROUPS = {
  image: {
    label: '图片', max: 20 * 1024 * 1024, preview: 'image',
    exts: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
  },
  doc: {
    label: '文档', max: 50 * 1024 * 1024, preview: 'doc',
    exts: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'xlsm', 'csv']
  },
  code: {
    label: '代码/配置', max: 5 * 1024 * 1024, preview: 'code',
    exts: ['js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx', 'vue', 'py', 'java', 'go', 'c', 'cpp', 'h', 'hpp',
      'cs', 'php', 'rb', 'rs', 'kt', 'swift', 'sql', 'json', 'yaml', 'yml', 'xml', 'sh', 'bash',
      'html', 'htm', 'css', 'scss', 'less', 'ini', 'properties', 'gradle', 'conf', 'log', 'dockerfile', 'gitignore']
  },
  archive: {
    label: '压缩包/安装包', max: 2 * 1024 * 1024 * 1024, preview: 'none',
    exts: ['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz', 'exe', 'msi', 'dmg', 'pkg',
      'apk', 'ipa', 'deb', 'rpm', 'iso', 'jar', 'war']
  },
  media: {
    label: '音视频', max: 2 * 1024 * 1024 * 1024, preview: 'media',
    exts: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'mp3', 'wav', 'flac', 'm4a', 'ogg']
  }
};

// 扩展名 -> { group, ext } 反查表
const EXT_INDEX = new Map();
for (const [group, cfg] of Object.entries(FILE_GROUPS)) {
  for (const ext of cfg.exts) EXT_INDEX.set(ext, { group, ext });
}
const ALLOWED_EXTS = new Set(EXT_INDEX.keys());
const MAX_UPLOAD_SIZE = Math.max(...Object.values(FILE_GROUPS).map(g => g.max));

// 常见 MIME 映射（用于静态服务响应头与前端预览分派）
const MIME_MAP = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  bmp: 'image/bmp', webp: 'image/webp',
  pdf: 'application/pdf',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain', md: 'text/markdown', csv: 'text/csv', log: 'text/plain',
  zip: 'application/zip', rar: 'application/vnd.rar', '7z': 'application/x-7z-compressed',
  gz: 'application/gzip', tgz: 'application/gzip', tar: 'application/x-tar',
  bz2: 'application/x-bzip2', xz: 'application/x-xz',
  exe: 'application/vnd.microsoft.portable-executable', msi: 'application/x-msi',
  dmg: 'application/x-apple-diskimage', pkg: 'application/x-newton-compatible-pkg',
  apk: 'application/vnd.android.package-archive', ipa: 'application/octet-stream',
  deb: 'application/x-debian-package', rpm: 'application/x-rpm',
  iso: 'application/x-iso9660-image', jar: 'application/java-archive', war: 'application/java-archive',
  mp4: 'video/mp4', avi: 'video/x-msvideo', mov: 'video/quicktime', mkv: 'video/x-matroska',
  webm: 'video/webm', flv: 'video/x-flv',
  mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac', m4a: 'audio/mp4', ogg: 'audio/ogg'
};
const getMime = (ext) => MIME_MAP[ext] || 'application/octet-stream';

/**
 * 文件魔数校验（真实文件类型），防止扩展名伪装。
 * 文本/代码类与部分归档格式（iso/tar/pkg/dmg）无固定魔数，放行。
 */
const MAGIC_CHECK = (buf, ext) => {
  if (!buf || buf.length < 8) return false;
  const b = buf;
  const isGif = b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38;
  const isPng = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
  const isJpeg = b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
  const isBmp = b[0] === 0x42 && b[1] === 0x4D;
  const isPdf = b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
  const isZip = b[0] === 0x50 && b[1] === 0x4B && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07);
  const isWebp = b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
    && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
  const isRar = b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21;
  const is7z = b[0] === 0x37 && b[1] === 0x7A && b[2] === 0xBC && b[3] === 0xAF && b[4] === 0x27 && b[5] === 0x1C;
  const isGz = b[0] === 0x1F && b[1] === 0x8B;
  const isBz2 = b[0] === 0x42 && b[1] === 0x5A && b[2] === 0x68;
  const isXz = b[0] === 0xFD && b[1] === 0x37 && b[2] === 0x7A && b[3] === 0x58 && b[4] === 0x5A && b[5] === 0x00;
  const isMz = b[0] === 0x4D && b[1] === 0x5A;                    // exe/dll
  const isCfbf = b[0] === 0xD0 && b[1] === 0xCF && b[2] === 0x11 && b[3] === 0xE0; // msi 等 OLE 复合文档
  const isDeb = b[0] === 0x21 && b[1] === 0x3C && b[2] === 0x61 && b[3] === 0x72 && b[4] === 0x63 && b[5] === 0x68 && b[6] === 0x3E;
  const isRpm = b[0] === 0xED && b[1] === 0xAB && b[2] === 0xEE && b[3] === 0xDB;
  const isElf = b[0] === 0x7F && b[1] === 0x45 && b[2] === 0x4C && b[3] === 0x46;
  const isMacho = (b[0] === 0xCF && b[1] === 0xFA && b[2] === 0xED && b[3] === 0xFE)
    || (b[0] === 0xFE && b[1] === 0xED && b[2] === 0xFA && b[3] === 0xCF)
    || (b[0] === 0xCA && b[1] === 0xFE && b[2] === 0xBA && b[3] === 0xBE);
  const isFtyp = b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70; // mp4/mov/m4a
  const isRiff = b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46;
  const isId3 = b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33;
  const isMp3Sync = b[0] === 0xFF && (b[1] === 0xFB || b[1] === 0xF3 || b[1] === 0xF2);
  const isMkv = b[0] === 0x1A && b[1] === 0x45 && b[2] === 0xDF && b[3] === 0xA3;
  const isFlac = b[0] === 0x66 && b[1] === 0x4C && b[2] === 0x61 && b[3] === 0x43;
  const isOgg = b[0] === 0x4F && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53;

  switch (ext) {
    case 'jpg': case 'jpeg': return isJpeg;
    case 'png': return isPng;
    case 'gif': return isGif;
    case 'bmp': return isBmp;
    case 'webp': return isWebp;
    case 'pdf': return isPdf;
    case 'doc': case 'docx': case 'xls': case 'xlsx': case 'ppt': case 'pptx': case 'xlsm': return isZip;
    case 'zip': case 'apk': case 'jar': case 'war': case 'ipa': return isZip;
    case 'rar': return isRar;
    case '7z': return is7z;
    case 'gz': case 'tgz': return isGz;
    case 'bz2': return isBz2;
    case 'xz': return isXz;
    case 'exe': case 'dll': return isMz || isElf || isMacho;
    case 'msi': return isCfbf;
    case 'deb': return isDeb;
    case 'rpm': return isRpm;
    case 'dmg': case 'pkg': return isMacho || isZip || isCfbf || true; // 容器格式多样，放行
    case 'iso': case 'tar': return true; // 无固定魔数
    case 'mp4': case 'mov': case 'm4a': return isFtyp;
    case 'avi': case 'wav': case 'webm': return isRiff || isMkv;
    case 'mkv': return isMkv;
    case 'mp3': return isId3 || isMp3Sync;
    case 'flac': return isFlac;
    case 'ogg': return isOgg;
    default: return true; // 文本/代码类（txt md js ts py ...）不校验魔数
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
  // 全局上限取各分组最大值（2G，安装包/音视频）；各分组自身上限在落盘后二次校验
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (req, file, cb) => {
    const name = file.originalname || '';
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
    if (ALLOWED_EXTS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型：' + (ext || '无扩展名')));
    }
  }
});

const router = express.Router();

// 确保 files 表具备格式扩展所需列（mime/ext），幂等
let uploadSchemaReady = null;
const ensureUploadSchema = async (pool) => {
  if (uploadSchemaReady) return uploadSchemaReady;
  uploadSchemaReady = (async () => {
    for (const [col, ddl] of Object.entries({
      mime_type: 'VARCHAR(255) DEFAULT NULL',
      ext: 'VARCHAR(20) DEFAULT NULL'
    })) {
      try {
        await pool.execute(`ALTER TABLE files ADD COLUMN \`${col}\` ${ddl}`);
      } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') {
          console.error('[upload] ensureSchema 失败:', col, e.message);
          uploadSchemaReady = null; // 允许下次重试
        }
      }
    }
  })();
  return uploadSchemaReady;
};

router.post('/upload', upload.array('file', 10), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: '请选择文件' });
    }
    const { pool } = req.app.locals;
    await ensureUploadSchema(pool);
    const categoryId = req.body.categoryId || null;
    const uploaderId = req.body.uploaderId ? parseInt(req.body.uploaderId) : null;
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '');

    const fileList = [];
    for (const f of files) {
      const url = '/uploads/' + f.filename;
      const ext = f.originalname?.includes('.') ? f.originalname.split('.').pop().toLowerCase() : '';
      const meta = EXT_INDEX.get(ext);
      if (!meta) continue;
      const filePath = path.join(__dirname, '../../uploads', f.filename);
      const removeFile = () => { try { fs.unlinkSync(filePath); } catch (e) {} };

      // 分组大小二次校验（multer 只有全局上限，分组上限在此拦截）
      if (f.size > FILE_GROUPS[meta.group].max) {
        removeFile();
        console.error('拒绝上传：超出分组大小上限', f.filename, meta.group, f.size);
        continue;
      }

      // 魔数校验：读取文件头，确认真实文件类型与扩展名匹配，防止伪装文件（如 .png 的脚本）
      try {
        const fd = fs.openSync(filePath, 'r');
        const header = Buffer.alloc(12);
        fs.readSync(fd, header, 0, 12, 0);
        fs.closeSync(fd);
        if (!MAGIC_CHECK(header, ext)) {
          removeFile(); // 删除伪装文件
          console.error('拒绝上传：文件类型与扩展名不符', f.filename, ext);
          continue; // 跳过该文件
        }
      } catch (e) {
        // 读文件头失败则删除该文件，防止异常文件
        removeFile();
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
      const mime = getMime(ext);
      await pool.execute(
        'INSERT INTO files (name, size, type, url, uploaderId, categoryId, createdAt, mime_type, ext) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [originalName, f.size, ext, url, uploaderId, categoryId, now, mime, ext]
      );
      fileList.push({ name: originalName, url, size: f.size, ext, mime, group: meta.group });
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
    return res.status(400).json({ success: false, message: `文件大小超过上限（单文件最大 ${Math.floor(MAX_UPLOAD_SIZE / 1024 / 1024)}MB）` });
  }
  res.status(500).json({ success: false, message: msg || '上传失败' });
});

export default router;
