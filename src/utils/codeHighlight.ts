/**
 * 轻量语法高亮（零依赖内置实现）
 *
 * 设计要点：
 * - 先整体 HTML 转义，再按"合并正则单次扫描"插入 token 标签，
 *   避免多次 replace 造成的嵌套污染与标签被二次转义
 * - 仅产生 <span class="tok-xxx">，不含事件/样式属性，配合 v-html 使用是安全的
 */

const ESC_MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const escapeHtml = (s: string): string => s.replace(/[&<>]/g, (c) => ESC_MAP[c]);

// 各语言关键字（空格分隔，按需扩充）
const KEYWORDS: Record<string, string> = {
  js: 'const let var function return if else for while do new class extends super import export from default async await try catch finally throw typeof instanceof this null undefined true false switch case break continue delete in of yield static get set interface type enum implements public private protected readonly',
  ts: 'const let var function return if else for while do new class extends super import export from default async await try catch finally throw typeof instanceof this null undefined true false switch case break continue delete in of yield static get set interface type enum implements public private protected readonly string number boolean any void never',
  py: 'def class return if elif else for while import from as with try except finally raise lambda None True False and or not in is pass yield global nonlocal assert del async await self print',
  java: 'public private protected class interface extends implements static final void new return if else for while try catch finally throw throws import package this super null true false abstract enum instanceof synchronized volatile transient',
  go: 'func package import return if else for range var const type struct interface map chan go defer select switch case default string int error nil true false',
  sql: 'select from where insert into values update set delete create table alter drop join left right inner outer group by order having limit distinct as on and or not null is in like count sum avg max min between union',
  sh: 'if then else elif fi for while do done case esac function return export echo cd source local set unset trap exit',
  php: 'function return if else elseif foreach for while class public private protected static new echo namespace use require include true false null array',
  rb: 'def class end return if else elsif unless while do module require true false nil self yield',
  cs: 'public private protected class interface static void new return if else for while foreach try catch finally using namespace this base null true false var async await',
  c: 'if else for while do return switch case break continue struct enum typedef static const void int char float double sizeof include define',
  cpp: 'if else for while do return switch case break continue struct class enum typedef static const void int char float double sizeof include define public private protected template namespace new delete this',
  yaml: 'true false null yes no',
  ini: '',
  properties: '',
  json: '',
  xml: '',
  html: '',
  css: ''
};

// 扩展名 -> 语言标识
const EXT_LANG: Record<string, string> = {
  js: 'js', mjs: 'js', cjs: 'js', jsx: 'js', ts: 'ts', tsx: 'ts', vue: 'html',
  py: 'py', java: 'java', go: 'go', sql: 'sql', sh: 'sh', bash: 'sh',
  php: 'php', rb: 'rb', cs: 'cs', c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp',
  json: 'json', yaml: 'yaml', yml: 'yaml', xml: 'xml', html: 'html', htm: 'html',
  css: 'css', scss: 'css', less: 'css', ini: 'ini', properties: 'properties',
  conf: 'ini', gradle: 'js', dockerfile: 'sh', gitignore: 'sh'
};

export const extToLang = (ext: string): string => EXT_LANG[(ext || '').toLowerCase()] || '';

// 行注释前缀（不同语言不同）
const LINE_COMMENT: Record<string, string> = {
  js: '//', ts: '//', java: '//', go: '//', c: '//', cpp: '//', cs: '//', php: '//',
  py: '#', sh: '#', yaml: '#', rb: '#', properties: '#', ini: ';', sql: '--'
};

// 关键字集合，用于命中后的归类判定（用 Set 而非正则，避免 /g 正则 test() 的 lastIndex 状态问题）
const keywordSetCache: Record<string, Set<string>> = {};
const keywordSet = (lang: string): Set<string> => {
  if (!keywordSetCache[lang]) {
    keywordSetCache[lang] = new Set((KEYWORDS[lang] || '').trim().split(/\s+/).filter(Boolean));
  }
  return keywordSetCache[lang];
};

