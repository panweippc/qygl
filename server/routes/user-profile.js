import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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

router.post('/user/change-password', async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  if (!username || !oldPassword || !newPassword) {
    return res.json({ success: false, message: '参数不完整' });
  }
  if (newPassword.length < 6) {
    return res.json({ success: false, message: '新密码长度不能少于6位' });
  }
  try {
    const { pool } = req.app.locals;
    const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.json({ success: false, message: '用户不存在' });
    }
    if (users[0].password !== oldPassword) {
      return res.json({ success: false, message: '旧密码错误' });
    }
    await pool.execute('UPDATE users SET password = ? WHERE username = ?', [newPassword, username]);
    res.json({ success: true, message: '密码修改成功' });
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
