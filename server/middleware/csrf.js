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
    const protocol = u.protocol;
    // 回环地址（本机）永远允许
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }
    // 白名单匹配（精确匹配 host，如 192.168.2.142:8080）
    if (envOrigins.some(o => o === originValue)) {
      return true;
    }
    // 宽松匹配：去掉端口后仅比 hostname（允许同主机不同端口）
    if (envOrigins.some(o => {
      try {
        const ou = new URL(o);
        return ou.host === host;
      } catch { return false; }
    })) {
      return true;
    }
    // 局域网私有网段自动放行（HTTP 内网调试/移动端同网访问）
    if (protocol === 'http:' && isPrivateIP(hostname)) {
      return true;
    }
  } catch (e) {
    // URL 解析失败，拒绝（视为可疑来源）
    return false;
  }
  return false;
}

// 判断是否为 RFC1918 私有 IPv4 地址
function isPrivateIP(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b, c] = parts;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 127.0.0.0/8（回环已在上方放行，这里兜底）
  if (a === 127) return true;
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
