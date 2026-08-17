/**
 * 备份文件加密/解密工具（AES-256-GCM）
 * 用于对数据库备份 SQL 文件进行加密存储，防止备份文件泄露后数据被直接读取。
 * 用法：
 *   node scripts/backup-crypto.js encrypt <input.sql> [output.enc]
 *   node scripts/backup-crypto.js decrypt <input.enc> [output.sql]
 * 密钥来源：.env 的 BACKUP_ENCRYPT_KEY（32字节 hex，可用 openssl rand -hex 32 生成）
 * ⚠️ 重要：加密密钥必须妥善保管，一旦丢失将无法解密备份！
 */
import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';

const KEY_HEX = process.env.BACKUP_ENCRYPT_KEY || '';
const ALGO = 'aes-256-gcm';

function getKey() {
  if (!KEY_HEX) throw new Error('未配置 BACKUP_ENCRYPT_KEY（.env），无法加解密');
  const buf = Buffer.from(KEY_HEX, 'hex');
  if (buf.length !== 32) throw new Error('BACKUP_ENCRYPT_KEY 必须为 32 字节（64 位十六进制），可用 openssl rand -hex 32 生成');
  return buf;
}

function encrypt(inputPath, outputPath) {
  const key = getKey();
  const data = fs.readFileSync(inputPath);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  // 文件格式：iv(12) + tag(16) + 密文
  const out = Buffer.concat([iv, tag, encrypted]);
  fs.writeFileSync(outputPath, out);
  console.log(`加密成功: ${outputPath} (原 ${(data.length / 1024).toFixed(1)}KB → ${(out.length / 1024).toFixed(1)}KB)`);
}

function decrypt(inputPath, outputPath) {
  const key = getKey();
  const data = fs.readFileSync(inputPath);
  if (data.length < 28) throw new Error('文件过小，不是有效的加密备份');
  const iv = data.slice(0, 12);
  const tag = data.slice(12, 28);
  const encrypted = data.slice(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  fs.writeFileSync(outputPath, decrypted);
  console.log(`解密成功: ${outputPath} (${(decrypted.length / 1024).toFixed(1)}KB)`);
}

// 命令行入口
const [cmd, input, output] = process.argv.slice(2);
if (!cmd || !input) {
  console.log('用法:');
  console.log('  node scripts/backup-crypto.js encrypt <input.sql> [output.enc]');
  console.log('  node scripts/backup-crypto.js decrypt <input.enc> [output.sql]');
  process.exit(1);
}

try {
  if (cmd === 'encrypt') {
    const out = output || input + '.enc';
    encrypt(input, out);
  } else if (cmd === 'decrypt') {
    if (!output) { console.log('decrypt 需要指定输出文件'); process.exit(1); }
    decrypt(input, output);
  } else {
    console.log('未知命令:', cmd);
    process.exit(1);
  }
} catch (e) {
  console.error('操作失败:', e.message);
  process.exit(1);
}
