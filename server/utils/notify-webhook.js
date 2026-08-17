/**
 * 告警 Webhook 推送模块
 * 支持企业微信机器人、钉钉机器人（通过配置 webhook 地址自动识别）。
 * 配置（.env）：
 *   - ALERT_WEBHOOK_TYPE=wecom|dingtalk （可选，自动识别）
 *   - ALERT_WEBHOOK_URL=https://qyapi.weixin.qq.com/...  企业微信机器人地址
 *   - ALERT_WEBHOOK_URL=https://oapi.dingtalk.com/...    钉钉机器人地址
 * 未配置时静默跳过（不影响主流程）。
 */
import dotenv from 'dotenv';

dotenv.config();

const WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || '';
const WEBHOOK_TYPE = (process.env.ALERT_WEBHOOK_TYPE || '').toLowerCase();

function detectType(url) {
  if (WEBHOOK_TYPE) return WEBHOOK_TYPE;
  if (!url) return '';
  if (url.includes('qyapi.weixin.qq.com')) return 'wecom';
  if (url.includes('oapi.dingtalk.com')) return 'dingtalk';
  return '';
}

/**
 * 推送一条告警消息到 Webhook（企业微信/钉钉）
 * @param {Object} msg { title, content, level }
 */
export async function pushWebhook({ title = '安全告警', content = '', level = 'WARN' }) {
  if (!WEBHOOK_URL) return false;
  const type = detectType(WEBHOOK_URL);
  if (!type) return false;

  const text = `【${level}】${title}\n${content}`;
  const payload = type === 'wecom'
    ? { msgtype: 'text', text: { content: text } }
    : { msgtype: 'text', text: { content: text } }; // 钉钉格式与微信类似

  try {
    // 使用 fetch（Node 18+ 内置）
    const resp = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 5000,
    });
    const data = await resp.json();
    // 企业微信成功返回 errcode=0；钉钉成功返回 errcode=0
    if (data && (data.errcode === 0 || data.errcode === undefined)) {
      return true;
    }
    console.log('Webhook 推送返回异常:', JSON.stringify(data));
    return false;
  } catch (e) {
    console.log('Webhook 推送失败:', e.message);
    return false;
  }
}

export default { pushWebhook };
