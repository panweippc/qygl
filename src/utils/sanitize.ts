/**
 * 前端 XSS 清洗工具（统一封装 DOMPurify）
 * 用于对所有 v-html 渲染的用户可控内容进行安全清洗，防止存储型/反射型 XSS。
 */
import DOMPurify from 'dompurify';

// 默认清洗配置：允许富文本基本标签，剥离脚本/事件处理器等危险内容
const SANITIZE_CONFIG = {
  USE_PROFILES: { html: true },
  // 显式禁止危险的协议与属性
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,)[^#]*(?:#[^#]*)?)$/i,
};

/**
 * 清洗一段 HTML 字符串，返回安全的 HTML。
 * 传入 undefined/null 时返回空字符串，避免渲染 undefined。
 */
export function sanitizeHtml(input?: string | null): string {
  if (!input) return '';
  return DOMPurify.sanitize(input, SANITIZE_CONFIG);
}

/**
 * 清洗并保留基础富文本格式（用于文章内容、富文本编辑器内容展示）。
 * 与 sanitizeHtml 相同，但保留空内容占位符处理。
 */
export function sanitizeRichText(input?: string | null, fallback = ''): string {
  if (!input) {
    return fallback;
  }
  return DOMPurify.sanitize(input, SANITIZE_CONFIG);
}

/**
 * 对纯文本字段做安全转义（用于 v-text / 插值场景的可选防护）。
 * 注意：Vue 插值默认已转义，此函数供需要强制转义 HTML 的场景使用。
 */
export function escapeHtml(input?: string | null): string {
  if (!input) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default sanitizeHtml;
