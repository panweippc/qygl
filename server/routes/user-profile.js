import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import { verifyPassword, hashPassword, validatePassword } from '../utils/security.js';
import { createOperationLog, getOperator } from '../utils/audit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const avatarDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '.jpg').toLowerCase();
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 JPG/PNG/GIF/WebP 格式的头像'));
    }
  }
});

const router = express.Router();

// B1: 当前用户的最近登录记录（含时间、IP、是否成功），用于发现异常登录
router.get('/user/login-records', async (req, res) => {
  const username = req.user?.name || req.user?.username;
  if (!username) {
    return res.status(401).json({ success: false, message: '未登录' });
  }
  try {
    const { pool } = req.app.locals;
    const [rows] = await pool.execute(
      "SELECT id, action, ipAddress, detail, createdAt FROM operation_logs WHERE username = ? AND action IN ('login','login_fail') ORDER BY id DESC LIMIT 20",
      [username]
    );
    const records = rows.map(r => ({
      id: r.id,
      success: r.action === 'login',
      ip: r.ipAddress || '未知',
      time: r.createdAt,
      detail: r.detail || ''
    }));
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取登录记录失败:', error);
    res.status(500).json({ success: false, message: '获取登录记录失败' });
  }
});

// 改密接口：旧密码错误限流（防暴力猜解）
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '密码修改尝试过于频繁，请15分钟后再试' }
});

router.post('/user/change-password', passwordLimiter, async (req, res) => {
  // 身份一律取自登录态（JWT），禁止信任请求体中的 username，防止越权改他人密码
  const username = req.user?.name || req.user?.username;
  const { oldPassword, newPassword } = req.body;
  if (!username) {
    return res.status(401).json({ success: false, message: '未登录' });
  }
  if (!oldPassword || !newPassword) {
    return res.json({ success: false, message: '参数不完整' });
  }
  const pwdErr = validatePassword(newPassword, username);
  if (pwdErr) {
    return res.json({ success: false, message: pwdErr });
  }
  try {
    const { pool, userSessions } = req.app.locals;
    const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.json({ success: false, message: '用户不存在' });
    }
    if (!verifyPassword(oldPassword, users[0].password)) {
      return res.json({ success: false, message: '旧密码错误' });
    }
    // 禁止新密码与旧密码相同
    if (verifyPassword(newPassword, users[0].password)) {
      return res.json({ success: false, message: '新密码不能与旧密码相同' });
    }
    await pool.execute('UPDATE users SET password = ? WHERE username = ?', [hashPassword(String(newPassword)), username]);
    // 密码已修改，使该用户所有旧会话失效（强制重新登录）
    if (userSessions && userSessions.has(username)) {
      userSessions.delete(username);
    }
    // 修改密码审计（高危操作）
    createOperationLog(pool, { userId: String(req.user?.id || ''), username: getOperator(req), action: 'change_password', module: 'auth', targetId: null, targetName: username, detail: `用户修改密码: ${username}`, ipAddress: req.ip });
    res.json({ success: true, message: '密码修改成功，请使用新密码重新登录' });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ success: false, message: '修改密码失败' });
  }
});

router.post('/user/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || !req.file) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    const avatarUrl = '/uploads/avatars/' + req.file.filename;
    const { pool } = req.app.locals;
    const [employees] = await pool.execute('SELECT * FROM employees WHERE name = ?', [username]);
    if (employees.length > 0) {
      await pool.execute('UPDATE employees SET avatar = ? WHERE name = ?', [avatarUrl, username]);
    }
    res.json({ success: true, data: { avatar: avatarUrl }, message: '头像更新成功' });
  } catch (error) {
    console.error('上传头像失败:', error);
    res.status(500).json({ success: false, message: '上传头像失败' });
  }
});

router.get('/user/avatar/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { pool } = req.app.locals;
    const [employees] = await pool.execute('SELECT avatar FROM employees WHERE name = ?', [username]);
    const avatar = employees.length > 0 && employees[0].avatar ? employees[0].avatar : '';
    res.json({ success: true, data: { avatar } });
  } catch (error) {
    console.error('获取头像失败:', error);
    res.json({ success: true, data: { avatar: '' } });
  }
});

router.use((err, req, res, next) => {
  const msg = err.message || '';
  if (msg.includes('仅支持')) {
    return res.status(400).json({ success: false, message: msg });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: '头像文件不能超过2MB' });
  }
  res.status(500).json({ success: false, message: msg || '上传失败' });
});

export default router;
