const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ShadingType, BorderStyle } = require('docx');

// 解析 Markdown 表格 -> 对象数组
function parseTable(lines) {
  // lines 包含表头行、分隔行、数据行
  const header = lines[0];
  const rows = [];
  const dataLines = lines.slice(2).filter(l => l.trim() !== '' && l.trim().startsWith('|'));
  const split = (line) => line.split('|').map(s => s.trim()).filter((_, i, arr) => i !== 0 && i !== arr.length - 1);
  // 表头
  const headerCells = split(header);
  // 数据行
  const data = dataLines.map(l => split(l));
  return { header: headerCells, rows: data };
}

function isTableStart(line) {
  return /^\|.*\|$/.test(line.trim());
}
function isTableSep(line) {
  return /^\|[\s\-:|]+\|$/.test(line.trim()) && line.includes('-');
}

function cellShading(border) {
  return {
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
    },
    shading: border ? { type: ShadingType.CLEAR, color: 'DCE6F1', fill: 'DCE6F1' } : undefined,
  };
}

async function convert(mdPath, outPath) {
  const md = fs.readFileSync(mdPath, 'utf-8');
  const lines = md.split('\n');
  const children = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 表格
    if (isTableStart(trimmed) && i + 1 < lines.length && isTableSep(lines[i + 1].trim())) {
      const tableLines = [];
      while (i < lines.length && isTableStart(lines[i].trim())) {
        tableLines.push(lines[i]);
        i++;
      }
      const { header, rows } = parseTable(tableLines);
      const colCount = Math.max(header.length, ...rows.map(r => r.length));
      const tableRows = [];
      // 表头行
      tableRows.push(new TableRow({
        tableHeader: true,
        children: header.map(h => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: '1F4E79' })] })],
          shading: { type: ShadingType.CLEAR, color: 'DCE6F1', fill: 'DCE6F1' },
          width: { size: Math.floor(100 / colCount), type: WidthType.PERCENTAGE },
        })),
      }));
      // 数据行
      rows.forEach((row, ridx) => {
        tableRows.push(new TableRow({
          children: Array.from({ length: colCount }).map((_, c) => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: row[c] || '' })] })],
            shading: ridx % 2 === 1 ? { type: ShadingType.CLEAR, color: 'F2F2F2', fill: 'F2F2F2' } : undefined,
            width: { size: Math.floor(100 / colCount), type: WidthType.PERCENTAGE },
          })),
        }));
      });
      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }));
      children.push(new Paragraph({ children: [] })); // 空行
      continue;
    }

    // 标题
    const hMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const text = hMatch[2].replace(/[*`]/g, '');
      const sizes = { 1: 30, 2: 26, 3: 22, 4: 19 };
      const headingMap = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3, 4: HeadingLevel.HEADING_4 };
      children.push(new Paragraph({
        heading: headingMap[level],
        spacing: { before: 200, after: 120 },
        children: [new TextRun({ text, bold: true, size: sizes[level] * 2, color: level <= 2 ? '1F4E79' : '2E74B5' })],
      }));
      i++;
      continue;
    }

    // 分隔线
    if (/^\s*---+\s*$/.test(trimmed)) { i++; continue; }

    // 列表项
    if (/^\s*[-*+]\s+/.test(trimmed)) {
      const text = trimmed.replace(/^\s*[-*+]\s+/, '').replace(/[*`]/g, '').replace(/\*\*([^*]+)\*\*/g, '$1');
      children.push(new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 60 },
        children: [new TextRun({ text, size: 21 })],
      }));
      i++;
      continue;
    }

    // 编号列表
    if (/^\s*\d+[.、]\s+/.test(trimmed)) {
      const text = trimmed.replace(/^\s*\d+[.、]\s+/, '').replace(/[*`]/g, '');
      children.push(new Paragraph({
        numbering: { reference: 'num', level: 0 },
        spacing: { after: 60 },
        children: [new TextRun({ text, size: 21 })],
      }));
      i++;
      continue;
    }

    // 引用
    if (/^\s*>\s+/.test(trimmed)) {
      const text = trimmed.replace(/^\s*>\s+/, '');
      children.push(new Paragraph({
        indent: { left: 300 },
        shading: { type: ShadingType.CLEAR, color: 'FFF2CC', fill: 'FFF2CC' },
        children: [new TextRun({ text, italic: true, size: 21 })],
      }));
      i++;
      continue;
    }

    // 普通段落
    if (trimmed !== '') {
      const text = trimmed.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/[*`]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      children.push(new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text, size: 21 })],
      }));
      i++;
      continue;
    }

    // 空行
    children.push(new Paragraph({ children: [] }));
    i++;
  }

  const doc = new Document({
    numbering: { config: [{ reference: 'num', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }] }] },
    styles: {
      default: {
        document: { run: { font: '微软雅黑', size: 21 } },
      },
    },
    sections: [{
      properties: {},
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buffer);
  console.log('生成成功:', outPath);
}

(async () => {
  const base = path.join(__dirname, '..', 'docs');
  const files = [
    ['操作手册_普通员工.md', '操作手册_普通员工.docx'],
    ['操作手册_财务总监.md', '操作手册_财务总监.docx'],
    ['操作手册_总经理.md', '操作手册_总经理.docx'],
  ];
  for (const [md, docx] of files) {
    await convert(path.join(base, md), path.join(base, docx));
  }
  console.log('全部完成');
})();
