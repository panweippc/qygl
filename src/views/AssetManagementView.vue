<template>
  <div class="asset-mgmt-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友智慧办公平台</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/asset-management" class="nav-item active">资产管理</router-link>
        <button class="nav-item logout-btn" @click="handleBack">返回</button>
      </nav>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <div class="content-wrapper">
        <el-tabs v-model="activeTab" class="asset-tabs">
          <!-- ============ 概览 ============ -->
          <el-tab-pane label="概览" name="overview">
            <div class="kpi-row">
              <div class="kpi-card" v-for="k in kpiCards" :key="k.label" :style="{ borderTopColor: k.color }">
                <div class="kpi-value">{{ k.value }}</div>
                <div class="kpi-label">{{ k.label }}</div>
              </div>
            </div>
            <div class="chart-row">
              <el-card class="chart-card" shadow="never">
                <template #header><span class="chart-title">资产状态分布</span></template>
                <div ref="statusChart" class="chart-box"></div>
              </el-card>
              <el-card class="chart-card" shadow="never">
                <template #header><span class="chart-title">资产类型分布</span></template>
                <div ref="typeChart" class="chart-box"></div>
              </el-card>
            </div>
            <el-card class="warn-card" shadow="never">
              <template #header>
                <span class="chart-title">无形资产到期预警（30 天内）</span>
                <span class="warn-count">{{ summary.expiringIntangibles.length }}</span>
              </template>
              <el-table :data="summary.expiringIntangibles" v-loading="summaryLoading" empty-text="暂无临近到期资产">
                <el-table-column prop="assetCode" label="资产编号" width="140" />
                <el-table-column prop="name" label="名称" />
                <el-table-column prop="expireDate" label="到期日" width="130" />
                <el-table-column label="剩余天数" width="120">
                  <template #default="{ row }">
                    <el-tag :type="row.daysLeft <= 7 ? 'danger' : 'warning'" size="small">{{ row.daysLeft }} 天</el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-tab-pane>

          <!-- ============ 资产台账 ============ -->
          <el-tab-pane label="资产台账" name="ledger">
            <div class="section-header">
              <el-radio-group v-model="ledgerType" @change="currentPage = 1">
                <el-radio label="fixed">固定资产</el-radio>
                <el-radio label="intangible">无形资产</el-radio>
                <el-radio label="consumable">耗材库存</el-radio>
              </el-radio-group>
              <el-button type="primary" @click="openAddDialog" class="add-btn">新增资产</el-button>
            </div>

            <div class="search-filter">
              <el-input v-model="ledgerKeyword" placeholder="搜索名称/编号/责任人" prefix-icon="Search" class="search-input" />
            </div>

            <el-table :data="pagedLedger" style="width:100%" class="asset-table" v-loading="loading">
              <el-table-column label="序号" width="60">
                <template #default="{ $index }">{{ (currentPage - 1) * pageSize + $index + 1 }}</template>
              </el-table-column>
              <el-table-column prop="assetCode" label="资产编号" width="130" />
              <el-table-column prop="name" label="名称" />
              <el-table-column prop="categoryName" label="分类" width="110" />
              <el-table-column prop="spec" label="规格型号" width="120" />
              <el-table-column prop="responsibleUser" label="责任人" width="90" />
              <el-table-column prop="department" label="部门" width="90" />
              <el-table-column label="状态" width="90">
                <template #default="{ row }"><el-tag :type="statusTag(row.status)" size="small">{{ row.status }}</el-tag></template>
              </el-table-column>
              <!-- 固定资产：位置/原值 -->
              <template v-if="ledgerType === 'fixed'">
                <el-table-column prop="location" label="位置" width="120" />
                <el-table-column label="原值(元)" width="110">
                  <template #default="{ row }">{{ row.originalValue }}</template>
                </el-table-column>
              </template>
              <!-- 无形资产：到期/续费提醒 -->
              <template v-else-if="ledgerType === 'intangible'">
                <el-table-column label="到期日" width="120">
                  <template #default="{ row }">
                    <span :class="expireClass(row.expireDate)">{{ row.expireDate || '—' }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="carrier" label="载体/账号" width="160" />
              </template>
              <!-- 耗材库存：数量/可用/预警 -->
              <template v-else>
                <el-table-column label="数量" width="100">
                  <template #default="{ row }">
                    <span>{{ row.quantity }} {{ row.unit }}</span>
                    <el-tag v-if="row.quantity <= lowStockThreshold" type="danger" size="small" style="margin-left:6px">预警</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="可用" width="80">
                  <template #default="{ row }">{{ row.availableQuantity == null ? row.quantity : row.availableQuantity }} {{ row.unit }}</template>
                </el-table-column>
              </template>
              <el-table-column label="操作" width="320" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" @click="viewDetail(row)" class="edit-btn">详情</el-button>
                  <el-button v-if="row.status === '闲置' && (row.assetType !== 'consumable' || (row.availableQuantity == null ? row.quantity : row.availableQuantity) > 0)" size="small" type="primary" @click="quickOp(row, '领用')" class="edit-btn">领用</el-button>
                  <el-button v-if="row.status === '在用'" size="small" @click="quickOp(row, '归还')" class="edit-btn">归还</el-button>
                  <el-button size="small" @click="editAsset(row)" class="edit-btn">编辑</el-button>
                  <el-button size="small" @click="removeAsset(row.id)" class="delete-btn">删除</el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="pagination">
              <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize"
                :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper"
                :total="ledgerAssets.length" @size-change="handleSizeChange" @current-change="handleCurrentChange" />
            </div>
          </el-tab-pane>

          <!-- ============ 资产盘点 ============ -->
          <el-tab-pane label="资产盘点" name="inventory">
            <div class="section-header">
              <h2 class="section-title"><span class="title-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM16 14H8V12H16V14ZM16 10H8V8H16V10Z"/></svg></span>资产盘点</h2>
              <el-button type="primary" @click="createInventorySheet" class="add-btn">新建盘点单</el-button>
            </div>
            <el-table :data="inventories" style="width:100%" class="asset-table" v-loading="invLoading">
              <el-table-column prop="inventoryNo" label="盘点单号" width="160" />
              <el-table-column prop="title" label="标题" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }"><el-tag :type="row.status==='已完成'?'success':'warning'" size="small">{{ row.status }}</el-tag></template>
              </el-table-column>
              <el-table-column prop="itemCount" label="明细数" width="90" />
              <el-table-column prop="diffCount" label="差异数" width="90">
                <template #default="{ row }"><span :class="row.diffCount>0?'diff-red':'diff-ok'">{{ row.diffCount }}</span></template>
              </el-table-column>
              <el-table-column prop="operator" label="盘点人" width="100" />
              <el-table-column prop="createdAt" label="创建时间" width="170" />
              <el-table-column label="操作" width="160" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" @click="openInventory(row)" class="edit-btn">盘点</el-button>
                  <el-button v-if="row.status!=='已完成'" size="small" type="success" @click="completeInv(row)" class="edit-btn">完成</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <!-- ============ 统计分析 ============ -->
          <el-tab-pane label="统计分析" name="stats">
            <div class="section-header">
              <h2 class="section-title">部门资产统计</h2>
              <el-button type="primary" @click="exportExcel" class="add-btn">导出 Excel</el-button>
            </div>
            <el-table :data="summary.deptStats" style="width:100%" class="asset-table" v-loading="loading">
              <el-table-column prop="department" label="部门" />
              <el-table-column prop="total" label="数量" width="90" />
              <el-table-column prop="inUse" label="在用" width="80" />
              <el-table-column prop="idle" label="闲置" width="80" />
              <el-table-column prop="repair" label="维修" width="80" />
              <el-table-column prop="scrap" label="报废" width="80" />
              <el-table-column label="原值合计(元)" width="150">
                <template #default="{ row }">{{ Number(row.originalSum || 0).toFixed(2) }}</template>
              </el-table-column>
              <el-table-column label="残值合计(元)" width="150">
                <template #default="{ row }">{{ Number(row.residualSum || 0).toFixed(2) }}</template>
              </el-table-column>
            </el-table>
            <div class="chart-row" style="margin-top:16px">
              <el-card class="chart-card" shadow="never">
                <template #header><span class="chart-title">分类分布</span></template>
                <div ref="categoryChart" class="chart-box"></div>
              </el-card>
              <el-card class="chart-card" shadow="never">
                <template #header><span class="chart-title">月度入库趋势</span></template>
                <div ref="trendChart" class="chart-box"></div>
              </el-card>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content"><p>© 2026 企业管理系统 | 科技赋能未来</p></div>
    </footer>

    <!-- 新增/编辑 -->
    <el-dialog v-model="formVisible" :title="form.id ? '编辑资产' : '新增资产'" width="680px" class="dialog">
      <el-form :model="form" label-position="top">
        <el-alert v-if="!form.id" type="info" :closable="false" show-icon
          title="新增资产默认状态为「闲置（在库）」，领用 / 报废等操作请在资产详情中执行" style="margin-bottom:14px" />
        <el-form-item label="资产名称"><el-input v-model="form.name" placeholder="请输入资产名称" /></el-form-item>
        <el-form-item label="资产类型">
          <el-select v-model="form.assetType" placeholder="请选择资产类型" @change="onTypeChange">
            <el-option label="固定资产" value="fixed" />
            <el-option label="无形资产" value="intangible" />
            <el-option label="耗材库存" value="consumable" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.categoryId" placeholder="请选择分类" filterable allow-create default-first-option>
            <el-option v-for="c in filteredCategories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="规格型号"><el-input v-model="form.spec" placeholder="型号 / 规格" /></el-form-item>

        <!-- 固定资产 -->
        <template v-if="form.assetType === 'fixed'">
          <div style="display:flex;gap:12px">
            <el-form-item label="批量入库数量" style="flex:1">
              <el-input v-model.number="form.batchCount" type="number" :min="1" />
            </el-form-item>
            <el-form-item label="单位" style="flex:1"><el-input v-model="form.unit" placeholder="台/套" /></el-form-item>
          </div>
          <el-form-item label="序列号(SN)"><el-input v-model="form.sn" placeholder="单台序列号（批量入库时可留空）" /></el-form-item>
          <div style="display:flex;gap:12px">
            <el-form-item label="单价(元)" style="flex:1"><el-input v-model.number="form.unitPrice" type="number" /></el-form-item>
            <el-form-item label="原值(元)" style="flex:1"><el-input v-model.number="form.originalValue" type="number" /></el-form-item>
          </div>
          <div style="display:flex;gap:12px">
            <el-form-item label="残值(元)" style="flex:1"><el-input v-model.number="form.residualValue" type="number" /></el-form-item>
            <el-form-item label="折旧方式" style="flex:1"><el-input v-model="form.depMethod" placeholder="如：直线法" /></el-form-item>
          </div>
          <el-form-item label="折旧年限(年)"><el-input v-model.number="form.usefulLifeYears" type="number" placeholder="如：5" /></el-form-item>
          <div style="display:flex;gap:12px">
            <el-form-item label="供应商" style="flex:1"><el-input v-model="form.supplier" /></el-form-item>
            <el-form-item label="发票号" style="flex:1"><el-input v-model="form.invoiceNo" /></el-form-item>
          </div>
          <el-form-item label="保修到期日"><el-date-picker v-model="form.warrantyDate" type="date" style="width:100%" value-format="YYYY-MM-DD" /></el-form-item>
          <el-form-item label="存放位置"><el-input v-model="form.location" /></el-form-item>
        </template>

        <!-- 无形资产 -->
        <template v-else-if="form.assetType === 'intangible'">
          <el-form-item label="载体/账号"><el-input v-model="form.carrier" placeholder="证书路径 / 授权账号等" /></el-form-item>
          <el-form-item label="账号密钥"><el-input v-model="form.accountKey" type="textarea" :rows="2" placeholder="账号 / 密钥信息" /></el-form-item>
          <div style="display:flex;gap:12px">
            <el-form-item label="到期日" style="flex:1"><el-date-picker v-model="form.expireDate" type="date" style="width:100%" value-format="YYYY-MM-DD" /></el-form-item>
            <el-form-item label="续费提醒日" style="flex:1"><el-date-picker v-model="form.renewNoticeDate" type="date" style="width:100%" value-format="YYYY-MM-DD" /></el-form-item>
          </div>
          <div style="display:flex;gap:12px">
            <el-form-item label="原值(元)" style="flex:1"><el-input v-model.number="form.originalValue" type="number" /></el-form-item>
            <el-form-item label="摊销方式" style="flex:1"><el-input v-model="form.depMethod" placeholder="如：直线法" /></el-form-item>
          </div>
          <el-form-item label="摊销年限(年)"><el-input v-model.number="form.usefulLifeYears" type="number" placeholder="如：3" /></el-form-item>
          <div style="display:flex;gap:12px">
            <el-form-item label="供应商" style="flex:1"><el-input v-model="form.supplier" /></el-form-item>
            <el-form-item label="发票号" style="flex:1"><el-input v-model="form.invoiceNo" /></el-form-item>
          </div>
        </template>

        <!-- 耗材库存 -->
        <template v-else>
          <div style="display:flex;gap:12px">
            <el-form-item label="数量" style="flex:1"><el-input v-model.number="form.quantity" type="number" :min="1" @change="syncAvail" /></el-form-item>
            <el-form-item label="单位" style="flex:1"><el-input v-model="form.unit" placeholder="个/盒/包" /></el-form-item>
          </div>
          <div style="display:flex;gap:12px">
            <el-form-item label="单价(元)" style="flex:1"><el-input v-model.number="form.unitPrice" type="number" /></el-form-item>
            <el-form-item label="原值合计(元)" style="flex:1"><el-input v-model.number="form.originalValue" type="number" /></el-form-item>
          </div>
          <el-form-item label="可用数量（默认=数量，可调整）"><el-input v-model.number="form.availableQuantity" type="number" :min="0" /></el-form-item>
          <div style="display:flex;gap:12px">
            <el-form-item label="供应商" style="flex:1"><el-input v-model="form.supplier" /></el-form-item>
            <el-form-item label="发票号" style="flex:1"><el-input v-model="form.invoiceNo" /></el-form-item>
          </div>
          <el-form-item label="存放位置"><el-input v-model="form.location" /></el-form-item>
        </template>

        <!-- 通用 -->
        <div style="display:flex;gap:12px">
          <el-form-item label="责任人" style="flex:1">
            <el-select v-model="form.responsibleUser" filterable allow-create default-first-option placeholder="选择或输入责任人">
              <el-option v-for="e in options.employees" :key="e" :label="e" :value="e" />
            </el-select>
          </el-form-item>
          <el-form-item label="使用部门" style="flex:1">
            <el-select v-model="form.department" filterable allow-create default-first-option placeholder="选择或输入部门">
              <el-option v-for="d in options.departments" :key="d" :label="d" :value="d" />
            </el-select>
          </el-form-item>
        </div>
        <div style="display:flex;gap:12px">
          <el-form-item label="获取日期" style="flex:1"><el-date-picker v-model="form.acquireDate" type="date" style="width:100%" value-format="YYYY-MM-DD" /></el-form-item>
          <el-form-item label="来源" style="flex:1"><el-input v-model="form.source" placeholder="采购/赠送/自建/调拨" /></el-form-item>
        </div>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="formVisible = false">取消</el-button>
          <el-button type="primary" @click="saveAsset">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 详情 + 生命周期 + 二维码 -->
    <el-dialog v-model="detailVisible" title="资产详情" width="720px" class="dialog detail-dialog">
      <template v-if="detail">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="资产编号">{{ detail.asset.assetCode }}</el-descriptions-item>
          <el-descriptions-item label="名称">{{ detail.asset.name }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ typeLabel(detail.asset.assetType) }}</el-descriptions-item>
          <el-descriptions-item label="分类">{{ detail.asset.categoryName }}</el-descriptions-item>
          <el-descriptions-item label="规格型号">{{ detail.asset.spec || '—' }}</el-descriptions-item>
          <el-descriptions-item label="序列号">{{ detail.asset.sn || '—' }}</el-descriptions-item>
          <el-descriptions-item label="责任人">{{ detail.asset.responsibleUser || '—' }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ detail.asset.department || '—' }}</el-descriptions-item>
          <el-descriptions-item label="状态"><el-tag :type="statusTag(detail.asset.status)" size="small">{{ detail.asset.status }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="数量">{{ detail.asset.quantity }} {{ detail.asset.unit }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.asset.assetType === 'consumable'" label="可用数量">{{ detail.asset.availableQuantity == null ? detail.asset.quantity : detail.asset.availableQuantity }} {{ detail.asset.unit }}</el-descriptions-item>
          <el-descriptions-item label="原值">{{ detail.asset.originalValue }}</el-descriptions-item>
          <el-descriptions-item label="残值">{{ detail.asset.residualValue }}</el-descriptions-item>
          <el-descriptions-item label="折旧/摊销方式">{{ detail.asset.depMethod || '—' }}</el-descriptions-item>
          <el-descriptions-item label="折旧/摊销年限">{{ detail.asset.usefulLifeYears || '—' }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ detail.asset.supplier || '—' }}</el-descriptions-item>
          <el-descriptions-item label="发票号">{{ detail.asset.invoiceNo || '—' }}</el-descriptions-item>
          <el-descriptions-item label="获取日期">{{ detail.asset.acquireDate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="保修到期日">{{ detail.asset.warrantyDate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="载体">{{ detail.asset.carrier || '—' }}</el-descriptions-item>
          <el-descriptions-item label="账号密钥">{{ detail.asset.accountKey || '—' }}</el-descriptions-item>
          <el-descriptions-item label="到期日">{{ detail.asset.expireDate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="续费提醒日">{{ detail.asset.renewNoticeDate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="存放位置">{{ detail.asset.location || '—' }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ detail.asset.remark || '—' }}</el-descriptions-item>
        </el-descriptions>
        <div style="margin-top:18px">
          <div style="font-weight:600;margin-bottom:10px">生命周期轨迹</div>
          <el-timeline>
            <el-timeline-item v-for="log in detail.logs" :key="log.id" :timestamp="log.opDate || log.createdAt" placement="top">
              <div><b>{{ log.action }}</b> <span v-if="log.fromStatus && log.fromStatus !== log.toStatus">（{{ log.fromStatus }} → {{ log.toStatus }}）</span> <span v-if="log.qty && log.qty !== 1">×{{ log.qty }}</span></div>
              <div style="color:#888;font-size:12px">
                {{ log.operator }}
                <span v-if="log.recipient"> · 领用：{{ log.recipient }}({{ log.recipientDept }})</span>
                <span v-if="log.purpose"> · {{ log.purpose }}</span>
                <span v-if="log.disposal"> · 处置：{{ log.disposal }}</span>
                <span v-if="log.vendor"> · {{ log.vendor }}</span>
                <span v-if="log.planDate"> · 预计：{{ log.planDate }}</span>
              </div>
              <div v-if="log.detail" style="color:#888;font-size:12px">· {{ log.detail }}</div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-if="!detail.logs.length" description="暂无轨迹" />
        </div>
        <div style="margin-top:14px">
          <span style="font-weight:600;margin-right:8px">资产操作：</span>
          <!-- 领用 / 归还为高频操作，已上提到列表行内快捷按钮；详情只保留低频操作，按状态显示 -->
          <template v-if="detail.asset.status !== '报废'">
            <el-button v-if="detail.asset.status === '闲置' || detail.asset.status === '在用'" size="small" @click="openOp('维修')">维修</el-button>
            <el-button v-if="detail.asset.status === '维修'" size="small" type="primary" @click="openOp('恢复')">恢复</el-button>
            <el-button size="small" type="danger" @click="openOp('报废')">报废</el-button>
          </template>
          <span v-else style="color:#888;font-size:12px">该资产已报废，无可用操作</span>
          <el-button size="small" type="primary" plain @click="genQR" style="margin-left:8px">生成资产二维码</el-button>
        </div>
        <div v-if="qrUrl" style="margin-top:14px;text-align:center">
          <img :src="qrUrl" alt="资产二维码" style="width:160px;height:160px;border:1px solid #ddd;border-radius:8px;padding:8px" />
          <div style="font-size:12px;color:#888;margin-top:6px">{{ detail.asset.assetCode }}</div>
        </div>
      </template>
    </el-dialog>

    <!-- 资产操作（领用 / 归还 / 维修 / 恢复 / 报废） -->
    <el-dialog v-model="opVisible" :title="'资产' + opForm.action" width="480px" class="dialog">
      <el-form label-position="top">
        <template v-if="opForm.action === '领用'">
          <el-form-item label="责任人">
            <el-select v-model="opForm.responsibleUser" filterable allow-create default-first-option placeholder="选择或输入责任人">
              <el-option v-for="e in options.employees" :key="e" :label="e" :value="e" />
            </el-select>
          </el-form-item>
          <el-form-item label="使用部门">
            <el-select v-model="opForm.department" filterable allow-create default-first-option placeholder="选择或输入部门">
              <el-option v-for="d in options.departments" :key="d" :label="d" :value="d" />
            </el-select>
          </el-form-item>
          <el-form-item label="领用日期"><el-date-picker v-model="opForm.opDate" type="date" value-format="YYYY-MM-DD" placeholder="默认今天" style="width:100%" /></el-form-item>
          <el-form-item label="预计归还日期"><el-date-picker v-model="opForm.planDate" type="date" value-format="YYYY-MM-DD" placeholder="借用场景填写，长期领用可留空" style="width:100%" /></el-form-item>
          <el-form-item label="用途 / 事由"><el-input v-model="opForm.purpose" placeholder="领用用途或事由" /></el-form-item>
          <el-form-item label="领用后存放位置"><el-input v-model="opForm.location" placeholder="留空则沿用当前位置" /></el-form-item>
          <el-form-item v-if="detail && detail.asset.assetType === 'consumable'" label="领用数量">
            <el-input v-model.number="opForm.qty" type="number" :min="1" />
          </el-form-item>
        </template>
        <template v-else-if="opForm.action === '归还'">
          <el-form-item v-if="detail && detail.asset.assetType === 'consumable'" label="归还数量">
            <el-input v-model.number="opForm.qty" type="number" :min="1" />
          </el-form-item>
          <el-form-item label="归还日期"><el-date-picker v-model="opForm.opDate" type="date" value-format="YYYY-MM-DD" placeholder="默认今天" style="width:100%" /></el-form-item>
          <el-form-item label="归还后存放位置"><el-input v-model="opForm.location" placeholder="留空则沿用当前位置" /></el-form-item>
          <el-form-item label="备注"><el-input v-model="opForm.purpose" placeholder="可选" /></el-form-item>
          <span v-if="!(detail && detail.asset.assetType === 'consumable')" style="color:#888">固定资产归还后将恢复为「闲置（在库）」状态</span>
        </template>
        <template v-else-if="opForm.action === '维修'">
          <el-form-item label="故障描述"><el-input v-model="opForm.purpose" type="textarea" :rows="2" placeholder="故障现象 / 维修原因" /></el-form-item>
          <el-form-item label="送修日期"><el-date-picker v-model="opForm.opDate" type="date" value-format="YYYY-MM-DD" placeholder="默认今天" style="width:100%" /></el-form-item>
          <el-form-item label="预计完成日期"><el-date-picker v-model="opForm.planDate" type="date" value-format="YYYY-MM-DD" placeholder="可选" style="width:100%" /></el-form-item>
          <el-form-item label="维修供应商"><el-input v-model="opForm.vendor" placeholder="送修单位 / 联系人，可选" /></el-form-item>
        </template>
        <template v-else-if="opForm.action === '报废'">
          <el-form-item v-if="detail && detail.asset.assetType === 'consumable'" label="报废数量">
            <el-input v-model.number="opForm.qty" type="number" :min="1" />
          </el-form-item>
          <el-form-item label="报废原因"><el-input v-model="opForm.purpose" type="textarea" :rows="2" placeholder="报废原因说明" /></el-form-item>
          <el-form-item label="处置方式">
            <el-select v-model="opForm.disposal" placeholder="选择处置方式" style="width:100%">
              <el-option label="变卖" value="变卖" />
              <el-option label="销毁" value="销毁" />
              <el-option label="回收" value="回收" />
              <el-option label="捐赠" value="捐赠" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
          <el-form-item label="报废日期"><el-date-picker v-model="opForm.opDate" type="date" value-format="YYYY-MM-DD" placeholder="默认今天" style="width:100%" /></el-form-item>
          <el-form-item label="处置方"><el-input v-model="opForm.vendor" placeholder="回收 / 处置单位，可选" /></el-form-item>
          <span style="color:#c0504d">确认将该资产{{ detail && detail.asset.assetType === 'consumable' ? '的对应数量' : '' }}标记为报废？此操作会记录到生命周期轨迹。</span>
        </template>
        <template v-else-if="opForm.action === '恢复'">
          <el-form-item label="恢复日期"><el-date-picker v-model="opForm.opDate" type="date" value-format="YYYY-MM-DD" placeholder="默认今天" style="width:100%" /></el-form-item>
          <el-form-item label="备注"><el-input v-model="opForm.purpose" placeholder="可选" /></el-form-item>
        </template>
        <span v-else style="color:#888">确认执行「{{ opForm.action }}」操作？</span>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="opVisible = false">取消</el-button>
          <el-button type="primary" @click="submitOp">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 盘点明细 -->
    <el-dialog v-model="invVisible" :title="invDetail.inventory ? invDetail.inventory.inventoryNo + ' 盘点明细' : '盘点明细'" width="820px" class="dialog">
      <template v-if="invDetail.inventory">
        <div style="margin-bottom:12px;color:#666;font-size:13px">
          标题：{{ invDetail.inventory.title }} ｜ 状态：{{ invDetail.inventory.status }} ｜ 盘点人：{{ invDetail.inventory.operator }}
        </div>
        <el-table :data="invDetail.items" style="width:100%" max-height="420">
          <el-table-column prop="assetCode" label="编号" width="130" />
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="bookQuantity" label="账面" width="80" />
          <el-table-column label="实盘" width="120">
            <template #default="{ row }">
              <el-input v-model.number="row.actualQuantity" type="number" size="small" :disabled="invDetail.inventory.status==='已完成'"
                placeholder="未盘" @change="recalcDiff(row)" />
            </template>
          </el-table-column>
          <el-table-column label="差异" width="80">
            <template #default="{ row }"><span :class="row.diff>0?'diff-red':(row.diff<0?'diff-blue':'diff-ok')">{{ row.diff }}</span></template>
          </el-table-column>
          <el-table-column label="备注" width="160">
            <template #default="{ row }"><el-input v-model="row.note" size="small" :disabled="invDetail.inventory.status==='已完成'" /></template>
          </el-table-column>
        </el-table>
      </template>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="invVisible=false">关闭</el-button>
          <el-button v-if="invDetail.inventory && invDetail.inventory.status!=='已完成'" type="primary" @click="saveInvItems">保存盘点</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import * as XLSX from 'xlsx'
import QRCode from 'qrcode'
import {
  getAssets, getAsset, addAsset, updateAsset, deleteAsset as apiDeleteAsset, getAssetCategories,
  getAssetSummary, getInventories, createInventory, getInventory, updateInventoryItems, completeInventory,
  getAssetOptions, assetIssue, assetReturn, assetRepair, assetRestore, assetScrap,
  type Asset, type AssetLog, type AssetSummary, type AssetInventory, type AssetInventoryItem
} from '../services/api'

const router = useRouter()
const route = useRoute()
const handleBack = () => router.back()

const STATUS_LIST = ['在用', '领用', '闲置', '维修', '报废']
const typeLabel = (t: string) => ({ fixed: '固定资产', intangible: '无形资产', consumable: '耗材库存' }[t] || t)
const statusTag = (s: string): any => ({ '在用': 'success', '领用': 'warning', '闲置': 'info', '维修': 'warning', '报废': 'danger' }[s] || 'info')
const lowStockThreshold = 5
const expireClass = (d: string) => {
  if (!d) return ''
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  if (days <= 7) return 'expire-red'
  if (days <= 30) return 'expire-orange'
  return 'expire-normal'
}

const activeTab = ref('overview')
const assets = ref<Asset[]>([])
const categories = ref<any[]>([])
const options = reactive<{ departments: string[]; employees: string[] }>({ departments: [], employees: [] })
const loading = ref(false)
const summary = reactive<AssetSummary>({
  total: 0, byType: {}, byStatus: {}, depreciationTotal: 0, expiringIntangibles: [],
  deptStats: [], byCategory: [], monthly: []
})
const summaryLoading = ref(false)

const ledgerType = ref('fixed')
const ledgerKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const inventories = ref<AssetInventory[]>([])
const invLoading = ref(false)
const invDetail = reactive<{ inventory: AssetInventory | null; items: AssetInventoryItem[] }>({ inventory: null, items: [] })
const invVisible = ref(false)

const formVisible = ref(false)
const detailVisible = ref(false)
const detail = ref<{ asset: Asset; logs: AssetLog[] } | null>(null)
const qrUrl = ref('')
const opVisible = ref(false)
const opForm = reactive<{ action: string; responsibleUser: string; department: string; qty: number; opDate: string; planDate: string; purpose: string; disposal: string; vendor: string; location: string }>({ action: '', responsibleUser: '', department: '', qty: 1, opDate: '', planDate: '', purpose: '', disposal: '', vendor: '', location: '' })

const statusChart = ref<HTMLElement | null>(null)
const typeChart = ref<HTMLElement | null>(null)
const categoryChart = ref<HTMLElement | null>(null)
const trendChart = ref<HTMLElement | null>(null)

interface AssetForm {
  id: number; assetCode: string; name: string; assetType: string; categoryId: number | null
  quantity: number; unit: string; acquireDate: string; source: string; originalValue: number
  residualValue: number; depMethod: string; responsibleUser: string; department: string
  location: string; carrier: string; accountKey: string; status: string; expireDate: string
  renewNoticeDate: string; remark: string; spec: string; sn: string; unitPrice: number | null
  supplier: string; invoiceNo: string; warrantyDate: string; usefulLifeYears: number | null
  availableQuantity: number | null; batchCount: number
}
const emptyForm = (): AssetForm => ({
  id: 0, assetCode: '', name: '', assetType: 'fixed', categoryId: null, quantity: 1, unit: '台',
  acquireDate: '', source: '', originalValue: 0, residualValue: 0, depMethod: '', responsibleUser: '',
  department: '', location: '', carrier: '', accountKey: '', status: '闲置', expireDate: '', renewNoticeDate: '',
  remark: '', spec: '', sn: '', unitPrice: null, supplier: '', invoiceNo: '', warrantyDate: '',
  usefulLifeYears: null, availableQuantity: null, batchCount: 1
})
const form = ref<AssetForm>(emptyForm())

// 分类按资产类型联动
const filteredCategories = computed(() => categories.value.filter(c => c.parentType === form.value.assetType))
const onTypeChange = () => {
  // 切换类型后，若已选分类不属于新类型则清空
  if (form.value.categoryId != null) {
    const ok = categories.value.some(c => c.id === form.value.categoryId && c.parentType === form.value.assetType)
    if (!ok) form.value.categoryId = null
  }
  if (form.value.assetType === 'fixed') form.value.unit = '台'
  if (form.value.assetType === 'consumable' && form.value.availableQuantity == null) form.value.availableQuantity = form.value.quantity
}
const syncAvail = () => {
  if (form.value.assetType === 'consumable' && form.value.availableQuantity == null) form.value.availableQuantity = form.value.quantity
}

// ============ 数据加载 ============
const loadAssets = async () => {
  loading.value = true
  try {
    const res = await getAssets({})
    if (res.success) assets.value = res.data
    else ElMessage.error('加载资产失败')
  } catch (e) { console.error(e); ElMessage.error('加载资产失败') }
  finally { loading.value = false }
}
const loadCategories = async () => {
  try { const r = await getAssetCategories(); if (r.success) categories.value = r.data } catch (e) { console.error(e) }
}
const loadOptions = async () => {
  try { const r = await getAssetOptions(); if (r.success) { options.departments = r.data.departments; options.employees = r.data.employees } } catch (e) { console.error(e) }
}
const loadSummary = async () => {
  summaryLoading.value = true
  try { const r = await getAssetSummary(); if (r.success) Object.assign(summary, r.data) } catch (e) { console.error(e) }
  finally { summaryLoading.value = false }
}
const loadInventories = async () => {
  invLoading.value = true
  try { const r = await getInventories(); if (r.success) inventories.value = r.data } catch (e) { console.error(e) }
  finally { invLoading.value = false }
}

onMounted(async () => {
  await Promise.all([loadAssets(), loadCategories(), loadOptions(), loadSummary(), loadInventories()])
  if (route.query.action === 'add') openAddDialog()
})

// ============ 概览 KPI + 图表 ============
const kpiCards = computed(() => [
  { label: '资产总数', value: summary.total, color: '#1E5AA8' },
  { label: '固定资产', value: summary.byType.fixed || 0, color: '#5B8FC9' },
  { label: '无形资产', value: summary.byType.intangible || 0, color: '#7C6BD6' },
  { label: '耗材库存', value: summary.byType.consumable || 0, color: '#3FA796' },
  { label: '临近到期(30天)', value: summary.expiringIntangibles.length, color: '#E08A3C' },
  { label: '累计折旧(元)', value: summary.depreciationTotal.toFixed(2), color: '#C0504D' }
])

const renderCharts = () => {
  if (!statusChart.value || !typeChart.value) return
  const statusPie = echarts.init(statusChart.value)
  const statusData = Object.entries(summary.byStatus).map(([k, v]) => ({ name: k, value: v }))
  statusPie.setOption({
    tooltip: { trigger: 'item' }, legend: { bottom: 0 },
    series: [{ type: 'pie', radius: ['40%', '65%'], data: statusData.length ? statusData : [{ name: '暂无', value: 1 }] }]
  })
  const typeBar = echarts.init(typeChart.value)
  const typeKeys = ['fixed', 'intangible', 'consumable']
  typeBar.setOption({
    tooltip: { trigger: 'axis' }, grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: typeKeys.map(typeLabel) },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: typeKeys.map(k => summary.byType[k] || 0), itemStyle: { color: '#1E5AA8' } }]
  })
}

const renderStatsCharts = () => {
  if (!categoryChart.value || !trendChart.value) return
  const pie = echarts.init(categoryChart.value)
  const catData = summary.byCategory.map(c => ({ name: c.categoryName, value: c.count }))
  pie.setOption({
    tooltip: { trigger: 'item' }, legend: { bottom: 0, type: 'scroll' },
    series: [{ type: 'pie', radius: ['40%', '65%'], data: catData.length ? catData : [{ name: '暂无', value: 1 }] }]
  })
  const line = echarts.init(trendChart.value)
  const months = summary.monthly.map(m => m.month)
  const counts = summary.monthly.map(m => m.count)
  line.setOption({
    tooltip: { trigger: 'axis' }, grid: { left: 40, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: months.length ? months : ['无数据'] },
    yAxis: { type: 'value' },
    series: [{ type: 'line', smooth: true, data: counts, itemStyle: { color: '#7C6BD6' }, areaStyle: { opacity: 0.15 } }]
  })
}

watch(activeTab, async (t) => {
  await nextTick()
  if (t === 'overview') renderCharts()
  if (t === 'stats') renderStatsCharts()
})
watch([() => summary.byStatus, () => summary.byType], async () => {
  if (activeTab.value === 'overview') { await nextTick(); renderCharts() }
})
watch([() => summary.deptStats, () => summary.byCategory, () => summary.monthly], async () => {
  if (activeTab.value === 'stats') { await nextTick(); renderStatsCharts() }
})

// ============ 台账 ============
const ledgerAssets = computed(() => {
  const kw = ledgerKeyword.value.trim()
  return assets.value.filter(a =>
    a.assetType === ledgerType.value &&
    (!kw || (a.name || '').includes(kw) || (a.assetCode || '').includes(kw) || (a.responsibleUser || '').includes(kw))
  )
})
const pagedLedger = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return ledgerAssets.value.slice(start, start + pageSize.value)
})
watch([ledgerAssets, pageSize], () => {
  const max = Math.max(1, Math.ceil(ledgerAssets.value.length / pageSize.value))
  if (currentPage.value > max) currentPage.value = max
})

const openAddDialog = () => { form.value = emptyForm(); formVisible.value = true }
const editAsset = (a: Asset) => {
  form.value = { ...emptyForm(), ...a, categoryId: a.categoryId ?? null, availableQuantity: a.availableQuantity ?? null } as AssetForm
  formVisible.value = true
}
const saveAsset = async () => {
  if (!form.value.name) { ElMessage.warning('请输入资产名称'); return }
  // 规范化：固定资产数量恒为 1（由批量入库数量控制）；耗材可用数量默认=数量
  if (form.value.assetType === 'fixed') form.value.quantity = 1
  if (form.value.assetType === 'consumable' && (form.value.availableQuantity == null)) form.value.availableQuantity = form.value.quantity
  loading.value = true
  try {
    const payload = { ...form.value }
    const res = form.value.id ? await updateAsset(payload as any) : await addAsset(payload)
    if (res.success) {
      await Promise.all([loadAssets(), loadSummary()])
      formVisible.value = false
      ElMessage.success(form.value.id ? '更新成功' : '新增成功')
    } else ElMessage.error(res.message || '保存失败')
  } catch (e) { console.error(e); ElMessage.error('保存失败') }
  finally { loading.value = false }
}
const removeAsset = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除该资产吗？相关轨迹也会一并删除。', '警告', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    const res = await apiDeleteAsset(id)
    if (res.success) { await Promise.all([loadAssets(), loadSummary()]); ElMessage.success('删除成功') }
    else ElMessage.error('删除失败')
  } catch (e) { if (e !== 'cancel') console.error(e) }
}
const viewDetail = async (a: Asset) => {
  qrUrl.value = ''
  try {
    const res = await getAsset(a.id)
    if (res.success) { detail.value = res.data; detailVisible.value = true }
    else ElMessage.error('获取详情失败')
  } catch (e) { console.error(e); ElMessage.error('获取详情失败') }
}
const quickOp = async (row: Asset, action: string) => {
  await viewDetail(row)
  detailVisible.value = false
  openOp(action)
}
const genQR = async () => {
  if (!detail.value) return
  try { qrUrl.value = await QRCode.toDataURL(detail.value.asset.assetCode, { width: 160 }) }
  catch (e) { console.error(e); ElMessage.error('生成二维码失败') }
}

// ============ 生命周期操作 ============
const todayStr = () => new Date().toISOString().slice(0, 10)
const openOp = (action: string) => {
  if (!detail.value) return
  opForm.action = action
  opForm.responsibleUser = detail.value.asset.responsibleUser || ''
  opForm.department = detail.value.asset.department || ''
  opForm.qty = 1
  opForm.opDate = todayStr()
  opForm.planDate = ''
  opForm.purpose = ''
  opForm.disposal = ''
  opForm.vendor = ''
  opForm.location = detail.value.asset.location || ''
  opVisible.value = true
}
const submitOp = async () => {
  if (!detail.value) return
  const id = detail.value.asset.id
  const a = detail.value.asset
  if (opForm.action === '报废') {
    try {
      await ElMessageBox.confirm(`确认将资产「${a.name}」${a.assetType === 'consumable' ? `的 ${opForm.qty} ${a.unit}` : ''}标记为报废？`, '报废确认', { type: 'warning', confirmButtonText: '确认报废', cancelButtonText: '取消' })
    } catch (e) { if (e === 'cancel') return }
  }
  loading.value = true
  try {
    let res
    const base = { opDate: opForm.opDate || null, purpose: opForm.purpose || null, location: opForm.location || null }
    if (opForm.action === '领用') res = await assetIssue(id, { responsibleUser: opForm.responsibleUser, department: opForm.department, qty: opForm.qty, planDate: opForm.planDate || null, ...base })
    else if (opForm.action === '归还') res = await assetReturn(id, { qty: opForm.qty, ...base })
    else if (opForm.action === '维修') res = await assetRepair(id, { planDate: opForm.planDate || null, vendor: opForm.vendor || null, ...base })
    else if (opForm.action === '恢复') res = await assetRestore(id, base)
    else if (opForm.action === '报废') res = await assetScrap(id, { qty: opForm.qty, disposal: opForm.disposal || null, vendor: opForm.vendor || null, ...base })
    else res = { success: false, message: '未知操作' }
    if (res.success) {
      await Promise.all([loadAssets(), loadSummary()])
      const r = await getAsset(id)
      if (r.success) detail.value = r.data
      opVisible.value = false
      ElMessage.success(`「${opForm.action}」操作成功`)
    } else ElMessage.error(res.message || '操作失败')
  } catch (e) { console.error(e); ElMessage.error('操作失败') }
  finally { loading.value = false }
}

// ============ 盘点 ============
const createInventorySheet = async () => {
  try {
    const res = await createInventory()
    if (res.success) { await loadInventories(); ElMessage.success('盘点单已创建') }
    else ElMessage.error(res.message || '创建失败')
  } catch (e) { console.error(e); ElMessage.error('创建失败') }
}
const openInventory = async (inv: AssetInventory) => {
  try {
    const res = await getInventory(inv.id)
    if (res.success) {
      invDetail.inventory = res.data.inventory
      invDetail.items = res.data.items.map((it: any) => ({ ...it, actualQuantity: it.actualQuantity === null ? null : it.actualQuantity }))
      invVisible.value = true
    } else ElMessage.error('获取盘点明细失败')
  } catch (e) { console.error(e); ElMessage.error('获取盘点明细失败') }
}
const recalcDiff = (row: any) => {
  const actual = (row.actualQuantity === '' || row.actualQuantity === null || row.actualQuantity === undefined) ? null : Number(row.actualQuantity)
  row.diff = actual === null ? 0 : actual - Number(row.bookQuantity || 0)
}
const saveInvItems = async () => {
  if (!invDetail.inventory) return
  try {
    const items = invDetail.items.map(it => ({ id: it.id, bookQuantity: it.bookQuantity, actualQuantity: it.actualQuantity, note: it.note || '' }))
    const res = await updateInventoryItems(invDetail.inventory.id, items)
    if (res.success) { await loadInventories(); ElMessage.success('盘点明细已保存') }
    else ElMessage.error(res.message || '保存失败')
  } catch (e) { console.error(e); ElMessage.error('保存失败') }
}
const completeInv = async (inv: AssetInventory) => {
  try {
    await ElMessageBox.confirm(`确定完成盘点单 ${inv.inventoryNo} 吗？完成后不可再修改。`, '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    const res = await completeInventory(inv.id)
    if (res.success) { await loadInventories(); invVisible.value = false; ElMessage.success('盘点已完成') }
    else ElMessage.error(res.message || '完成失败')
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

// ============ 统计 ============
const exportExcel = () => {
  try {
    const rows = assets.value.map(a => ({
      资产编号: a.assetCode, 名称: a.name, 类型: typeLabel(a.assetType), 分类: a.categoryName || '',
      规格型号: a.spec || '', 责任人: a.responsibleUser, 部门: a.department, 状态: a.status,
      数量: a.quantity, 单位: a.unit,
      可用数量: a.availableQuantity == null ? a.quantity : a.availableQuantity,
      原值: a.originalValue, 残值: a.residualValue, 供应商: a.supplier || '', 发票号: a.invoiceNo || '',
      获取日期: a.acquireDate, 到期日: a.expireDate || ''
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '资产台账')
    XLSX.writeFile(wb, `资产台账_${new Date().toISOString().slice(0, 10)}.xlsx`)
    ElMessage.success('导出成功')
  } catch (e) { console.error(e); ElMessage.error('导出失败') }
}

const handleSizeChange = (s: number) => { pageSize.value = s; currentPage.value = 1 }
const handleCurrentChange = (c: number) => { currentPage.value = c }
</script>

<style scoped>
.asset-mgmt-container { width:100%; height:100vh; display:flex; flex-direction:column; position:relative; overflow:hidden; background:#E4EDF2; }
.header { background:rgba(255,255,255,0.9); backdrop-filter:blur(10px); border-bottom:1px solid rgba(30,90,168,0.3); padding:0 2rem; height:60px; display:flex; align-items:center; justify-content:space-between; position:relative; z-index:100; box-shadow:0 2px 10px rgba(0,0,0,0.1); }
.logo { position:relative; display:flex; align-items:center; }
.logo-text { font-size:1.5rem; font-weight:bold; color:#333; text-shadow:0 0 10px rgba(30,90,168,0.3); }
.logo-glow { position:absolute; top:-50%; left:-20%; width:140%; height:200%; background:linear-gradient(45deg, transparent, rgba(30,90,168,0.3), transparent); filter:blur(20px); animation:glow 3s ease-in-out infinite; }
@keyframes glow { 0%,100%{opacity:0.3} 50%{opacity:0.6} }
.nav { display:flex; gap:1rem; align-items:center; justify-content:flex-end; width:100%; max-width:400px; }
.nav-item { color:rgba(51,51,51,0.8); text-decoration:none; padding:0.5rem 1rem; border-radius:6px; transition:all 0.3s ease; position:relative; overflow:hidden; border:none; background:none; cursor:pointer; font-size:14px; font-weight:500; }
.nav-item::before { content:''; position:absolute; top:0; left:-100%; width:100%; height:100%; background:linear-gradient(90deg, transparent, rgba(30,90,168,0.2), transparent); transition:left 0.3s ease; }
.nav-item:hover::before, .nav-item.active::before { left:100%; }
.nav-item:hover, .nav-item.active { color:#333; background:rgba(30,90,168,0.2); box-shadow:0 0 15px rgba(30,90,168,0.3); }
.logout-btn { background:rgba(244,67,54,0.1); color:#f44336; border:1px solid rgba(244,67,54,0.3); border-radius:6px; padding:0.5rem 1rem; cursor:pointer; transition:all 0.3s ease; position:relative; overflow:hidden; font-size:14px; font-weight:500; }
.logout-btn::before { content:''; position:absolute; top:0; left:-100%; width:100%; height:100%; background:linear-gradient(90deg, transparent, rgba(244,67,54,0.2), transparent); transition:left 0.3s ease; }
.logout-btn:hover::before { left:100%; }
.logout-btn:hover { background:rgba(244,67,54,0.2); box-shadow:0 0 15px rgba(244,67,54,0.2); }
.main-content { flex:1; overflow-y:auto; padding:2rem; }
.content-wrapper { max-width:1200px; margin:0 auto; }
.asset-tabs { background:rgba(255,255,255,0.8); border:1px solid rgba(30,90,168,0.3); border-radius:12px; padding:1rem 1.5rem; box-shadow:0 4px 12px rgba(0,0,0,0.1); backdrop-filter:blur(5px); }
.kpi-row { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:1rem; margin-bottom:1.5rem; }
.kpi-card { background:rgba(255,255,255,0.95); border:1px solid rgba(30,90,168,0.2); border-top:3px solid #1E5AA8; border-radius:10px; padding:1rem 1.2rem; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
.kpi-value { font-size:1.8rem; font-weight:700; color:#1E5AA8; }
.kpi-label { font-size:0.85rem; color:rgba(51,51,51,0.6); margin-top:0.3rem; }
.chart-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem; }
.chart-card { border-radius:10px; }
.chart-title { font-weight:600; color:#333; }
.warn-count { margin-left:10px; background:#E08A3C; color:#fff; border-radius:10px; padding:1px 10px; font-size:12px; }
.chart-box { height:240px; }
.warn-card { border-radius:10px; margin-bottom:1rem; }
.section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:1rem; }
.title-icon { width:30px; height:30px; background:linear-gradient(45deg,#1E5AA8,#5B8FC9); border-radius:8px; display:flex; align-items:center; justify-content:center; color:#fff; }
.title-icon svg { width:16px; height:16px; }
.add-btn { background:linear-gradient(45deg,#1E5AA8,#5B8FC9)!important; border:none!important; border-radius:8px!important; padding:0.5rem 1.5rem!important; font-weight:600!important; box-shadow:0 4px 15px rgba(30,90,168,0.4)!important; }
.add-btn:hover { transform:translateY(-2px)!important; box-shadow:0 6px 20px rgba(30,90,168,0.6)!important; }
.search-filter { display:flex; gap:1rem; margin-bottom:1.2rem; flex-wrap:wrap; }
.search-input { flex:1; min-width:280px; }
.asset-table { background:rgba(255,255,255,0.9)!important; border-radius:8px!important; overflow:hidden!important; box-shadow:0 2px 5px rgba(0,0,0,0.1)!important; }
.asset-table th { background:rgba(30,90,168,0.2)!important; color:#333!important; font-weight:600!important; }
.asset-table td { color:rgba(51,51,51,0.8)!important; }
.asset-table tr:hover { background:rgba(30,90,168,0.1)!important; }
.diff-red { color:#f44336; font-weight:600; }
.diff-blue { color:#1E5AA8; font-weight:600; }
.diff-ok { color:#3FA796; }
.expire-red { color:#f44336; font-weight:600; }
.expire-orange { color:#E08A3C; font-weight:600; }
.expire-normal { color:#333; }
.edit-btn { background:rgba(30,90,168,0.2)!important; color:#1E5AA8!important; border:1px solid rgba(30,90,168,0.4)!important; border-radius:6px!important; margin-right:8px!important; }
.edit-btn:hover { background:rgba(30,90,168,0.3)!important; }
.delete-btn { background:rgba(244,67,54,0.2)!important; color:#f44336!important; border:1px solid rgba(244,67,54,0.4)!important; border-radius:6px!important; }
.delete-btn:hover { background:rgba(244,67,54,0.3)!important; }
.pagination { display:flex; justify-content:flex-end; margin-top:1.2rem; }
.footer { background:rgba(255,255,255,0.9); backdrop-filter:blur(10px); border-top:1px solid rgba(30,90,168,0.3); padding:1rem 2rem; text-align:center; color:rgba(51,51,51,0.6); }
.dialog { background:rgba(255,255,255,0.95)!important; border:1px solid rgba(30,90,168,0.3)!important; border-radius:12px!important; box-shadow:0 8px 32px rgba(0,0,0,0.1)!important; }
.dialog .el-dialog__title { color:#333!important; font-weight:600!important; }
.dialog .el-form-item__label { color:rgba(51,51,51,0.8)!important; font-weight:500!important; }
.detail-dialog .el-descriptions__label { color:rgba(51,51,51,0.7)!important; background:rgba(30,90,168,0.08)!important; }
.detail-dialog .el-descriptions__content { color:#333!important; }
.main-content::-webkit-scrollbar { width:8px; }
.main-content::-webkit-scrollbar-thumb { background:rgba(30,90,168,0.5); border-radius:4px; }
</style>
