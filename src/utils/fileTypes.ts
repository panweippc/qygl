/**
 * 文件类型分组（与后端 server/routes/upload.js 的 FILE_GROUPS 保持一致）
 * 修改任一侧时，另一侧需同步，否则会出现"能上传但前端不认"的错位
 */

export const FILE_GROUP_EXTS: Record<string, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
  doc: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'xlsm', 'csv'],
  code: ['js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx', 'vue', 'py', 'java', 'go', 'c', 'cpp', 'h', 'hpp',
    'cs', 'php', 'rb', 'rs', 'kt', 'swift', 'sql', 'json', 'yaml', 'yml', 'xml', 'sh', 'bash',
    'html', 'htm', 'css', 'scss', 'less', 'ini', 'properties', 'gradle', 'conf', 'log',
    'dockerfile', 'gitignore'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz', 'exe', 'msi', 'dmg', 'pkg',
    'apk', 'ipa', 'deb', 'rpm', 'iso', 'jar', 'war'],
  media: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'mp3', 'wav', 'flac', 'm4a', 'ogg']
};

export const GROUP_LABEL: Record<string, string> = {
  image: '图片', doc: '文档', code: '代码/配置', archive: '压缩包/安装包', media: '音视频', other: '其他'
};

export const GROUP_MAX_MB: Record<string, number> = {
  image: 20, doc: 50, code: 5, archive: 2048, media: 2048, other: 50
};

const INDEX: Record<string, string> = {};
for (const [group, exts] of Object.entries(FILE_GROUP_EXTS)) {
  for (const e of exts) INDEX[e] = group;
}

export const extOf = (name: string): string => {
  const n = (name || '').toLowerCase();
  const i = n.lastIndexOf('.');
  return i >= 0 ? n.slice(i + 1) : '';
};

export const groupOf = (ext: string): string => INDEX[(ext || '').toLowerCase()] || 'other';

/**
 * 预览方式：
 * - image 图片直显 / pdf iframe / text 纯文本 / code 语法高亮 / media 播放器 / none 仅下载
 */
export const previewKindOf = (ext: string): 'image' | 'pdf' | 'text' | 'code' | 'media' | 'none' => {
  const e = (ext || '').toLowerCase();
  const g = groupOf(e);
  if (g === 'image') return 'image';
  if (e === 'pdf') return 'pdf';
  if (g === 'code') return 'code';
  if (g === 'doc' && ['txt', 'md', 'csv', 'log'].includes(e)) return 'text';
  if (g === 'media') return 'media';
  if (['mp4', 'webm', 'ogg', 'mov'].includes(e)) return 'media';
  return 'none';
};

export const isVideo = (ext: string): boolean =>
  ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'].includes((ext || '').toLowerCase());

export const formatSize = (bytes: number): string => {
  if (!bytes && bytes !== 0) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
};
