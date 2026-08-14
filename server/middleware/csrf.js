/**
 * CSRF 防护中间件
 * 策略：对写操作（POST/PUT/DELETE/PATCH）校验请求来源。
 *   - 优先校验 Origin 头（浏览器跨域写请求必带）
 *   - 无 Origin 时校验 Referer 头（回退）
 *   - 同源/无来源头的请求放行（内网本地工具、curl 等）
 * 来源白名单与 CORS 白名单一致（localhost/127.0.0.1 回环 + .env 的 CORS_ORIGINS）。
 */
import dotenv from 'dotenv';

dotenv.config();

// 允许的来源（host:port 匹配）。回环地址永远允许。
const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// 判断请求来源是否合法
function isAllowedOrigin(originValue) {
  if (!originValue) return true; // 无来源头，无法判断，放行
  try {
    const u = new URL(originValue);
    const host = u.host; // 含端口，如 localhost:8080
    const hostname = u.hostname;
    // 回环地址（本机）永远允许
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }
    // 白名单匹配（精确匹配 host，如 192.168.2.142:8080）
    if (envOrigins.some(o => o === originValue)) {
      return true;
    }
    // 宽松匹配：去掉端口后仅比 hostname（允许同主机不同端口？这里为安全仅精确匹配 host）
    // 为兼容配置差异，再比对不带协议的 host 字符串
    if (envOrigins.some(o => {
      try {
        const ou = new URL(o);
        return ou.host === host;
      } catch { return false; }
    })) {
      return true;
    }
  } catch (e) {
    // URL 解析失败，拒绝（视为可疑来源）
    return false;
  }
  return false;
}

export function csrfProtection(req, res, next) {
  // 仅对写操作校验
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return next();
  }

  // 允许安全放行的路径（登录接口等可能跨源，但需要 token；此处不特殊放行，来源校验即可）
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // 来源判定：优先信任 Origin 头（浏览器跨站写请求必带）；无 Origin 时回退到 Referer
  let allowed;
  if (origin) {
    allowed = isAllowedOrigin(origin);
  } else {
    allowed = isAllowedOrigin(referer);
  }

  if (!allowed) {
    return res.status(403).json({ success: false, message: '请求来源校验失败（CSRF防护）' });
  }

  return next();
}

export default csrfProtection;
