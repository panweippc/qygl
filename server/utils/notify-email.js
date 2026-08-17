/**
 * 告警邮件通知模块（SMTP）
 * 通过 .env 配置发件邮箱，高危安全事件发送邮件给管理员。
 * 配置（.env）：
 *   MAIL_HOST=smtp.qq.com        SMTP 服务器
 *   MAIL_PORT=465                SMTP 端口（465=SSL, 587=STARTTLS）
 *   MAIL_SECURE=true             是否使用 SSL（465 用 true）
 *   MAIL_USER=你的邮箱           发件邮箱
 *   MAIL_PASS=授权码              邮箱授权码（非登录密码）
 *   MAIL_TO=收件人邮箱            告警收件人（多个用逗号分隔）
 *   MAIL_FROM=智慧办公平台告警     发件人显示名（可选）
 * 未配置时静默跳过（不影响主流程）。
 */
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const MAIL_HOST = process.env.MAIL_HOST || '';
const MAIL_PORT = Number(process.env.MAIL_PORT || 465);
const MAIL_SECURE = String(process.env.MAIL_SECURE).toLowerCase() !== 'false';
const MAIL_USER = process.env.MAIL_USER || '';
const MAIL_PASS = process.env.MAIL_PASS || '';
const MAIL_TO = (process.env.MAIL_TO || '').split(',').map(s => s.trim()).filter(Boolean);
const MAIL_FROM = process.env.MAIL_FROM || '智慧办公平台安全告警';

let transporter = null;

// 惰性创建 transporter（仅在配置完整时）
function getTransporter() {
  if (!MAIL_HOST || !MAIL_USER || !MAIL_PASS || MAIL_TO.length === 0) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: MAIL_HOST,
      port: MAIL_PORT,
      secure: MAIL_SECURE,
      auth: { user: MAIL_USER, pass: MAIL_PASS },
    });
  }
  return transporter;
}

/**
 * 发送告警邮件
 * @param {Object} msg { subject, text, html }
 * @returns {Promise<boolean>} 是否发送成功
 */
export async function sendAlertEmail({ subject = '安全告警', text = '', html = '' }) {
  const tr = getTransporter();
  if (!tr) return false;
  try {
    await tr.sendMail({
      from: `"${MAIL_FROM}" <${MAIL_USER}>`,
      to: MAIL_TO.join(', '),
      subject,
      text,
      ...(html ? { html } : {}),
    });
    return true;
  } catch (e) {
    console.log('告警邮件发送失败:', e.message);
    return false;
  }
}

/**
 * 发送安全告警邮件（含文本和 HTML 格式）
 * @param {Object} msg { title, content, level }
 */
export async function pushAlertEmail({ title = '安全告警', content = '', level = 'WARN' }) {
  const text = `【${level}】${title}\n\n${content}`;
  const html = `<div style="font-family:Arial,sans-serif;padding:16px;border-left:4px solid ${level === 'HIGH' || level === 'CRITICAL' ? '#e64545' : '#e6a23c'}">
    <h3 style="margin:0 0 8px;color:#333">【${level}】${title}</h3>
    <pre style="white-space:pre-wrap;color:#555;font-size:13px;line-height:1.6">${String(content || '').replace(/</g, '&lt;')}</pre>
  </div>`;
  return sendAlertEmail({ subject: `【${level}】${title}`, text, html });
}

export default { sendAlertEmail, pushAlertEmail };
