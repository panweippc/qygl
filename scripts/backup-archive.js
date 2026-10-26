/**
 * 备份归档工具（零依赖，纯 Node 实现）
 * - zipDir: 把目录递归打包成标准 ZIP（deflate 压缩，可跨平台解压）
 * - unzipTo: 把 ZIP 解压到目标目录（自动建目录）
 * - 之所以不引入 archiver 等依赖：部署机经 Jenkins 构建，新增依赖需改 package-lock，
 *   且上传附件多为已压缩图片/文档，纯 Node 实现即可满足备份/恢复需求，且可控、可测。
 *
 * 仅用于"数据备份"把 uploads/ 一并打包，与数据库 SQL 形成完整备份包。
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// ---------- CRC32（ZIP 必需） ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ---------- 递归收集文件（相对路径，'/' 分隔，排除指定前缀） ----------
function collectFiles(base, dir, exclude, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(base, abs).split(path.sep).join('/');
    const isExcluded = exclude.some(p => rel === p || rel.startsWith(p + '/'));
    if (isExcluded) continue;
    if (entry.isDirectory()) {
      collectFiles(base, abs, exclude, acc);
    } else if (entry.isFile()) {
      acc.push({ rel, abs });
    }
  }
  return acc;
}

// ---------- 打包目录为 ZIP ----------
export async function zipDir(sourceDir, outZipPath, { exclude = [] } = {}) {
  const files = collectFiles(sourceDir, sourceDir, exclude);
  const chunks = [];
  let offset = 0;
  const central = [];

  for (const { rel, abs } of files) {
    const data = fs.readFileSync(abs);
    const crc = crc32(data);
    let method = 0;
    let body = data;
    const compressed = zlib.deflateRawSync(data);
    // 压缩后更小且文件不大时才用 deflate，否则直接存储（避免大文件长时间占用 CPU）
    if (data.length <= 64 * 1024 * 1024 && compressed.length < data.length) {
      method = 8;
      body = compressed;
    }
    const nameBuf = Buffer.from(rel, 'utf8');

    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0);
    lfh.writeUInt16LE(20, 4);
    lfh.writeUInt16LE(0, 6);
    lfh.writeUInt16LE(method, 8);
    lfh.writeUInt16LE(0, 10);
    lfh.writeUInt16LE(0, 12);
    lfh.writeUInt32LE(crc, 14);
    lfh.writeUInt32LE(body.length, 18);
    lfh.writeUInt32LE(data.length, 22);
    lfh.writeUInt16LE(nameBuf.length, 26);
    lfh.writeUInt16LE(0, 28);

    const lfhOffset = offset;
    chunks.push(lfh, nameBuf, body);
    offset += lfh.length + nameBuf.length + body.length;

    const cdh = Buffer.alloc(46);
    cdh.writeUInt32LE(0x02014b50, 0);
    cdh.writeUInt16LE(20, 4);
    cdh.writeUInt16LE(20, 6);
    cdh.writeUInt16LE(0, 8);
    cdh.writeUInt16LE(method, 10);
    cdh.writeUInt16LE(0, 12);
    cdh.writeUInt16LE(0, 14);
    cdh.writeUInt32LE(crc, 16);
    cdh.writeUInt32LE(body.length, 20);
    cdh.writeUInt32LE(data.length, 24);
    cdh.writeUInt16LE(nameBuf.length, 28);
    cdh.writeUInt16LE(0, 30);
    cdh.writeUInt16LE(0, 32);
    cdh.writeUInt16LE(0, 34);
    cdh.writeUInt16LE(0, 36);
    cdh.writeUInt32LE(0, 38);
    cdh.writeUInt32LE(lfhOffset, 42);

    central.push({ cdh, nameBuf });
  }

  const cdStart = offset;
  let cdSize = 0;
  for (const { cdh, nameBuf } of central) {
    chunks.push(cdh, nameBuf);
    offset += cdh.length + nameBuf.length;
    cdSize += cdh.length + nameBuf.length;
  }

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(central.length, 8);
  eocd.writeUInt16LE(central.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdStart, 16);
  eocd.writeUInt16LE(0, 20);
  chunks.push(eocd);

  fs.mkdirSync(path.dirname(outZipPath), { recursive: true });
  fs.writeFileSync(outZipPath, Buffer.concat(chunks));
  return { fileCount: files.length, bytes: fs.statSync(outZipPath).size };
}

// ---------- 解压 ZIP 到目标目录 ----------
export function unzipTo(zipPath, targetDir) {
  const buf = fs.readFileSync(zipPath);
  let eocdPos = -1;
  const minPos = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= minPos; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocdPos = i; break; }
  }
  if (eocdPos < 0) throw new Error('无效的 zip 文件（找不到中央目录结尾）');
  const count = buf.readUInt16LE(eocdPos + 10);
  let pos = buf.readUInt32LE(eocdPos + 16);

  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) throw new Error('zip 中央目录损坏');
    const method = buf.readUInt16LE(pos + 10);
    pos += 16; // sig(4)+vmade(2)+vneed(2)+flags(2)+method(2)+time(2)+date(2)
    const crc = buf.readUInt32LE(pos); pos += 4;
    const compSize = buf.readUInt32LE(pos); pos += 4;
    const uncompSize = buf.readUInt32LE(pos); pos += 4;
    const nameLen = buf.readUInt16LE(pos); pos += 2;
    const extraLen = buf.readUInt16LE(pos); pos += 2;
    const commentLen = buf.readUInt16LE(pos); pos += 2;
    pos += 2; // 磁盘编号
    pos += 2; // 内部属性
    pos += 4; // 外部属性
    const localOffset = buf.readUInt32LE(pos); pos += 4;
    const name = buf.toString('utf8', pos, pos + nameLen); pos += nameLen + extraLen + commentLen;

    let lp = localOffset;
    lp += 4; // 本地头 sig
    lp += 10; // version(2)+flags(2)+method(2)+time(2)+date(2)
    lp += 4; // crc
    lp += 4; // compSize
    lp += 4; // uncompSize
    const lnameLen = buf.readUInt16LE(lp); lp += 2;
    const lextraLen = buf.readUInt16LE(lp); lp += 2;
    lp += lnameLen + lextraLen;

    const data = buf.subarray(lp, lp + compSize);
    const out = method === 8 ? zlib.inflateRawSync(data) : Buffer.from(data);
    if (out.length !== uncompSize) throw new Error(`zip 解压大小不符: ${name}`);
    if (crc !== crc32(out)) throw new Error(`zip 校验失败(CRC 不匹配): ${name}`);

    const target = path.join(targetDir, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, out);
  }
}

// ---------- 目录辅助：清空、复制、删除 ----------
export function clearDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) rmDir(abs);
    else fs.unlinkSync(abs);
  }
}

export function rmDir(dir) {
  if (!fs.existsSync(dir)) return;
  clearDir(dir);
  fs.rmdirSync(dir);
}

export function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
