// 资料中心文件脏点清理（安全、幂等）
// 用法：
//   node _cleanup_duplicates.mjs            # 仅报告重复文件，不删除
//   node _cleanup_duplicates.mjs --apply    # 删除重复文件（保留 id 最小/最早的一条），并清理磁盘文件
//
// 检测口径：相同 name + size 视为潜在重复（内容与命名一致的概率极高）。
// URL 编码文件名由 server.js 启动迁移自动清洗（decodeURIComponent），本脚本不重复处理。

import mysql from 'mysql2/promise';
import fs from 'node:fs';
import dotenv from 'dotenv';
dotenv.config({ path: './.env', quiet: true });

const APPLY = process.argv.includes('--apply');

const pool = await mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'qygl',
  connectionLimit: 5
});

try {
  // 1) 重复文件（name + size 相同，保留最小 id）
  const [dups] = await pool.query(`
    SELECT name, size, COUNT(*) c, GROUP_CONCAT(id ORDER BY id) ids, GROUP_CONCAT(url ORDER BY id) urls
    FROM files GROUP BY name, size HAVING c > 1
  `);
  console.log(`重复文件组数: ${dups.length}`);
  let toDelete = [];
  for (const g of dups) {
    const ids = g.ids.split(',').map(Number);
    const urls = (g.urls || '').split(',');
    const keep = Math.min(...ids);
    const extras = ids.filter(id => id !== keep);
    toDelete.push(...extras);
    console.log(`  组「${g.name}」(${g.size}B): 保留 #${keep}，待删 ${extras.join(', ')}`);
  }

  // 2) URL 编码文件名（理论上迁移已处理，这里兜底统计）
  const [enc] = await pool.query("SELECT id, name FROM files WHERE name LIKE '%!%' ESCAPE '!' OR name LIKE '%25%'");
  console.log(`URL 编码文件名: ${enc.length}`);

  if (!APPLY) {
    console.log('\n[报告模式] 未执行删除。需要清理请加 --apply');
    process.exit(0);
  }

  if (toDelete.length === 0) {
    console.log('\n无需清理。');
    process.exit(0);
  }

  // 删除数据库记录 + 磁盘文件（仅重复副本）
  const [del] = await pool.query(`DELETE FROM files WHERE id IN (${toDelete.map(() => '?').join(',')})`, toDelete);
  console.log(`\n[已应用] 删除 DB 记录 ${del.affectedRows} 条: ${toDelete.join(', ')}`);

  // 清理磁盘文件（按 url 解析本地路径）
  for (const url of urlsOfExtras(dups)) {
    const p = localPathOf(url);
    if (p && fs.existsSync(p)) { try { fs.unlinkSync(p); console.log('  删除磁盘文件:', p); } catch (e) { console.log('  删除失败:', p, e.message); } }
  }
} finally {
  await pool.end();
}

function urlsOfExtras(dups) {
  const out = [];
  for (const g of dups) {
    const ids = g.ids.split(',').map(Number);
    const urls = (g.urls || '').split(',');
    const keep = Math.min(...ids);
    ids.forEach((id, i) => { if (id !== keep && urls[i]) out.push(urls[i]); });
  }
  return out;
}
function localPathOf(url) {
  if (!url) return null;
  // 形如 /uploads/xxx.png 或 http(s)://host/uploads/xxx.png
  const m = url.match(/\/uploads\/.+$/);
  if (!m) return null;
  return '.' + m[0];
}
