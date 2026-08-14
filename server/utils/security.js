import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
// 必须在读取环境变量前加载 .env（ESM import 静态提升，此模块可能先于 server.js 的 dotenv 被加载）
import 'dotenv/config';

let JWT_SECRET = process.env.JWT_SECRET;
// 密钥轮换：可选的上一个密钥，用于在轮换后仍能验证旧 token（无感轮换）
const JWT_SECRET_PREVIOUS = process.env.JWT_SECRET_PREVIOUS || null;
const JWT_EXPIRES = process.env.JWT_EXPIRES || '12h';

if (!JWT_SECRET) {
  // 生产环境必须配置 JWT_SECRET；仅开发环境允许使用随机生成的临时密钥并打印警告
  if (process.env.NODE_ENV === 'production') {
    throw new Error('安全配置错误：生产环境必须设置 JWT_SECRET 环境变量');
  }
  console.warn('[警告] 未配置 JWT_SECRET，使用随机临时密钥，重启后所有登录态将失效（仅限开发环境）');
  JWT_SECRET = crypto.randomBytes(64).toString('hex');
}

// 从密码哈希提取"版本指纹"（前12位），用于让改密后旧 token 失效
export const pwdFingerprint = (pwd) => String(pwd || '').slice(0, 12);

export const signToken = (user) => jwt.sign(
  {
    id: user.id,
    username: user.username,
    role: user.roleName || '',
    pwd: pwdFingerprint(user.password) // 密码指纹，改密后旧 token 将失效
  },
  JWT_SECRET,
  { expiresIn: JWT_EXPIRES }
);

/**
 * 验证 JWT token（支持密钥轮换）
 * 优先使用当前密钥 JWT_SECRET 验证；若失败且配置了 JWT_SECRET_PREVIOUS，
 * 再尝试用上一个密钥验证，从而让密钥轮换期间已签发的旧 token 仍有效（无感轮换）。
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (JWT_SECRET_PREVIOUS) {
      // 旧密钥签发（轮换前）的 token，允许用上一个密钥验证
      try {
        return jwt.verify(token, JWT_SECRET_PREVIOUS);
      } catch (_) {
        // 上一个密钥也验证失败，抛出原始错误
      }
    }
    throw err;
  }
};

export const isHashed = (p) => typeof p === 'string' && (p.startsWith('$2a$') || p.startsWith('$2b$') || p.startsWith('$2y$'));

export const hashPassword = (plain) => bcrypt.hashSync(String(plain), 10);

export const verifyPassword = (plain, stored) => {
  if (!stored) return false;
  if (isHashed(stored)) return bcrypt.compareSync(String(plain), stored);
  return String(stored) === String(plain);
};

// 常见弱密码黑名单（全部转小写后比对）
const WEAK_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', 'password', 'password1',
  'qwerty', 'qwerty123', 'abc123', 'abc12345', 'admin', 'admin123',
  'letmein', 'welcome', 'iloveyou', 'monkey', 'dragon', '11111111',
  '00000000', 'a123456789', '1qaz2wsx', 'qwertyuiop', 'password123'
]);

/**
 * 强密码复杂度校验：至少10位，必须同时含大写字母、小写字母、数字、特殊字符，
 * 不能与用户名相同或包含用户名，排除常见弱密码。
 * @param {string} pwd 新密码
 * @param {string} [username] 用户名（可选，用于防止密码包含用户名）
 * @returns {string|null} 错误信息；null 表示通过
 */
export const validatePassword = (pwd, username) => {
  const s = String(pwd || '');
  if (s.length < 10) return '密码长度至少10位';
  if (!/[a-z]/.test(s)) return '密码必须包含小写字母';
  if (!/[A-Z]/.test(s)) return '密码必须包含大写字母';
  if (!/\d/.test(s)) return '密码必须包含数字';
  if (!/[^A-Za-z0-9]/.test(s)) return '密码必须包含特殊字符（如 !@#$%^&*）';
  if (WEAK_PASSWORDS.has(s.toLowerCase())) return '密码过于常见，请使用更复杂的密码';
  if (username && s.toLowerCase().includes(String(username).toLowerCase())) return '密码不能包含用户名';
  return null; // null 表示通过
};

// 生成符合强密码要求的随机密码（≥12位，含大写、小写、数字、特殊字符）
export const generateRandomPassword = (length = 12) => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digit = '23456789';
  const special = '!@#$%^&*';
  // 保证至少各含一位
  const parts = [
    upper[crypto.randomInt(upper.length)],
    lower[crypto.randomInt(lower.length)],
    digit[crypto.randomInt(digit.length)],
    special[crypto.randomInt(special.length)]
  ];
  const all = upper + lower + digit + special;
  for (let i = parts.length; i < length; i++) {
    parts.push(all[crypto.randomInt(all.length)]);
  }
  // 洗牌，避免前缀固定
  for (let i = parts.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [parts[i], parts[j]] = [parts[j], parts[i]];
  }
  return parts.join('');
};

export default {
  signToken,
  verifyToken,
  isHashed,
  hashPassword,
  verifyPassword,
  validatePassword,
  generateRandomPassword
};
