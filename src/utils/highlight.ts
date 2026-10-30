// 关键词高亮：先转义 HTML 特殊字符，再把命中关键词包裹为 <mark>，配合 v-html 渲染
export function highlight(text: string, keyword: string): string {
  if (!text) return '';
  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safe = escapeHtml(text);
  if (!keyword) return safe;
  const k = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    return safe.replace(new RegExp(`(${k})`, 'gi'), '<mark>$1</mark>');
  } catch (e) {
    return safe;
  }
}
