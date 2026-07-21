import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ dest: path.join(__dirname, '../../uploads/temp') });

const router = express.Router();

const STAGE_MAP = {
  '潜在客户': 1, '潜在': 1, '潜在用户': 1, '1': 1,
  '意向客户': 2, '意向': 2, '有意向': 2, '2': 2,
  '提案阶段': 3, '提案': 3, '方案': 3, '3': 3,
  '谈判阶段': 4, '谈判': 4, '商务': 4, '4': 4,
  '成交客户': 5, '成交': 5, '已成交': 5, '5': 5,
};

function parseStage(intention) {
  if (!intention && intention !== 0) return 1;
  const key = String(intention).trim();
  return STAGE_MAP[key] || 1;
}

function parseNum(val) {
  if (val === undefined || val === null || val === '') return 0;
  const str = String(val).replace(/,/g, '').trim();
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

function extractCounty(name) {
  const match = name.match(/^(.+?[县旗盟])/);
  return match ? match[1] : name;
}

router.post('/sales-import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传 Excel 文件' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const bizKeywords = ['合作伙伴', '旗县', '盟市', '联系人', '电话', '销售状态'];

    // 遍历所有 Sheet，找到真正的数据表
    let rows = [];
    let sheetName = '';
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (rawData.length === 0) continue;

      // 跳过前面的空行和合并标题行，找到真正的列名行
      let headerRow = null;
      let headerIndex = -1;
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        const nonEmpty = row.filter(c => c && c.toString().trim()).length;
        // 至少有3个非空列才算可能的列名行，且不能全是 __EMPTY
        if (nonEmpty >= 3 && !row.some(c => c.toString().startsWith('__EMPTY'))) {
          headerRow = row;
          headerIndex = i;
          break;
        }
      }
      if (!headerRow) continue;

      // 检查是否有业务关键词
      const hasBiz = headerRow.some(c => bizKeywords.some(k => c.toString().includes(k)));
      if (!hasBiz) continue;

      // 用找到的列名构建数据行
      sheetName = name;
      const headers = headerRow.map(h => h.toString().trim());
      console.log(`Sheet「${name}」列名在第${headerIndex + 1}行:`, headers);
      for (let i = headerIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        // 跳过完全空的行
        if (!row.some(c => c && c.toString().trim())) continue;
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = row[idx] !== undefined ? row[idx] : ''; });
        rows.push(obj);
      }
      break; // 找到了就用第一个符合条件的 Sheet
    }

    console.log('使用的 Sheet:', sheetName);
    if (rows.length === 0) {
      // 诊断信息：列出所有 Sheet 和列
      const diag = workbook.SheetNames.map(name => {
        const s = workbook.Sheets[name];
        const r = xlsx.utils.sheet_to_json(s, { defval: '' });
        const cols = r.length > 0 ? Object.keys(r[0]) : [];
        return { name, rows: r.length, cols };
      });
      return res.json({
        success: false,
        message: 'Excel 文件为空（未找到有效数据表）',
        data: { sheets: diag }
      });
    }

    // 打印第一行列名用于调试
    const rawColumns = Object.keys(rows[0]);
    console.log('检测到的列名:', rawColumns);
    console.log('第一行数据:', rows[0]);

    // 清理列名：去全角空格、零宽字符、普通空格
    const clean = (s) => s.replace(/[\s\u00A0\u2000-\u200F\u2028-\u202F\uFEFF]+/g, '');

    // 建立 原始列名 → 原始列名 的映射
    const matchCol = (names) => {
      for (const raw of rawColumns) {
        const t = clean(raw);
        for (const n of names) {
          if (t.includes(n) || n.includes(t)) return raw;
        }
      }
      return null;
    };

    const matchedCols = {
      city: matchCol(['盟市名称', '盟市', '城市', '地区', '地市']),
      county: matchCol(['合作伙伴名称', '合作伙伴', '合作方', '客户名称', '客户名', '单位名称', '旗县名称', '旗县', '区县', '县区']),
      contact: matchCol(['联系人', '姓名', '客户名单']),
      phone: matchCol(['电话', '联系电话', '手机', '手机号']),
      manager: matchCol(['负责人', '经理', 'owner']),
      intention: matchCol(['销售状态', '意向度', '意向', '阶段', '状态']),
      requirement: matchCol(['公司级支持需求', '需求', '需求描述', '备注', '说明']),
      sales: matchCol(['本月回款金额', '预计总回款额', '销售额', '销售金额', '金额', '成交额']),
      customers: matchCol(['站点数', '客户数', '客户数量', '人数']),
      deal: matchCol(['成功/放弃', '是否成交', '成交', '成交状态', '是否成单']),
    };
    console.log('列名匹配结果:', matchedCols);

    const { pool } = req.app.locals;
    let createdCities = 0;
    let createdCounties = 0;
    let importedRows = 0;

    // 如果旗县未匹配到，直接返回诊断信息
    if (!matchedCols.county) {
      return res.json({
        success: false,
        message: '无法识别列名：找不到旗县名称列',
        data: {
          detectedColumns: rawColumns,
          detectedColumnsHex: rawColumns.map(c => Buffer.from(c, 'utf8').toString('hex')),
          detectedColumnsCode: rawColumns.map(c => c.split('').map(ch => ch.charCodeAt(0))),
          matched: matchedCols
        }
      });
    }

    for (const row of rows) {
      const rawCityName = matchedCols.city ? String(row[matchedCols.city]).trim() : '';
      const rawCountyName = String(row[matchedCols.county]).trim();
      // 从合作伙伴名称提取旗县前缀（如"凉城县永兴镇"→"凉城县"），用于分组
      const countyName = extractCounty(rawCountyName);
      const townName = rawCountyName;
      const contactPerson = matchedCols.contact ? String(row[matchedCols.contact]).trim() : '';
      const contactPhone = matchedCols.phone ? String(row[matchedCols.phone]).trim() : '';
      const manager = matchedCols.manager ? String(row[matchedCols.manager]).trim() : '';
      const intention = matchedCols.intention ? (row[matchedCols.intention] ?? 1) : 1;
      const requirement = matchedCols.requirement ? String(row[matchedCols.requirement]).trim() : '';
      const sales = matchedCols.sales ? parseNum(row[matchedCols.sales]) : 0;
      const customers = matchedCols.customers ? parseInt(String(row[matchedCols.customers]).replace(/,/g, '')) || 0 : 0;
      const isDealed = matchedCols.deal ? String(row[matchedCols.deal]).trim() : '';

      if (!countyName) {
        continue;
      }

      // 盟市名推断：优先用匹配到的盟市列，否则从已有旗县反查，否则用旗县名
      let cityName = rawCityName;
      if (!cityName) {
        const [existingCounty] = await pool.execute(
          `SELECT c.id as cid, c.name as cityName
           FROM county_sales cs
           JOIN city_sales c ON cs.cityId = c.id
           WHERE cs.name = ? LIMIT 1`,
          [countyName]
        );
        if (existingCounty.length > 0) {
          cityName = existingCounty[0].cityName;
        } else {
          cityName = countyName;
        }
      }

      // 查找或创建盟市
      let [cityRows] = await pool.execute('SELECT id, sales, customers FROM city_sales WHERE name = ?', [cityName]);
      let cityId;
      if (cityRows.length === 0) {
        const [result] = await pool.execute(
          'INSERT INTO city_sales (name, sales, customers, growthRate, createdAt) VALUES (?, ?, ?, 0, ?)',
          [cityName, sales, customers, new Date().toISOString().replace('T', ' ').replace('Z', '')]
        );
        cityId = result.insertId;
        createdCities++;
      } else {
        cityId = cityRows[0].id;
        await pool.execute(
          'UPDATE city_sales SET sales = sales + ?, customers = customers + ? WHERE id = ?',
          [sales, customers, cityId]
        );
      }

      // 查找或创建旗县
      let [countyRows] = await pool.execute(
        'SELECT id, sales, customers FROM county_sales WHERE cityId = ? AND name = ?',
        [cityId, countyName]
      );
      let countyId;
      if (countyRows.length === 0) {
        const [result] = await pool.execute(
          'INSERT INTO county_sales (cityId, name, sales, customers, createdAt) VALUES (?, ?, ?, ?, ?)',
          [cityId, countyName, sales, customers, new Date().toISOString().replace('T', ' ').replace('Z', '')]
        );
        countyId = result.insertId;
        createdCounties++;
      } else {
        countyId = countyRows[0].id;
        await pool.execute(
          'UPDATE county_sales SET sales = sales + ?, customers = customers + ? WHERE id = ?',
          [sales, customers, countyId]
        );
      }

      // 插入乡镇销售记录
      const dealStatus = (isDealed === '是' || isDealed === 'true' || isDealed === '1') ? 1 : 0;
      const stageId = dealStatus ? 5 : parseStage(intention);

      await pool.execute(
        `INSERT INTO town_sales (countyId, name, contactPerson, contactPhone, manager, intention, requirement, isDealed, sales, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [countyId, townName, contactPerson, contactPhone, manager, stageId, requirement, dealStatus, sales,
         new Date().toISOString().replace('T', ' ').replace('Z', '')]
      );

      importedRows++;
    }

    // 重新计算销售漏斗汇总数据
    await pool.execute('DELETE FROM sales_funnel_data');

    for (let stageId = 1; stageId <= 5; stageId++) {
      const [stageRows] = await pool.execute(
        'SELECT COUNT(*) as cnt, COALESCE(SUM(sales), 0) as amt FROM town_sales WHERE intention = ?',
        [stageId]
      );
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date().toISOString().replace('T', ' ').replace('Z', '');
      await pool.execute(
        'INSERT INTO sales_funnel_data (stageId, count, amount, date, createdAt) VALUES (?, ?, ?, ?, ?)',
        [stageId, stageRows[0].cnt, stageRows[0].amt, today, now]
      );
    }

    res.json({
      success: true,
      message: `导入成功：共处理 ${importedRows} 条记录，新建 ${createdCities} 个盟市、${createdCounties} 个旗县`,
      data: { importedRows, createdCities, createdCounties }
    });

  } catch (error) {
    console.error('导入销售数据失败:', error);
    res.status(500).json({ success: false, message: '导入失败: ' + error.message });
  }
});

export default router;