// 关键字匹配片段（不带 ^$ 锚点，供合并正则在文本任意位置命中）
const keywordPattern = (lang: string): string => {
  const words = (KEYWORDS[lang] || '').trim();
  if (!words) return '';
  return `\\b(?:${words.split(/\s+/).join('|')})\\b`;
};

/**
 * 对代码文本做语法高亮，返回可直接 v-html 的 HTML 字符串
 * @param code 原始代码
 * @param lang 语言标识（由 extToLang 得到）
 * @param maxLen 超过长度则不做高亮（防止超大文件卡顿）
 */
export const highlightCode = (code: string, lang: string, maxLen = 200000): string => {
  if (!code) return '';
  if (code.length > maxLen) return escapeHtml(code); // 过大文件仅转义，不高亮

  // HTML/XML：以标签与属性为主。注意必须在**原始文本**上匹配，先转义会把 < > 变成实体导致规则失效
  if (lang === 'html' || lang === 'xml') {
    const re = /(<\/?[\w:-]+)((?:"[^"]*"|'[^']*'|[^>])*?)(\/?>)/g;
    let out = '';
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      out += escapeHtml(code.slice(last, m.index));
      out += `<span class="tok-tag">${escapeHtml(m[1])}</span>`;
      out += escapeHtml(m[2]).replace(/([\w:-]+)=("[^"]*"|'[^']*')/g,
        '<span class="tok-attr">$1</span><span class="tok-punct">=</span><span class="tok-string">$2</span>');
      out += `<span class="tok-tag">${escapeHtml(m[3])}</span>`;
      last = m.index + m[0].length;
    }
    out += escapeHtml(code.slice(last));
    return out;
  }

  // CSS：属性名 + 值
  if (lang === 'css') {
    return code.replace(/[&<>]/g, (c) => ESC_MAP[c])
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tok-comment">$1</span>')
      .replace(/([-a-zA-Z]+)(\s*:\s*)([^;{}]+)(;)/g,
        '<span class="tok-attr">$1</span><span class="tok-punct">$2</span><span class="tok-string">$3</span><span class="tok-punct">$4</span>');
  }

  const kwSet = keywordSet(lang);
  const kwPat = keywordPattern(lang);
  const lineCmt = LINE_COMMENT[lang];
  // 合并正则：块注释 | 行注释 | 字符串 | 数字 | 函数调用 | 关键字
  // 顺序即优先级：注释 > 字符串 > 数字 > 函数调用 > 关键字
  const parts: string[] = [
    '/\\*[\\s\\S]*?\\*/',
    lineCmt ? `${lineCmt.replace(/[/#;-]/g, (c) => '\\' + c)}[^\\n]*` : '',
    '"(?:\\\\.|[^"\\\\])*"',
    "'(?:\\\\.|[^'\\\\])*'",
    '`(?:\\\\.|[^`\\\\])*`',
    '\\b\\d+(?:\\.\\d+)?\\b',
    '\\b[A-Za-z_]\\w*(?=\\s*\\()'
  ].filter(Boolean);
  if (kwPat) parts.push(kwPat);

  const re = new RegExp(parts.join('|'), 'g');
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    out += escapeHtml(code.slice(last, m.index));
    const t = m[0];
    let cls = '';
    if (t.startsWith('/*')) cls = 'tok-comment';
    else if (lineCmt && t.startsWith(lineCmt)) cls = 'tok-comment';
    else if (t.startsWith('"') || t.startsWith("'") || t.startsWith('`')) cls = 'tok-string';
    else if (/^\d/.test(t)) cls = 'tok-number';
    else if (kwSet.has(t)) cls = 'tok-keyword';
    else cls = 'tok-func';
    out += `<span class="${cls}">${escapeHtml(t)}</span>`;
    last = m.index + t.length;
  }
  out += escapeHtml(code.slice(last));
  return out;
};
