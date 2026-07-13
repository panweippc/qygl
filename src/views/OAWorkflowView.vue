<template>
  <div class="approval-center-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友软件</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/" class="nav-item">首页</router-link>
        <router-link to="/oa-office" class="nav-item active">协同管理</router-link>
        <button class="nav-item logout-btn" @click="handleBack">返回</button>
      </nav>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <div class="content-wrapper">
        <!-- 页面标题 -->
        <div class="page-header">
          <div class="header-left">
            <h2 class="section-title">
              <span class="title-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM11 17H7V10H11V17ZM17 17H13V7H17V17Z"/>
                </svg>
              </span>
              审批中心
            </h2>
            <p class="page-subtitle">请假、报销、会议申请统一管理平台</p>
          </div>
          <div class="header-right">
            <div class="search-box">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索申请..."
                prefix-icon="Search"
                clearable
                @input="handleSearch"
              />
            </div>
          </div>
        </div>

        <!-- 统计卡片 -->
        <div class="stats-bar">
<div class="stat-item" v-for="stat in approvalStats" :key="stat.key" :class="stat.key" @click="openStatDetail(stat.key)">
            <div class="stat-icon-wrapper" :style="{ background: stat.gradient }">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path :d="stat.icon"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-number">{{ stat.value }}</span>
              <span class="stat-name">{{ stat.label }}</span>
</div><div class="stat-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></div>
          </div>
        </div>

        <!-- 功能切换标签 -->
        <div class="tabs-container">
          <div class="tabs-header">
            <div class="custom-tabs">
              <div
                v-for="tab in tabs"
                :key="tab.name"
                class="tab-item"
                :class="{ active: activeTab === tab.name }"
                @click="activeTab = tab.name"
              >
                <span class="tab-icon">{{ tab.icon }}</span>
                <span class="tab-label">{{ tab.label }}</span>
                <span v-if="tab.badge > 0" class="tab-badge">{{ tab.badge }}</span>
              </div>
            </div>
            <div class="view-toggle">
              <button 
                class="toggle-btn" 
                :class="{ active: viewMode === 'list' }"
                @click="viewMode = 'list'"
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
              </button>
              <button 
                class="toggle-btn" 
                :class="{ active: viewMode === 'card' }"
                @click="viewMode = 'card'"
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.11 0-2 .9-2 2zm12 4c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1V7c0-.55.45-1 1-1h7c.55 0 1 .45 1 1v2zm0 4c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2c0-.55.45-1 1-1h7c.55 0 1 .45 1 1v2zm-4 5c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v2zm4-9c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v2c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1V7zm0 4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v2c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-2z"/></svg>
              </button>
            </div>
          </div>

          <!-- 标签页内容-->
          <div class="tab-content">
            <!-- 请假申请标签页-->
            <div v-show="activeTab === 'leave'" class="tab-panel">
              <div class="panel-header">
                <div class="panel-title">
                  <span class="title-badge">📝</span>
                  <span>请假申请管理</span>
                </div>
                <div class="header-actions">
                  <template v-if="isAdmin">
                    <el-select v-model="leaveFilter" placeholder="筛选状态" size="default" style="width: 120px; margin-right: 8px;">
                      <el-option label="全部" value="all" />
                      <el-option label="审批中" value="审批中" />
                      <el-option label="已批准" value="已批准" />
                      <el-option label="已拒绝" value="已拒绝" />
                      <el-option label="已取消" value="已取消" />
                    </el-select>
                    <el-select v-model="leavePersonFilter" placeholder="筛选人员" size="default" style="width: 140px; margin-right: 8px;" clearable filterable>
                      <el-option label="全部人员" value="all" />
                      <el-option v-for="person in leaveApplicants" :key="person" :label="person" :value="person" />
                    </el-select>
                    <el-select v-model="leaveDateType" placeholder="选择日期类型" size="default" style="width: 100px; margin-right: 8px;">
                      <el-option label="按天" value="day" />
                      <el-option label="按区间" value="range" />
                      <el-option label="按月" value="month" />
                      <el-option label="按年" value="year" />
                    </el-select>
                    <template v-if="leaveDateType === 'day'">
                      <el-date-picker
                        v-model="leaveSingleDate"
                        type="date"
                        placeholder="选择日期"
                        size="default"
                        style="width: 140px; margin-right: 8px;"
                        @change="handleDateRangeChange"
                      />
                    </template>
                    <template v-else-if="leaveDateType === 'range'">
                      <el-date-picker
                        v-model="leaveDateRange"
                        type="daterange"
                        range-separator="至"
                        start-placeholder="开始日期"
                        end-placeholder="结束日期"
                        size="default"
                        style="width: 200px; margin-right: 8px;"
                        @change="handleDateRangeChange"
                      />
                    </template>
                    <template v-else-if="leaveDateType === 'month'">
                      <el-date-picker
                        v-model="leaveMonthDate"
                        type="month"
                        placeholder="选择月份"
                        size="default"
                        style="width: 140px; margin-right: 8px;"
                        @change="handleDateRangeChange"
                      />
                    </template>
                    <template v-else-if="leaveDateType === 'year'">
                      <el-date-picker
                        v-model="leaveYearDate"
                        type="year"
                        placeholder="选择年份"
                        size="default"
                        style="width: 140px; margin-right: 8px;"
                        @change="handleDateRangeChange"
                      />
                    </template>
                    <el-button type="danger" @click="exportLeaveData" class="export-btn-small">
                      导出
                    </el-button>
                  </template>
                  <el-button v-if="!isAdmin" type="primary" @click="openLeaveDialog" class="action-btn">
                    <span class="btn-icon">+</span>
                    发起请假申请
                  </el-button>
                </div>
              </div>

              <!-- 列表视图 -->
              <div v-if="viewMode === 'list'" class="list-view">
                <el-table 
                  :data="filteredLeaveRecords" 
                  style="width: 100%"
                  :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
                  stripe
                  fit
                >
                  <el-table-column prop="id" label="申请编号" width="100">
                    <template #default="{ row }">
                      <span class="id-badge">#{{ row.id }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="申请人" v-if="isAdmin">
                    <template #default="{ row }">
                      {{ extractRealName(row.applicant) }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="leaveType" label="请假类型">
                    <template #default="{ row }">
                      <span class="type-tag" :class="getLeaveTypeClass(row.leaveType)">
                        {{ getLeaveTypeText(row.leaveType) }}
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column label="开始日期" width="100">
                    <template #default="{ row }">
                      {{ formatDate(row.startDate, false) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="结束日期" width="100">
                    <template #default="{ row }">
                      {{ formatDate(row.endDate, false) }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="days" label="天数" width="80">
                    <template #default="{ row }">
                      <span class="days-badge">{{ Number(row.days) === 0.5 ? '半天' : (Number(row.days) === Math.floor(Number(row.days)) ? Math.floor(Number(row.days)) + '天' : row.days + '天') }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="status" label="审批状态" width="120">
                    <template #default="{ row }">
                      <span :class="['status-tag', getStatusClass(row.status)]">
                        <span class="status-dot"></span>
                        {{ getStatusText(row.status) }}
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column label="提交时间" width="100">
                    <template #default="{ row }">
                      {{ formatDate(row.submitDate, false) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="下发人员" width="120" v-if="isAdmin">
                    <template #default="{ row }">
                      <div class="distributed-users">
                        <template v-if="row.distributedUsers && row.distributedUsers.length > 0">
                          <el-tooltip :content="row.distributedUsers.join('，')" placement="top">
                            <span class="distributed-tag">
                              {{ row.distributedUsers.length }}人                            </span>
                          </el-tooltip>
                        </template>
                        <span v-else class="no-distributed">-</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="240" fixed="right">
                    <template #default="{ row }">
                      <div class="action-group">
                        <el-button
                          v-if="row.status === '审批中' && isAdmin"
                          size="small"
                          type="primary"
                          @click="approveLeave(row)"
                          class="action-btn-small"
                        >
                          审批
                        </el-button>
                        <el-button
                          v-if="row.status === '审批中' && isAdmin"
                          size="small"
                          type="danger"
                          @click="terminateProcess(row, 'leave')"
                          class="terminate-btn"
                        >
                          终止
                        </el-button>
                        <el-button
                          v-if="row.status === '已批准' && isAdmin"
                          size="small"
                          type="success"
                          @click="openDistributeDialog(row, 'leave')"
                          class="distribute-btn"
                        >
                          下发
                        </el-button>
                        <el-button
                          v-if="row.status === '审批中' && !isAdmin"
                          size="small"
                          @click="cancelLeaveApplication(row)"
                          class="cancel-btn"
                        >
                          取消
                        </el-button>
                        <el-button
                          size="small"
                          @click="viewDetail(row, 'leave')"
                          class="view-btn"
                        >
                          详情
                        </el-button>
                      </div>
                    </template>
                  </el-table-column>
                </el-table>
              </div>

              <!-- 卡片视图 -->
              <div v-else class="card-view">
                <div class="record-card" v-for="row in filteredLeaveRecords" :key="row.id">
                  <div class="card-header">
                    <span class="card-id">#{{ row.id }}</span>
                    <span :class="['card-status', getStatusClass(row.status)]">{{ getStatusText(row.status) }}</span>
                  </div>
                  <div class="card-body">
                    <div class="card-row">
                      <span class="card-label">申请人</span>
                      <span class="card-value">{{ row.applicant || currentUsername }}</span>
                    </div>
                    <div class="card-row">
                      <span class="card-label">请假类型</span>
                      <span class="type-tag" :class="getLeaveTypeClass(row.leaveType)">{{ getLeaveTypeText(row.leaveType) }}</span>
                    </div>
                    <div class="card-row">
                      <span class="card-label">请假时间</span>
                      <span class="card-value">{{ formatDate(row.startDate, false) }} 至 {{ formatDate(row.endDate, false) }}</span>
                    </div>
                    <div class="card-row">
                      <span class="card-label">请假天数</span>
                      <span class="days-badge">{{ Number(row.days) === 0.5 ? '半天' : (Number(row.days) === Math.floor(Number(row.days)) ? Math.floor(Number(row.days)) + '天' : row.days + '天') }}</span>
                    </div>
                  </div>
                  <div class="card-footer">
                    <span class="card-date">{{ row.submitDate }}</span>
                    <div class="card-actions">
                      <el-button 
                        v-if="row.status === '审批中' && isAdmin" 
                        size="small" 
                        type="primary"
                        @click="approveLeave(row)"
                      >
                        审批
                      </el-button>
                      <el-button 
                        v-if="row.status === '审批中' && isAdmin" 
                        size="small" 
                        type="danger"
                        @click="terminateProcess(row, 'leave')"
                      >
                        终止
                      </el-button>
                      <el-button 
                        v-if="row.status === '审批中' && !isAdmin" 
                        size="small"
                        @click="cancelLeaveApplication(row)"
                      >
                        取消
                      </el-button>
                      <el-button size="small" @click="viewDetail(row, 'leave')">详情</el-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 报销管理标签 -->
            <div v-show="activeTab === 'reimbursement'" class="tab-panel">
              <div class="panel-header">
                <div class="panel-title">
                  <span class="title-badge">💰</span>
                  <span>报销申请管理</span>
                </div>
                <div class="header-actions">
                  <template v-if="isAdmin">
                    <el-select v-model="reimbursementFilter" placeholder="筛选状态" size="default" style="width: 120px; margin-right: 8px;">
                      <el-option label="全部" value="all" />
                      <el-option label="审批中" value="审批中" />
                      <el-option label="已批准" value="已批准" />
                      <el-option label="已拒绝" value="已拒绝" />
                      <el-option label="已取消" value="已取消" />
                    </el-select>
                    <el-select v-model="reimbursementPersonFilter" placeholder="筛选人员" size="default" style="width: 140px; margin-right: 8px;" clearable filterable>
                      <el-option label="全部人员" value="all" />
                      <el-option v-for="person in reimbursementApplicants" :key="person" :label="person" :value="person" />
                    </el-select>
                    <el-select v-model="reimbursementDateType" placeholder="选择日期类型" size="default" style="width: 100px; margin-right: 8px;">
                      <el-option label="按天" value="day" />
                      <el-option label="按区间" value="range" />
                      <el-option label="按月" value="month" />
                      <el-option label="按年" value="year" />
                    </el-select>
                    <template v-if="reimbursementDateType === 'day'">
                      <el-date-picker
                        v-model="reimbursementSingleDate"
                        type="date"
                        placeholder="选择日期"
                        size="default"
                        style="width: 140px; margin-right: 8px;"
                        @change="handleDateRangeChange"
                      />
                    </template>
                    <template v-else-if="reimbursementDateType === 'range'">
                      <el-date-picker
                        v-model="reimbursementDateRange"
                        type="daterange"
                        range-separator="至"
                        start-placeholder="开始日期"
                        end-placeholder="结束日期"
                        size="default"
                        style="width: 200px; margin-right: 8px;"
                        @change="handleDateRangeChange"
                      />
                    </template>
                    <template v-else-if="reimbursementDateType === 'month'">
                      <el-date-picker
                        v-model="reimbursementMonthDate"
                        type="month"
                        placeholder="选择月份"
                        size="default"
                        style="width: 140px; margin-right: 8px;"
                        @change="handleDateRangeChange"
                      />
                    </template>
                    <template v-else-if="reimbursementDateType === 'year'">
                      <el-date-picker
                        v-model="reimbursementYearDate"
                        type="year"
                        placeholder="选择年份"
                        size="default"
                        style="width: 140px; margin-right: 8px;"
                        @change="handleDateRangeChange"
                      />
                    </template>
                    <el-button type="danger" @click="exportReimbursementData" class="export-btn-small">
                      导出
                    </el-button>
                  </template>
                  <el-button v-if="!isAdmin" type="primary" @click="openReimbursementDialog" class="action-btn">
                    <span class="btn-icon">+</span>
                    发起报销申请
                  </el-button>
                </div>
              </div>

              <!-- 列表视图 -->
              <div v-if="viewMode === 'list'" class="list-view">
                <el-table 
                  :data="filteredReimbursementRecords" 
                  style="width: 100%"
                  :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
                  stripe
                  fit
                >
                  <el-table-column prop="id" label="报销编号" width="100">
                    <template #default="{ row }">
                      <span class="id-badge">#{{ row.id }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="申请人" v-if="isAdmin">
                    <template #default="{ row }">
                      {{ extractRealName(row.applicant) }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="reimburseType" label="报销类型">
                    <template #default="{ row }">
                      <span class="type-tag" :class="getReimburseTypeClass(row.reimburseType)">
                        {{ row.reimburseType }}
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="amount" label="报销金额">
                    <template #default="{ row }">
                      <span class="amount-badge">¥{{ row.amount }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="reimburseDate" label="报销日期" width="120"></el-table-column>
                  <el-table-column prop="status" label="审批状态" width="120">
                    <template #default="{ row }">
                      <span :class="['status-tag', getStatusClass(row.status)]">
                        <span class="status-dot"></span>
                        {{ getStatusText(row.status) }}
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column label="提交时间" width="100">
                    <template #default="{ row }">
                      {{ formatDate(row.submitDate, false) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="下发人员" width="150" v-if="isAdmin">
                    <template #default="{ row }">
                      <div class="distributed-users">
                        <template v-if="row.distributedUsers && row.distributedUsers.length > 0">
                          <el-tooltip :content="row.distributedUsers.join('，')" placement="top">
                            <span class="distributed-tag">
                              {{ row.distributedUsers.length }}人                            </span>
                          </el-tooltip>
                        </template>
                        <span v-else class="no-distributed">-</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="240" fixed="right">
                    <template #default="{ row }">
                      <div class="action-group">
                        <el-button
                          v-if="row.status === '审批中' && isAdmin"
                          size="small"
                          type="primary"
                          @click="approveReimbursement(row)"
                          class="action-btn-small"
                        >
                          审批
                        </el-button>
                        <el-button
                          v-if="row.status === '审批中' && isAdmin"
                          size="small"
                          type="danger"
                          @click="terminateProcess(row, 'reimbursement')"
                          class="terminate-btn"
                        >
                          终止
                        </el-button>
                        <el-button
                          v-if="row.status === '已批准' && isAdmin"
                          size="small"
                          type="success"
                          @click="openDistributeDialog(row, 'reimbursement')"
                          class="distribute-btn"
                        >
                          下发
                        </el-button>
                        <el-button
                          size="small"
                          @click="viewDetail(row, 'reimbursement')"
                          class="view-btn"
                        >
                          详情
                        </el-button>
                      </div>
                    </template>
                  </el-table-column>
                </el-table>
              </div>

              <!-- 卡片视图 -->
              <div v-else class="card-view">
                <div class="record-card" v-for="row in filteredReimbursementRecords" :key="row.id">
                  <div class="card-header">
                    <span class="card-id">#{{ row.id }}</span>
                    <span :class="['card-status', getStatusClass(row.status)]">{{ getStatusText(row.status) }}</span>
                  </div>
                  <div class="card-body">
                    <div class="card-row">
                      <span class="card-label">申请人</span>
                      <span class="card-value">{{ row.applicant || currentUsername }}</span>
                    </div>
                    <div class="card-row">
                      <span class="card-label">报销类型</span>
                      <span class="type-tag" :class="getReimburseTypeClass(row.reimburseType)">{{ row.reimburseType }}</span>
                    </div>
                    <div class="card-row">
                      <span class="card-label">报销金额</span>
                      <span class="amount-badge">¥{{ row.amount }}</span>
                    </div>
                    <div class="card-row">
                      <span class="card-label">报销日期</span>
                      <span class="card-value">{{ row.reimburseDate }}</span>
                    </div>
                  </div>
                  <div class="card-footer">
                    <span class="card-date">{{ row.submitDate }}</span>
                    <div class="card-actions">
                      <el-button 
                        v-if="row.status === '审批中' && isAdmin" 
                        size="small" 
                        type="primary"
                        @click="approveReimbursement(row)"
                      >
                        审批
                      </el-button>
                      <el-button 
                        v-if="row.status === '审批中' && isAdmin" 
                        size="small" 
                        type="danger"
                        @click="terminateProcess(row, 'reimbursement')"
                      >
                        终止
                      </el-button>
                      <el-button size="small" @click="viewDetail(row, 'reimbursement')">详情</el-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 会议管理标签页-->
            <div v-show="activeTab === 'meeting'" class="tab-panel">
              <div class="panel-header">
                <div class="panel-title">
                  <span class="title-badge">📅</span>
                  <span>会议申请管理</span>
                </div>
                <div class="header-actions">
                  <template v-if="isAdmin">
                    <el-select v-model="meetingFilter" placeholder="筛选状态" size="default" style="width: 120px; margin-right: 8px;">
                      <el-option label="全部" value="all" />
                      <el-option label="审批中" value="审批中" />
                      <el-option label="已批准" value="已批准" />
                      <el-option label="已拒绝" value="已拒绝" />
                      <el-option label="已取消" value="已取消" />
                    </el-select>
                    <el-select v-model="meetingPersonFilter" placeholder="筛选人员" size="default" style="width: 140px; margin-right: 8px;" clearable filterable>
                      <el-option label="全部人员" value="all" />
                      <el-option v-for="person in meetingOrganizers" :key="person" :label="person" :value="person" />
                    </el-select>
                    <el-select v-model="meetingDateType" placeholder="选择日期类型" size="default" style="width: 100px; margin-right: 8px;">
                      <el-option label="按天" value="day" />
                      <el-option label="按区间" value="range" />
                      <el-option label="按月" value="month" />
                      <el-option label="按年" value="year" />
                    </el-select>
                    <template v-if="meetingDateType === 'day'">
                      <el-date-picker
                        v-model="meetingSingleDate"
                        type="date"
                        placeholder="选择日期"
                        size="default"
                        style="width: 140px; margin-right: 8px;"
                        @change="handleDateRangeChange"
                      />
                    </template>
                    <template v-else-if="meetingDateType === 'range'">
                      <el-date-picker
                        v-model="meetingDateRange"
                        type="daterange"
                        range-separator="至"
                        start-placeholder="开始日期"
                        end-placeholder="结束日期"
                        size="default"
                        style="width: 200px; margin-right: 8px;"
                        @change="handleDateRangeChange"
                      />
                    </template>
                    <template v-else-if="meetingDateType === 'month'">
                      <el-date-picker
                        v-model="meetingMonthDate"
                        type="month"
                        placeholder="选择月份"
                        size="default"
                        style="width: 140px; margin-right: 8px;"
                        @change="handleDateRangeChange"
                      />
                    </template>
                    <template v-else-if="meetingDateType === 'year'">
                      <el-date-picker
                        v-model="meetingYearDate"
                        type="year"
                        placeholder="选择年份"
                        size="default"
                        style="width: 140px; margin-right: 8px;"
                        @change="handleDateRangeChange"
                      />
                    </template>
                    <el-button type="danger" @click="exportMeetingData" class="export-btn-small">
                      导出
                    </el-button>
                  </template>
                  <el-button type="primary" @click="openMeetingDialog" class="action-btn">
                    <span class="btn-icon">+</span>
                    创建会议
                  </el-button>
                </div>
              </div>

              <!-- 列表视图 -->
              <div v-if="viewMode === 'list'" class="list-view">
                <el-table 
                  :data="filteredMeetingRecords" 
                  style="width: 100%"
                  :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
                  stripe
                  fit
                >
                  <el-table-column prop="id" label="会议编号" width="100">
                    <template #default="{ row }">
                      <span class="id-badge">#{{ row.id }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="title" label="会议主题" min-width="150"></el-table-column>
                  <el-table-column prop="organizer" label="组织者" v-if="isAdmin"></el-table-column>
                  <el-table-column prop="meetingDate" label="会议日期" width="120"></el-table-column>
                  <el-table-column prop="meetingTime" label="会议时间" width="100"></el-table-column>
                  <el-table-column prop="location" label="会议地点"></el-table-column>
                  <el-table-column prop="status" label="状态" width="120">
                    <template #default="{ row }">
                      <span :class="['status-tag', getStatusClass(row.status)]">
                        <span class="status-dot"></span>
                        {{ getStatusText(row.status) }}
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="submitDate" label="创建时间" width="150"></el-table-column>
                  <el-table-column label="操作" width="240" fixed="right">
                    <template #default="{ row }">
                      <div class="action-group">
                        <el-button
                          v-if="(row.status === '审批中' || row.status === '待审批' || row.status === '待审核' || row.status === 'pending') && isAdmin"
                          size="small"
                          type="primary"
                          @click="approveMeeting(row)"
                          class="action-btn-small"
                        >
                          审批
                        </el-button>
                        <el-button
                          v-if="(row.status === '审批中' || row.status === '待审批' || row.status === '待审核' || row.status === 'pending') && isAdmin"
                          size="small"
                          type="danger"
                          @click="terminateProcess(row, 'meeting')"
                          class="terminate-btn"
                        >
                          终止
                        </el-button>
                        <el-button
                          v-if="(row.status === '已批准' || row.status === 'approved') && isAdmin"
                          size="small"
                          type="success"
                          @click="openDistributeDialog(row, 'meeting')"
                          class="distribute-btn"
                        >
                          下发
                        </el-button>
                        <el-button
                          v-if="(row.status === '审批中' || row.status === '待审批' || row.status === '待审核' || row.status === 'pending') && !isAdmin"
                          size="small"
                          @click="cancelMeeting(row)"
                          class="cancel-btn"
                        >
                          取消
                        </el-button>
                        <el-button
                          size="small"
                          @click="viewDetail(row, 'meeting')"
                          class="view-btn"
                        >
                          详情
                        </el-button>
                      </div>
                    </template>
                  </el-table-column>
                </el-table>
              </div>

              <!-- 卡片视图 -->
              <div v-else class="card-view">
                <div class="record-card" v-for="row in filteredMeetingRecords" :key="row.id">
                  <div class="card-header">
                    <span class="card-id">#{{ row.id }}</span>
                    <span :class="['card-status', getStatusClass(row.status)]">{{ getStatusText(row.status) }}</span>
                  </div>
                  <div class="card-body">
                    <div class="card-row">
                      <span class="card-label">会议主题</span>
                      <span class="card-value highlight">{{ row.title }}</span>
                    </div>
                    <div class="card-row">
                      <span class="card-label">组织者</span>
                      <span class="card-value">{{ row.organizer || currentUsername }}</span>
                    </div>
                    <div class="card-row">
                      <span class="card-label">会议时间</span>
                      <span class="card-value">{{ row.meetingDate }} {{ row.meetingTime }}</span>
                    </div>
                    <div class="card-row">
                      <span class="card-label">会议地点</span>
                      <span class="card-value">{{ row.location }}</span>
                    </div>
                  </div>
                  <div class="card-footer">
                    <span class="card-date">{{ row.submitDate }}</span>
                    <div class="card-actions">
                      <el-button 
                        v-if="(row.status === '审批中' || row.status === '待审批' || row.status === '待审核' || row.status === 'pending') && isAdmin" 
                        size="small" 
                        type="primary"
                        @click="approveMeeting(row)"
                      >
                        审批
                      </el-button>
                      <el-button 
                        v-if="(row.status === '审批中' || row.status === '待审批' || row.status === '待审核' || row.status === 'pending') && isAdmin" 
                        size="small" 
                        type="danger"
                        @click="terminateProcess(row, 'meeting')"
                      >
                        终止
                      </el-button>
                      <el-button 
                        v-if="(row.status === '已批准' || row.status === 'approved') && isAdmin" 
                        size="small" 
                        type="success"
                        @click="openDistributeDialog(row, 'meeting')"
                      >
                        下发
                      </el-button>
                      <el-button size="small" @click="viewDetail(row, 'meeting')">详情</el-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 项目申请标签页-->
      <div v-show="activeTab === 'project'" class="tab-panel">
        <div class="panel-header">
          <div class="panel-title">
            <span class="title-badge">📊</span>
            <span>项目申请管理</span>
          </div>
          <div class="header-actions">
            <template v-if="isAdmin">
              <el-select v-model="projectFilter" placeholder="筛选状态" size="default" style="width: 120px; margin-right: 8px;">
                <el-option label="全部" value="all" />
                <el-option label="审批中" value="审批中" />
                <el-option label="已批准" value="已批准" />
                <el-option label="已拒绝" value="已拒绝" />
              </el-select>
              <el-select v-model="projectTypeFilter" placeholder="筛选类型" size="default" style="width: 140px; margin-right: 8px;" clearable filterable>
                <el-option label="全部类型" value="all" />
                <el-option label="研发项目" value="研发项目" />
                <el-option label="市场项目" value="市场项目" />
                <el-option label="运营项目" value="运营项目" />
                <el-option label="基建项目" value="基建项目" />
                <el-option label="其他项目" value="其他项目" />
              </el-select>
              <el-button type="danger" @click="exportProjectData" class="export-btn-small">
                导出
              </el-button>
            </template>
            <el-button v-if="!isAdmin" type="primary" @click="goToProjectApply" class="action-btn">
              <span class="btn-icon">+</span>
              发起项目申请
            </el-button>
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-if="viewMode === 'list'" class="list-view">
          <el-table 
            :data="filteredProjectRecords" 
            style="width: 100%"
            :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
            stripe
            fit
          >
            <el-table-column prop="id" label="申请编号" width="100">
              <template #default="{ row }">
                <span class="id-badge">#{{ row.id }}</span>
              </template>
            </el-table-column>
            <el-table-column label="申请人" v-if="isAdmin">
              <template #default="{ row }">
                {{ extractRealName(row.applicant) }}
              </template>
            </el-table-column>
            <el-table-column prop="projectName" label="项目名称" min-width="150">
              <template #default="{ row }">
                <span class="project-name">{{ row.projectName }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="projectType" label="项目类型">
              <template #default="{ row }">
                <span class="type-tag" :class="getProjectTypeClass(row.projectType)">
                  {{ row.projectType }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="budget" label="预算金额" width="120">
              <template #default="{ row }">
                <span class="amount-badge">¥{{ row.budget }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="priority" label="优先级" width="80">
              <template #default="{ row }">
                <span class="priority-tag" :class="getPriorityClass(row.priority)">
                  {{ row.priority }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="审批状态" width="120">
              <template #default="{ row }">
                <span :class="['status-tag', getStatusClass(row.status)]">
                  <span class="status-dot"></span>
                  {{ getStatusText(row.status) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="提交时间" width="100">
              <template #default="{ row }">
                {{ formatDate(row.submitDate, false) }}
              </template>
            </el-table-column>
            <el-table-column label="下发人员" width="120" v-if="isAdmin">
              <template #default="{ row }">
                <div class="distributed-users">
                  <template v-if="row.distributedUsers && row.distributedUsers.length > 0">
                    <el-tooltip :content="row.distributedUsers.join('，')" placement="top">
                      <span class="distributed-tag">
                        {{ row.distributedUsers.length }}人                            </span>
                    </el-tooltip>
                  </template>
                  <span v-else class="no-distributed">-</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="240" fixed="right">
              <template #default="{ row }">
                <div class="action-group">
                  <el-button
                    v-if="(row.status === '审批中' || row.status === 'pending') && isAdmin"
                    size="small"
                    type="primary"
                    @click="approveProject(row)"
                    class="action-btn-small"
                  >
                    审批
                  </el-button>
                  <el-button
                    v-if="(row.status === '审批中' || row.status === 'pending') && isAdmin"
                    size="small"
                    type="danger"
                    @click="terminateProcess(row, 'project')"
                    class="terminate-btn"
                  >
                    终止
                  </el-button>
                  <el-button
                    v-if="(row.status === '已批准' || row.status === 'approved') && isAdmin"
                    size="small"
                    type="success"
                    @click="openDistributeDialog(row, 'project')"
                    class="distribute-btn"
                  >
                    下发
                  </el-button>
                  <el-button
                    v-if="(row.status === '审批中' || row.status === 'pending') && !isAdmin"
                    size="small"
                    @click="cancelProjectApplication(row)"
                    class="cancel-btn"
                  >
                    取消
                  </el-button>
                  <el-button
                    size="small"
                    @click="viewDetail(row, 'project')"
                    class="view-btn"
                  >
                    详情
                  </el-button>
                  <el-button
                    v-if="isAdmin"
                    size="small"
                    type="danger"
                    @click="deleteProjectApplication(row)"
                    class="delete-btn"
                  >
                    删除
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 卡片视图 -->
        <div v-else class="card-view">
          <div class="record-card" v-for="row in filteredProjectRecords" :key="row.id">
            <div class="card-header">
              <span class="card-id">#{{ row.id }}</span>
              <span :class="['card-status', getStatusClass(row.status)]">{{ getStatusText(row.status) }}</span>
            </div>
            <div class="card-body">
              <div class="card-row">
                <span class="card-label">申请人</span>
                <span class="card-value">{{ row.applicant || currentUsername }}</span>
              </div>
              <div class="card-row">
                <span class="card-label">项目名称</span>
                <span class="card-value highlight">{{ row.projectName }}</span>
              </div>
              <div class="card-row">
                <span class="card-label">项目类型</span>
                <span class="type-tag" :class="getProjectTypeClass(row.projectType)">{{ row.projectType }}</span>
              </div>
              <div class="card-row">
                <span class="card-label">预算金额</span>
                <span class="amount-badge">¥{{ row.budget }}</span>
              </div>
              <div class="card-row">
                <span class="card-label">优先级</span>
                <span class="priority-tag" :class="getPriorityClass(row.priority)">{{ row.priority }}</span>
              </div>
            </div>
            <div class="card-footer">
              <span class="card-date">{{ row.submitDate }}</span>
              <div class="card-actions">
                <el-button 
                  v-if="(row.status === '审批中' || row.status === '待审批' || row.status === '待审核' || row.status === 'pending') && isAdmin" 
                  size="small" 
                  type="primary"
                  @click="approveProject(row)"
                >
                  审批
                </el-button>
                <el-button 
                  v-if="(row.status === '审批中' || row.status === '待审批' || row.status === '待审核' || row.status === 'pending') && isAdmin" 
                  size="small" 
                  type="danger"
                  @click="terminateProcess(row, 'project')"
                >
                  终止
                </el-button>
                <el-button 
                  v-if="(row.status === '已批准' || row.status === 'approved') && isAdmin" 
                  size="small" 
                  type="success"
                  @click="openDistributeDialog(row, 'project')"
                >
                  下发
                </el-button>
                <el-button 
                  v-if="(row.status === '审批中' || row.status === '待审批' || row.status === '待审核' || row.status === 'pending') && !isAdmin" 
                  size="small"
                  @click="cancelProjectApplication(row)"
                >
                  取消
                </el-button>
                <el-button size="small" @click="viewDetail(row, 'project')">详情</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 出差申请标签页-->
      <div v-show="activeTab === 'businessTrip'" class="tab-panel">
        <div class="panel-header">
          <div class="panel-title">
            <span class="title-badge">✈️</span>
            <span>出差申请管理</span>
          </div>
          <div class="header-actions">
            <template v-if="isAdmin">
              <el-select v-model="businessTripFilter" placeholder="筛选状态" size="default" style="width: 120px; margin-right: 8px;">
                <el-option label="全部" value="all" />
                <el-option label="审批中" value="审批中" />
                <el-option label="已批准" value="已批准" />
                <el-option label="已拒绝" value="已拒绝" />
              </el-select>
              <el-select v-model="businessTripTypeFilter" placeholder="筛选类型" size="default" style="width: 140px; margin-right: 8px;" clearable filterable>
                <el-option label="全部类型" value="all" />
                <el-option label="国内出差" value="国内出差" />
                <el-option label="国外出差" value="国外出差" />
              </el-select>
              <el-button type="danger" @click="exportBusinessTripData" class="export-btn-small">
                导出
              </el-button>
            </template>
            <el-button v-if="!isAdmin" type="primary" @click="goToBusinessTripApply" class="action-btn">
              <span class="btn-icon">+</span>
              发起出差申请
            </el-button>
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-if="viewMode === 'list'" class="list-view">
          <el-table 
            :data="filteredBusinessTripRecords" 
            style="width: 100%"
            :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
            stripe
            fit
          >
            <el-table-column prop="id" label="申请编号" width="100">
              <template #default="{ row }">
                <span class="id-badge">#{{ row.id }}</span>
              </template>
            </el-table-column>
            <el-table-column label="申请人" v-if="isAdmin">
              <template #default="{ row }">
                {{ extractRealName(row.applicant) }}
              </template>
            </el-table-column>
            <el-table-column prop="destination" label="目的地" min-width="150">
              <template #default="{ row }">
                <span class="destination">{{ row.destination }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="tripType" label="出差类型">
              <template #default="{ row }">
                <span class="type-tag" :class="getTripTypeClass(row.tripType)">
                  {{ row.tripType === 'domestic' ? '国内出差' : row.tripType === 'international' ? '国外出差' : row.tripType }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="days" label="天数" width="80">
              <template #default="{ row }">
                <span class="days-badge">{{ Number(row.days) === Math.floor(Number(row.days)) ? Math.floor(Number(row.days)) + '天' : row.days + '天' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="estimatedCost" label="预估费用" width="120">
              <template #default="{ row }">
                <span class="amount-badge">¥{{ row.estimatedCost }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="审批状态" width="120">
              <template #default="{ row }">
                <span :class="['status-tag', getStatusClass(row.status)]">
                  <span class="status-dot"></span>
                  {{ getStatusText(row.status) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="提交时间" width="100">
              <template #default="{ row }">
                {{ formatDate(row.submitDate, false) }}
              </template>
            </el-table-column>
            <el-table-column label="下发人员" width="120" v-if="isAdmin">
              <template #default="{ row }">
                <div class="distributed-users">
                  <template v-if="row.distributedUsers && row.distributedUsers.length > 0">
                    <el-tooltip :content="row.distributedUsers.join('，')" placement="top">
                      <span class="distributed-tag">
                        {{ row.distributedUsers.length }}人                            </span>
                    </el-tooltip>
                  </template>
                  <span v-else class="no-distributed">-</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="240" fixed="right">
              <template #default="{ row }">
                <div class="action-group">
                  <el-button
                    v-if="(row.status === '审批中' || row.status === '待审批' || row.status === '待审核' || row.status === 'pending') && isAdmin"
                    size="small"
                    type="primary"
                    @click="approveBusinessTrip(row)"
                    class="action-btn-small"
                  >
                    审批
                  </el-button>
                  <el-button
                    v-if="(row.status === '审批中' || row.status === '待审批' || row.status === '待审核' || row.status === 'pending') && isAdmin"
                    size="small"
                    type="danger"
                    @click="terminateProcess(row, 'businessTrip')"
                    class="terminate-btn"
                  >
                    终止
                  </el-button>
                  <el-button
                    v-if="(row.status === '已批准' || row.status === 'approved') && isAdmin"
                    size="small"
                    type="success"
                    @click="openDistributeDialog(row, 'businessTrip')"
                    class="distribute-btn"
                  >
                    下发
                  </el-button>
                  <el-button
                    v-if="(row.status === '审批中' || row.status === '待审批' || row.status === '待审核' || row.status === 'pending') && !isAdmin"
                    size="small"
                    @click="cancelBusinessTripApplication(row)"
                    class="cancel-btn"
                  >
                    取消
                  </el-button>
                  <el-button
                    size="small"
                    @click="viewDetail(row, 'businessTrip')"
                    class="view-btn"
                  >
                    详情
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 卡片视图 -->
        <div v-else class="card-view">
          <div class="record-card" v-for="row in filteredBusinessTripRecords" :key="row.id">
            <div class="card-header">
              <span class="card-id">#{{ row.id }}</span>
              <span :class="['card-status', getStatusClass(row.status)]">{{ getStatusText(row.status) }}</span>
            </div>
            <div class="card-body">
              <div class="card-row">
                <span class="card-label">申请人</span>
                <span class="card-value">{{ row.applicant || currentUsername }}</span>
              </div>
              <div class="card-row">
                <span class="card-label">目的地</span>
                <span class="card-value highlight">{{ row.destination }}</span>
              </div>
              <div class="card-row">
                <span class="card-label">出差类型</span>
                <span class="type-tag" :class="getTripTypeClass(row.tripType)">{{ row.tripType === 'domestic' ? '国内出差' : row.tripType === 'international' ? '国外出差' : row.tripType }}</span>
              </div>
              <div class="card-row">
                <span class="card-label">出差天数</span>
                <span class="days-badge">{{ Number(row.days) === Math.floor(Number(row.days)) ? Math.floor(Number(row.days)) + '天' : row.days + '天' }}</span>
              </div>
              <div class="card-row">
                <span class="card-label">预估费用</span>
                <span class="amount-badge">¥{{ row.estimatedCost }}</span>
              </div>
            </div>
            <div class="card-footer">
              <span class="card-date">{{ row.submitDate }}</span>
              <div class="card-actions">
                <el-button 
                  v-if="(row.status === '审批中' || row.status === '待审批' || row.status === '待审核' || row.status === 'pending') && isAdmin" 
                  size="small" 
                  type="primary"
                  @click="approveBusinessTrip(row)"
                >
                  审批
                </el-button>
                <el-button 
                  v-if="(row.status === '审批中' || row.status === '待审批' || row.status === '待审核' || row.status === 'pending') && isAdmin" 
                  size="small" 
                  type="danger"
                  @click="terminateProcess(row, 'businessTrip')"
                >
                  终止
                </el-button>
                <el-button 
                  v-if="(row.status === '已批准' || row.status === 'approved') && isAdmin" 
                  size="small" 
                  type="success"
                  @click="openDistributeDialog(row, 'businessTrip')"
                >
                  下发
                </el-button>
                <el-button 
                  v-if="(row.status === '审批中' || row.status === '待审批' || row.status === '待审核' || row.status === 'pending') && !isAdmin" 
                  size="small"
                  @click="cancelBusinessTripApplication(row)"
                >
                  取消
                </el-button>
                <el-button size="small" @click="viewDetail(row, 'businessTrip')">详情</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 下发管理标签页（仅非管理员可见） -->
      <div v-show="activeTab === 'distributed'" class="tab-panel">
        <div class="panel-header">
          <div class="panel-title">
            <span class="title-badge">📨</span>
            <span class="title-text">下发申请管理</span>
          </div>
          <div class="header-actions">
            <el-button type="primary" @click="loadDistributedRecords" class="refresh-btn">
              <el-icon><Refresh /></el-icon> 刷新
            </el-button>
          </div>
        </div>
        <div class="panel-content">
          <div class="table-container">
            <el-table
              :data="distributedRecords"
              style="width: 100%"
              :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: '600' }"
              v-loading="loading"
              stripe
              fit
            >
              <el-table-column prop="id" label="下发编号" width="100">
                <template #default="{ row }">
                  <span class="id-badge">#{{ row.id }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="applicationType" label="申请类型" width="120">
                <template #default="{ row }">
                  <span class="type-tag" :class="row.applicationType">{{ getApplicationTypeLabel(row.applicationType) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="applicationId" label="原申请编号" width="100">
                <template #default="{ row }">
                  <span class="id-badge">#{{ row.applicationId }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="applicant" label="原申请人" width="120"></el-table-column>
              <el-table-column prop="distributedBy" label="下发人" width="120"></el-table-column>
              <el-table-column prop="distributeDate" label="下发时间" width="150"></el-table-column>
              <el-table-column prop="status" label="处理状态" width="100">
                <template #default="{ row }">
                  <span :class="['status-tag', getStatusClass(row.status)]">
                    <span class="status-dot"></span>
                    {{ row.status }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="comment" label="下发说明" min-width="150">
                <template #default="{ row }">
                  <span class="comment-text">{{ row.comment || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="processComment" label="处理说明" min-width="150">
                <template #default="{ row }">
                  <span v-if="row.status === '已处理'" class="process-comment-text">{{ row.processComment || row.comment || '-' }}</span>
                  <span v-else class="no-process">-</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <div class="action-group">
                    <el-button
                      v-if="row.status === '待处理'"
                      size="small"
                      type="primary"
                      @click="handleDistributedItem(row)"
                      class="action-btn-small"
                    >
                      处理
                    </el-button>
                    <el-button
                      size="small"
                      @click="viewDistributedDetail(row)"
                      class="view-btn"
                    >
                      详情
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </main>
    <!-- 统计详情对话框 -->
    <el-dialog v-model="statDetailDialogVisible" :title="statDetailTitle" width="800px">
      <el-table :data="statDetailRecords" style="width: 100%">
        <el-table-column prop="id" label="编号" width="80">
          <template #default="{ row }">#{{ row.id }}</template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <span class="type-tag">{{ getStatDetailTypeLabel(row._type) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="标题" min-width="150">
          <template #default="{ row }">{{ getStatDetailName(row) }}</template>
        </el-table-column>
        <el-table-column label="申请人" width="120">
          <template #default="{ row }">{{ row.applicant || row.organizer || '-' }}</template>
        </el-table-column>
        <el-table-column label="金额" width="100">
          <template #default="{ row }">
            <span v-if="row.amount || row.budget || row.estimatedCost">
              ¥{{ row.amount || row.budget || row.estimatedCost }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <span :class="['status-tag', getStatusClass(row.status)]">{{ getStatusText(row.status) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="160">
          <template #default="{ row }">{{ row.submitDate || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetail(row, row._type)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>


    <!-- 请假申请对话框 -->
    <el-dialog v-model="leaveDialogVisible" title="请假申请" width="600px" class="custom-dialog">
      <el-form :model="leaveForm" :rules="leaveRules" ref="leaveFormRef" label-width="100px" class="custom-form">
        <el-form-item label="请假类型" prop="leaveType">
          <el-select v-model="leaveForm.leaveType" placeholder="请选择请假类型" style="width: 100%">
            <el-option label="事假" value="事假"></el-option>
            <el-option label="病假" value="病假"></el-option>
            <el-option label="年假" value="年假"></el-option>
            <el-option label="婚假" value="婚假"></el-option>
            <el-option label="产假" value="产假"></el-option>
            <el-option label="其他" value="其他"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期" prop="startDate">
          <el-date-picker v-model="leaveForm.startDate" type="date" placeholder="选择开始日期" style="width: 100%"></el-date-picker>
        </el-form-item>
        <el-form-item label="结束日期" prop="endDate">
          <el-date-picker v-model="leaveForm.endDate" type="date" placeholder="选择结束日期" style="width: 100%"></el-date-picker>
        </el-form-item>
        <el-form-item label="请假天数" prop="days">
          <el-input v-model="leaveForm.days" type="number" step="0.5" placeholder="请输入请假天数"></el-input>
        </el-form-item>
        <el-form-item label="请假原因" prop="reason">
          <el-input v-model="leaveForm.reason" type="textarea" :rows="4" placeholder="请输入请假原因"></el-input>
        </el-form-item>
        <el-form-item label="审批人">
          <el-select v-model="leaveForm.approver" placeholder="请选择审批人" style="width: 100%">
            <el-option v-for="employee in employees" :key="employee.name" :label="employee.name" :value="employee.name" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="leaveDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitLeaveApplication">提交申请</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 报销申请对话框-->
    <el-dialog v-model="reimbursementDialogVisible" title="报销申请" width="600px" class="custom-dialog">
      <el-form :model="reimbursementForm" :rules="reimbursementRules" ref="reimbursementFormRef" label-width="100px" class="custom-form">
        <el-form-item label="报销类型" prop="reimburseType">
          <el-select v-model="reimbursementForm.reimburseType" placeholder="请选择报销类型" style="width: 100%">
            <el-option label="差旅费" value="差旅费"></el-option>
            <el-option label="办公用品" value="办公用品"></el-option>
            <el-option label="餐饮费" value="餐饮费"></el-option>
            <el-option label="交通费" value="交通费"></el-option>
            <el-option label="其他" value="其他"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="报销金额" prop="amount">
          <el-input v-model="reimbursementForm.amount" type="number" placeholder="请输入报销金额">
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="报销日期" prop="reimburseDate">
          <el-date-picker v-model="reimbursementForm.reimburseDate" type="date" placeholder="选择报销日期" style="width: 100%"></el-date-picker>
        </el-form-item>
        <el-form-item label="报销事由" prop="reason">
          <el-input v-model="reimbursementForm.reason" type="textarea" :rows="4" placeholder="请输入报销事由"></el-input>
        </el-form-item>
        <el-form-item label="审批人">
          <el-select v-model="reimbursementForm.approver" placeholder="请选择审批人" style="width: 100%">
            <el-option v-for="employee in employees" :key="employee.name" :label="employee.name" :value="employee.name" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="reimbursementDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitReimbursementApplication">提交申请</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 会议申请对话框-->
    <el-dialog v-model="meetingDialogVisible" title="创建会议" width="600px" class="custom-dialog">
      <el-form :model="meetingForm" :rules="meetingRules" ref="meetingFormRef" label-width="100px" class="custom-form">
        <el-form-item label="会议主题" prop="title">
          <el-input v-model="meetingForm.title" placeholder="请输入会议主题"></el-input>
        </el-form-item>
        <el-form-item label="会议日期" prop="meetingDate">
          <el-date-picker v-model="meetingForm.meetingDate" type="date" placeholder="选择会议日期" style="width: 100%"></el-date-picker>
        </el-form-item>
        <el-form-item label="会议时间" prop="meetingTime">
          <el-time-picker v-model="meetingForm.meetingTime" placeholder="选择会议时间" style="width: 100%"></el-time-picker>
        </el-form-item>
        <el-form-item label="会议地点" prop="location">
          <el-input v-model="meetingForm.location" placeholder="请输入会议地点"></el-input>
        </el-form-item>
        <el-form-item label="参会人员" prop="participants">
          <el-input v-model="meetingForm.participants" type="textarea" :rows="2" placeholder="请输入参会人员"></el-input>
        </el-form-item>
        <el-form-item label="会议议程" prop="agenda">
          <el-input v-model="meetingForm.agenda" type="textarea" :rows="3" placeholder="请输入会议议程"></el-input>
        </el-form-item>
        <el-form-item label="审批人">
          <el-select v-model="meetingForm.approver" placeholder="请选择审批人" style="width: 100%">
            <el-option v-for="employee in employees" :key="employee.name" :label="employee.name" :value="employee.name" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="meetingDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitMeetingApplication">创建会议</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 审批对话框-->
    <el-dialog v-model="approvalDialogVisible" title="审批处理" width="500px" class="custom-dialog">
      <div class="approval-info" v-if="currentApprovalItem">
        <div class="info-row">
          <span class="info-label">申请类型：</span>
          <span class="info-value">{{ getApprovalTypeName(currentApprovalItem.type) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">申请人：</span>
          <span class="info-value">{{ currentApprovalItem.applicant || currentApprovalItem.organizer }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">申请时间：</span>
          <span class="info-value">{{ currentApprovalItem.submitDate }}</span>
        </div>
      </div>
      <el-form :model="approvalForm" ref="approvalFormRef" label-width="100px" class="custom-form">
        <el-form-item label="审批结果" prop="result">
          <el-radio-group v-model="approvalForm.result" size="large">
            <el-radio-button label="批准">
              <span class="radio-icon">✓</span> 批准
            </el-radio-button>
            <el-radio-button label="拒绝">
              <span class="radio-icon">✗</span> 拒绝
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审批意见">
          <el-input v-model="approvalForm.comment" type="textarea" :rows="3" placeholder="请输入审批意见（可选）"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="approvalDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitApproval">确认审批</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="申请详情" width="600px" class="custom-dialog">
      <div class="detail-content" v-if="currentDetailItem">
        <div class="detail-header">
          <span class="detail-id">申请编号：#{{ currentDetailItem.id }}</span>
          <span :class="['detail-status', getStatusClass(currentDetailItem.status)]">{{ getStatusText(currentDetailItem.status) }}</span>
        </div>
        <div class="detail-body">
          <div class="detail-section" v-for="(value, key) in getDetailFields(currentDetailItem, currentDetailType)" :key="key">
            <div class="detail-row">
              <span class="detail-label">{{ key }}</span>
              <span class="detail-value">{{ value }}</span>
            </div>
          </div>
        </div>
        <div class="detail-footer" v-if="currentDetailItem.comment">
          <div class="comment-box">
            <span class="comment-label">审批意见：</span>
            <span class="comment-content">{{ currentDetailItem.comment }}</span>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 下发对话框-->
    <el-dialog v-model="distributeDialogVisible" title="申请下发" width="500px" class="custom-dialog">
      <div class="distribute-content" v-if="currentDistributeItem">
        <div class="distribute-info">
          <p><strong>申请编号：</strong>#{{ currentDistributeItem.id }}</p>
          <p><strong>申请类型：</strong>
            <span v-if="currentDistributeType === 'leave'">请假申请</span>
            <span v-else-if="currentDistributeType === 'reimbursement'">报销申请</span>
            <span v-else-if="currentDistributeType === 'meeting'">会议申请</span>
            <span v-else-if="currentDistributeType === 'project'">项目申请</span>
            <span v-else-if="currentDistributeType === 'businessTrip'">出差申请</span>
          </p>
          <p><strong>申请人：</strong>{{ extractRealName(currentDistributeItem.applicant || currentDistributeItem.organizer) }}</p>
        </div>
        <el-form label-width="100px" class="distribute-form">
          <el-form-item label="下发对象" required>
            <el-select 
              v-model="distributeTarget" 
              placeholder="请选择下发对象" 
              style="width: 100%" 
              filterable
              multiple
              collapse-tags
              collapse-tags-tooltip
              :max-collapse-tags="3"
            >
              <el-option 
                v-for="emp in allEmployees" 
                :key="emp.id" 
                :label="extractRealName(emp.name) + ' (' + emp.department + ')'" 
                :value="extractRealName(emp.name)"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="下发说明">
            <el-input v-model="distributeComment" type="textarea" :rows="3" placeholder="请输入下发说明（可选）" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="distributeDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleDistribute">确认下发</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 处理过程对话框-->
    <el-dialog v-model="processDialogVisible" title="处理申请" width="550px" class="custom-dialog">
      <div class="process-content" v-if="currentProcessItem">
        <div class="process-info">
          <div class="info-row">
            <span class="info-label">下发编号：</span>
            <span class="info-value">#{{ currentProcessItem.id }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">申请类型：</span>
            <span class="info-value">{{ getApplicationTypeLabel(currentProcessItem.applicationType) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">原申请编号：</span>
            <span class="info-value">#{{ currentProcessItem.applicationId }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">原申请人：</span>
            <span class="info-value">{{ currentProcessItem.applicant }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">下发人：</span>
            <span class="info-value">{{ currentProcessItem.distributedBy }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">下发说明：</span>
            <span class="info-value">{{ currentProcessItem.comment || '-' }}</span>
          </div>
        </div>
        <el-form label-width="100px" class="process-form">
          <el-form-item label="处理过程" required>
            <el-input 
              v-model="processContent" 
              type="textarea" 
              :rows="5" 
              placeholder="请输入具体的处理过程..."
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="processDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitProcess">确认处理</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <p>© 2026 企业管理系统 | 审批中心</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getEmployees,
  getLeaveApplications,
  addLeaveApplication,
  updateLeaveApplication,
  getPendingLeaveApplications,
  getReimbursements,
  addReimbursement,
  updateReimbursement,
  getPendingReimbursements,
  getMeetings,
  addMeeting,
  updateMeeting,
  getPendingMeetings,
  getProjects,
  updateProject,
  deleteProject,
  getBusinessTrips,
  updateBusinessTrip,
  getDistributedRecords,
  getAllDistributedRecords,
  addDistributedRecord,
  updateDistributedRecord
} from '../services/api'

const router = useRouter()
const route = useRoute()

// 加载状态
const loading = ref(false)

// 当前标签页
const activeTab = ref((route.query.tab as string) || 'project')

// 视图模式
const viewMode = ref('list')

// 搜索关键词
const searchKeyword = ref('')

// 筛选状态
const leaveFilter = ref('all')
const reimbursementFilter = ref('all')
const meetingFilter = ref('all')
const projectFilter = ref('all')
const businessTripFilter = ref('all')

// 类型筛选
const projectTypeFilter = ref('all')
const businessTripTypeFilter = ref('all')

// 人名筛选
const leavePersonFilter = ref('all')
const reimbursementPersonFilter = ref('all')
const meetingPersonFilter = ref('all')

// 日期类型选择
const leaveDateType = ref('range')
const reimbursementDateType = ref('range')
const meetingDateType = ref('range')

// 日期范围筛选
const leaveDateRange = ref([])
const reimbursementDateRange = ref([])
const meetingDateRange = ref([])

// 单日期筛选
const leaveSingleDate = ref(null)
const reimbursementSingleDate = ref(null)
const meetingSingleDate = ref(null)

// 月份筛选
const leaveMonthDate = ref(null)
const reimbursementMonthDate = ref(null)
const meetingMonthDate = ref(null)

// 年份筛选
const leaveYearDate = ref(null)
const reimbursementYearDate = ref(null)
const meetingYearDate = ref(null)

// 标签页配置
const tabs = computed(() => {
  const allMeetings = [...meetingRecords.value, ...allMeetingRecords.value]
  const uniqueMeetings = allMeetings.filter((item, index, self) => 
    index === self.findIndex(t => t.id === item.id)
  )
  const meetingCount = uniqueMeetings.filter(r => r.status === '审批中' || r.status === '待审核' || r.status === '待审批' || r.status === 'pending').length
  
  const allProjects = [...projectRecords.value, ...allProjectRecords.value]
  const uniqueProjects = allProjects.filter((item, index, self) => 
    index === self.findIndex(t => t.id === item.id)
  )
  const projectCount = uniqueProjects.filter(r => r.status === '审批中' || r.status === '待审核' || r.status === '待审批' || r.status === 'pending').length
  
  const baseTabs = [
    { name: 'leave', label: '请假申请', icon: '📝', badge: pendingLeaveCount.value },
    { name: 'reimbursement', label: '报销管理', icon: '💰', badge: pendingReimbursementCount.value },
    { name: 'meeting', label: '会议管理', icon: '📅', badge: meetingCount },
    { name: 'project', label: '项目申请', icon: '📊', badge: projectCount },
    { name: 'businessTrip', label: '出差申请', icon: '✈️', badge: pendingBusinessTripCount.value }
  ]

  if (!isAdmin.value) {
    baseTabs.push({ name: 'distributed', label: '下发管理', icon: '📨', badge: pendingDistributedCount.value })
  }

  return baseTabs
})

// 审批统计
const approvalStats = ref([
  { key: 'pending', label: '待审批', value: 0, gradient: 'linear-gradient(135deg, #FF9800, #FFC107)', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z' },
  { key: 'approved', label: '已批准', value: 0, gradient: 'linear-gradient(135deg, #4CAF50, #8BC34A)', icon: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z' },
  { key: 'rejected', label: '已拒绝', value: 0, gradient: 'linear-gradient(135deg, #f44336, #ff5722)', icon: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z' },
  { key: 'total', label: '总申请', value: 0, gradient: 'linear-gradient(135deg, #2196F3, #03A9F4)', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z' }
])

// 员工列表
const allEmployees = ref([])

// 数据列表
// 统计详情对话框
const statDetailDialogVisible = ref(false)
const statDetailTitle = ref('')
const statDetailRecords = ref([])

// 打开统计详情
const openStatDetail = (statKey: string) => {
  const allRecords = [
    ...(isAdmin.value ? allLeaveRecords.value : leaveRecords.value),
    ...(isAdmin.value ? allReimbursementRecords.value : reimbursementRecords.value),
    ...meetingRecords.value,
    ...(isAdmin.value ? allProjectRecords.value : projectRecords.value),
    ...(isAdmin.value ? allBusinessTripRecords.value : businessTripRecords.value)
  ].map(record => ({
    ...record,
    _type: record.projectName ? 'project' : record.reimburseType ? 'reimbursement' : record.leaveType ? 'leave' : record.destination ? 'businessTrip' : 'meeting'
  }))

  let filteredRecords = []
  
  switch (statKey) {
    case 'pending':
      statDetailTitle.value = '待审批列表'
      filteredRecords = allRecords.filter(r => r.status === '审批中' || r.status === 'pending')
      break
    case 'approved':
      statDetailTitle.value = '已批准列表'
      filteredRecords = allRecords.filter(r => r.status === '已批准' || r.status === 'approved')
      break
    case 'rejected':
      statDetailTitle.value = '已拒绝列表'
      filteredRecords = allRecords.filter(r => r.status === '已拒绝' || r.status === '拒绝' || r.status === 'rejected')
      break
    case 'total':
      statDetailTitle.value = '所有申请列表'
      filteredRecords = allRecords
      break
    default:
      return
  }

  statDetailRecords.value = filteredRecords
  statDetailDialogVisible.value = true
}

// 获取统计详情中的类型标签
const getStatDetailTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    'project': '项目申请',
    'reimbursement': '报销申请',
    'leave': '请假申请',
    'businessTrip': '出差申请',
    'meeting': '会议申请'
  }
  return typeMap[type] || type
}

// 获取统计详情中的名称
const getStatDetailName = (record: any) => {
  return record.projectName || record.title || record.reimburseType || record.leaveType || record.destination || '未知'
}
const leaveRecords = ref([])
const reimbursementRecords = ref([])
const meetingRecords = ref([])
const projectRecords = ref([])
const businessTripRecords = ref([])
const allLeaveRecords = ref([])
const allReimbursementRecords = ref([])
const allMeetingRecords = ref([])
const allProjectRecords = ref([])
const allBusinessTripRecords = ref([])
const distributedRecords = ref([]) // 下发记录列表
const allDistributedRecords = ref([]) // 所有下发记录（管理员用）
// 对话框状态
const leaveDialogVisible = ref(false)
const reimbursementDialogVisible = ref(false)
const meetingDialogVisible = ref(false)
const approvalDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const distributeDialogVisible = ref(false)

// 当前审批/详情项
const currentApprovalItem = ref(null)
const currentDetailItem = ref(null)
const currentDetailType = ref('')

// 下发相关
const currentDistributeItem = ref(null)
const currentDistributeType = ref('')
const distributeTarget = ref<string[]>([])
const distributeComment = ref('')

// 处理过程相关
const processDialogVisible = ref(false)
const currentProcessItem = ref(null)
const processContent = ref('')

// 表单数据
const leaveForm = ref({
  leaveType: '',
  startDate: '',
  endDate: '',
  days: '',
  reason: '',
  approver: '总经理'
})

const reimbursementForm = ref({
  reimburseType: '',
  amount: '',
  reimburseDate: '',
  reason: '',
  approver: '总经理'
})

const meetingForm = ref({
  title: '',
  meetingDate: '',
  meetingTime: '',
  location: '',
  participants: '',
  agenda: '',
  approver: '总经理'
})

const approvalForm = ref({
  id: '',
  type: '',
  comment: '',
  result: ''
})

// 表单验证规则
const leaveRules = {
  leaveType: [{ required: true, message: '请选择请假类型', trigger: 'change' }],
  startDate: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  endDate: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
  days: [{ required: true, message: '请输入请假天数', trigger: 'blur' }],
  reason: [{ required: true, message: '请输入请假原因', trigger: 'blur' }]
}

const reimbursementRules = {
  reimburseType: [{ required: true, message: '请选择报销类型', trigger: 'change' }],
  amount: [{ required: true, message: '请输入报销金额', trigger: 'blur' }],
  reimburseDate: [{ required: true, message: '请选择报销日期', trigger: 'change' }],
  reason: [{ required: true, message: '请输入报销事由', trigger: 'blur' }]
}

const meetingRules = {
  title: [{ required: true, message: '请输入会议主题', trigger: 'blur' }],
  meetingDate: [{ required: true, message: '请选择会议日期', trigger: 'change' }],
  meetingTime: [{ required: true, message: '请选择会议时间', trigger: 'change' }],
  location: [{ required: true, message: '请输入会议地点', trigger: 'blur' }],
  participants: [{ required: true, message: '请输入参会人员', trigger: 'blur' }],
  agenda: [{ required: true, message: '请输入会议议程', trigger: 'blur' }]
}

// 表单引用
const leaveFormRef = ref()
const reimbursementFormRef = ref()
const meetingFormRef = ref()
const approvalFormRef = ref()

// 当前用户
const currentUsername = computed(() => {
  return localStorage.getItem('username') || '当前用户'
})

// 计算用户角色
const isAdmin = computed(() => {
  const role = localStorage.getItem('role')
  const username = localStorage.getItem('username')
  // 支持多种管理员和总经理角色标识
  const adminRoles = ['admin', 'gm', 'ceo', 'general_manager', 'manager']
  const isAdminRole = adminRoles.includes(role?.toLowerCase() || '')
  const isAdminName = username === '总经理' || username?.includes('admin')
  console.log('isAdmin计算结果:', isAdminRole || isAdminName)
  console.log('当前用户名:', username)
  console.log('当前角色:', role)
  return isAdminRole || isAdminName
})

// 待处理数量
const pendingLeaveCount = computed(() => leaveRecords.value.filter(r => r.status === '审批中').length)
const pendingReimbursementCount = computed(() => reimbursementRecords.value.filter(r => r.status === '审批中').length)
const pendingMeetingCount = computed(() => {
  const records = [...meetingRecords.value, ...allMeetingRecords.value]
  return records.filter(r => r.status === '审批中' || r.status === '待审核' || r.status === 'pending').length
})
const pendingProjectCount = computed(() => {
  const records = [...projectRecords.value, ...allProjectRecords.value]
  return records.filter(r => r.status === '审批中' || r.status === '待审核' || r.status === 'pending').length
})
const pendingBusinessTripCount = computed(() => businessTripRecords.value.filter(r => r.status === 'pending').length)
const pendingDistributedCount = computed(() => distributedRecords.value.filter(r => r.status === '待处理').length)

// 提取真实姓名（从emp_姓名_时间戳格式中提取）
const extractRealName = (name: string): string => {
  if (!name) return ''
  // 匹配 emp_姓名_时间戳格式
  const match = name.match(/^emp_(.+?)_\d+$/)
  if (match) {
    return match[1]
  }
  return name
}

// 获取所有申请人/组织者列表（用于筛选）
const leaveApplicants = computed(() => {
  const applicants = new Set(
    allLeaveRecords.value
      .map(r => extractRealName(r.applicant))
      .filter(Boolean)
  )
  return Array.from(applicants).sort()
})

const reimbursementApplicants = computed(() => {
  const applicants = new Set(
    allReimbursementRecords.value
      .map(r => extractRealName(r.applicant))
      .filter(Boolean)
  )
  return Array.from(applicants).sort()
})

const meetingOrganizers = computed(() => {
  const organizers = new Set(
    meetingRecords.value
      .map(r => extractRealName(r.organizer))
      .filter(Boolean)
  )
  return Array.from(organizers).sort()
})

// 过滤后的记录
const filteredLeaveRecords = computed(() => {
  let records = isAdmin.value ? allLeaveRecords.value : leaveRecords.value
  
  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    records = records.filter(r => 
      r.leaveType?.toLowerCase().includes(keyword) ||
      r.reason?.toLowerCase().includes(keyword) ||
      r.applicant?.toLowerCase().includes(keyword)
    )
  }
  
  // 状态筛选（仅管理员）
  if (isAdmin.value && leaveFilter.value !== 'all') {
    records = records.filter(r => r.status === leaveFilter.value)
  }
  
  // 人名筛选（仅管理员）
  if (isAdmin.value && leavePersonFilter.value !== 'all' && leavePersonFilter.value) {
    records = records.filter(r => extractRealName(r.applicant) === leavePersonFilter.value)
  }
  
  // 日期筛选
  if (isAdmin.value) {
    if (leaveDateType.value === 'day' && leaveSingleDate.value) {
      // 按天筛选
      const targetDate = new Date(leaveSingleDate.value)
      targetDate.setHours(0, 0, 0, 0)
      const nextDay = new Date(targetDate)
      nextDay.setDate(targetDate.getDate() + 1)
      nextDay.setHours(0, 0, 0, 0)
      
      records = records.filter(r => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= targetDate && submitDate < nextDay
      })
    } else if (leaveDateType.value === 'range' && leaveDateRange.value && leaveDateRange.value.length === 2) {
      // 按区间筛选
      const startDate = new Date(leaveDateRange.value[0])
      const endDate = new Date(leaveDateRange.value[1])
      endDate.setHours(23, 59, 59, 999) // 设置为当天结束时间
      
      records = records.filter(r => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= startDate && submitDate <= endDate
      })
    } else if (leaveDateType.value === 'month' && leaveMonthDate.value) {
      // 按月筛选
      const monthDate = new Date(leaveMonthDate.value)
      const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
      endDate.setHours(23, 59, 59, 999)
      
      records = records.filter(r => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= startDate && submitDate <= endDate
      })
    } else if (leaveDateType.value === 'year' && leaveYearDate.value) {
      // 按年筛选
      const yearDate = new Date(leaveYearDate.value)
      const startDate = new Date(yearDate.getFullYear(), 0, 1)
      const endDate = new Date(yearDate.getFullYear(), 11, 31)
      endDate.setHours(23, 59, 59, 999)
      
      records = records.filter(r => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= startDate && submitDate <= endDate
      })
    }
  }

  return records
})

const filteredReimbursementRecords = computed(() => {
  let records = isAdmin.value ? allReimbursementRecords.value : reimbursementRecords.value

  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    records = records.filter(r =>
      r.reimburseType?.toLowerCase().includes(keyword) ||
      r.reason?.toLowerCase().includes(keyword) ||
      r.applicant?.toLowerCase().includes(keyword)
    )
  }

  // 状态筛选（仅管理员）
  if (isAdmin.value && reimbursementFilter.value !== 'all') {
    records = records.filter(r => r.status === reimbursementFilter.value)
  }

  // 人名筛选（仅管理员）
  if (isAdmin.value && reimbursementPersonFilter.value !== 'all' && reimbursementPersonFilter.value) {
    records = records.filter(r => extractRealName(r.applicant) === reimbursementPersonFilter.value)
  }
  
  // 日期筛选
  if (isAdmin.value) {
    if (reimbursementDateType.value === 'day' && reimbursementSingleDate.value) {
      // 按天筛选
      const targetDate = new Date(reimbursementSingleDate.value)
      targetDate.setHours(0, 0, 0, 0)
      const nextDay = new Date(targetDate)
      nextDay.setDate(targetDate.getDate() + 1)
      nextDay.setHours(0, 0, 0, 0)
      
      records = records.filter(r => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= targetDate && submitDate < nextDay
      })
    } else if (reimbursementDateType.value === 'range' && reimbursementDateRange.value && reimbursementDateRange.value.length === 2) {
      // 按区间筛选
      const startDate = new Date(reimbursementDateRange.value[0])
      const endDate = new Date(reimbursementDateRange.value[1])
      endDate.setHours(23, 59, 59, 999) // 设置为当天结束时间
      
      records = records.filter(r => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= startDate && submitDate <= endDate
      })
    } else if (reimbursementDateType.value === 'month' && reimbursementMonthDate.value) {
      // 按月筛选
      const monthDate = new Date(reimbursementMonthDate.value)
      const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
      endDate.setHours(23, 59, 59, 999)
      
      records = records.filter(r => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= startDate && submitDate <= endDate
      })
    } else if (reimbursementDateType.value === 'year' && reimbursementYearDate.value) {
      // 按年筛选
      const yearDate = new Date(reimbursementYearDate.value)
      const startDate = new Date(yearDate.getFullYear(), 0, 1)
      const endDate = new Date(yearDate.getFullYear(), 11, 31)
      endDate.setHours(23, 59, 59, 999)
      
      records = records.filter(r => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= startDate && submitDate <= endDate
      })
    }
  }

  return records
})

const filteredMeetingRecords = computed(() => {
  let records = meetingRecords.value

  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    records = records.filter(r =>
      r.title?.toLowerCase().includes(keyword) ||
      r.location?.toLowerCase().includes(keyword) ||
      r.organizer?.toLowerCase().includes(keyword)
    )
  }

  // 状态筛选（仅管理员）
  if (isAdmin.value && meetingFilter.value !== 'all') {
    records = records.filter(r => r.status === meetingFilter.value)
  }
  
  // 人名筛选（仅管理员）
  if (isAdmin.value && meetingPersonFilter.value !== 'all' && meetingPersonFilter.value) {
    records = records.filter(r => extractRealName(r.organizer) === meetingPersonFilter.value)
  }
  
  // 日期筛选
  if (isAdmin.value) {
    if (meetingDateType.value === 'day' && meetingSingleDate.value) {
      // 按天筛选
      const targetDate = new Date(meetingSingleDate.value)
      targetDate.setHours(0, 0, 0, 0)
      const nextDay = new Date(targetDate)
      nextDay.setDate(targetDate.getDate() + 1)
      nextDay.setHours(0, 0, 0, 0)
      
      records = records.filter(r => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= targetDate && submitDate < nextDay
      })
    } else if (meetingDateType.value === 'range' && meetingDateRange.value && meetingDateRange.value.length === 2) {
      // 按区间筛选
      const startDate = new Date(meetingDateRange.value[0])
      const endDate = new Date(meetingDateRange.value[1])
      endDate.setHours(23, 59, 59, 999) // 设置为当天结束时间
      
      records = records.filter(r => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= startDate && submitDate <= endDate
      })
    } else if (meetingDateType.value === 'month' && meetingMonthDate.value) {
      // 按月筛选
      const monthDate = new Date(meetingMonthDate.value)
      const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
      endDate.setHours(23, 59, 59, 999)
      
      records = records.filter(r => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= startDate && submitDate <= endDate
      })
    } else if (meetingDateType.value === 'year' && meetingYearDate.value) {
      // 按年筛选
      const yearDate = new Date(meetingYearDate.value)
      const startDate = new Date(yearDate.getFullYear(), 0, 1)
      const endDate = new Date(yearDate.getFullYear(), 11, 31)
      endDate.setHours(23, 59, 59, 999)
      
      records = records.filter(r => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= startDate && submitDate <= endDate
      })
    }
  }

  return records
})

const filteredProjectRecords = computed(() => {
  let records = isAdmin.value ? allProjectRecords.value : projectRecords.value

  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    records = records.filter(r =>
      r.projectName?.toLowerCase().includes(keyword) ||
      r.projectType?.toLowerCase().includes(keyword) ||
      r.applicant?.toLowerCase().includes(keyword)
    )
  }

  // 状态筛选（仅管理员）
  if (isAdmin.value && projectFilter.value !== 'all') {
    const statusMap: Record<string, string[]> = {
      '审批中': ['审批中', 'pending'],
      '已批准': ['已批准', 'approved'],
      '已拒绝': ['已拒绝', 'rejected']
    }
    const statusValues = statusMap[projectFilter.value] || [projectFilter.value]
    records = records.filter(r => statusValues.includes(r.status))
  }
  
  // 类型筛选
  if (isAdmin.value && projectTypeFilter.value !== 'all' && projectTypeFilter.value) {
    records = records.filter(r => r.projectType === projectTypeFilter.value)
  }

  return records
})

const filteredBusinessTripRecords = computed(() => {
  let records = isAdmin.value ? allBusinessTripRecords.value : businessTripRecords.value

  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    records = records.filter(r =>
      r.destination?.toLowerCase().includes(keyword) ||
      r.tripType?.toLowerCase().includes(keyword) ||
      r.applicant?.toLowerCase().includes(keyword)
    )
  }

  // 状态筛选（仅管理员）
  if (isAdmin.value && businessTripFilter.value !== 'all') {
    const statusMap: Record<string, string[]> = {
      '审批中': ['审批中', 'pending'],
      '已批准': ['已批准', 'approved'],
      '已拒绝': ['已拒绝', 'rejected']
    }
    const statusValues = statusMap[businessTripFilter.value] || [businessTripFilter.value]
    records = records.filter(r => statusValues.includes(r.status))
  }
  
  // 类型筛选
  if (isAdmin.value && businessTripTypeFilter.value !== 'all' && businessTripTypeFilter.value) {
    records = records.filter(r => r.tripType === businessTripTypeFilter.value)
  }

  return records
})

// 加载员工数据
const loadEmployees = async () => {
  try {
    const response = await getEmployees()
    if (response.success) {
      allEmployees.value = response.data
    }
  } catch (error) {
    console.error('获取员工数据失败:', error)
  }
}

// 加载请假记录
const loadLeaveRecords = async () => {
  try {
    const response = await getLeaveApplications()
    if (response.success) {
      // 管理员/总经理可以看到所有人的记录，普通员工只能看到自己的
      leaveRecords.value = response.data
        .filter((item: any) => isAdmin.value || item.applicant === currentUsername.value)
        .map((item: any) => ({
          ...item,
          submitDate: item.createdAt?.substring(0, 10) || ''
        }))
    }
  } catch (error) {
    console.error('获取请假记录失败:', error)
  }
}

// 加载报销记录
const loadReimbursementRecords = async () => {
  try {
    const response = await getReimbursements()
    if (response.success) {
      // 管理员/总经理可以看到所有人的记录，普通员工只能看到自己的
      reimbursementRecords.value = response.data
        .filter((item: any) => isAdmin.value || item.applicant === currentUsername.value)
        .map((item: any) => ({
          ...item,
          submitDate: item.createdAt?.substring(0, 10) || ''
        }))
    }
  } catch (error) {
    console.error('获取报销记录失败:', error)
  }
}

// 加载会议记录
const loadMeetingRecords = async () => {
  try {
    const response = await getMeetings()
    if (response.success) {
      // 管理员/总经理可以看到所有人的记录，普通员工只能看到自己的
      meetingRecords.value = response.data
        .filter((item: any) => isAdmin.value || item.organizer === currentUsername.value)
        .map((item: any) => ({
          ...item,
          submitDate: item.createdAt?.substring(0, 10) || ''
        }))
    }
  } catch (error) {
    console.error('获取会议记录失败:', error)
  }
}

// 加载所有请假记录（管理员）
const loadAllLeaveRecords = async () => {
  try {
    const response = await getLeaveApplications()
    if (response.success) {
      // 先设置基础数据
      allLeaveRecords.value = response.data.map((item: any) => ({
        ...item,
        submitDate: item.createdAt?.substring(0, 10) || '',
        distributedUsers: []
      }))
      
      // 然后更新下发人员数据
      allLeaveRecords.value = allLeaveRecords.value.map((item: any) => ({
        ...item,
        distributedUsers: getDistributedUsersForApplication(item.id, 'leave')
      }))
    }
  } catch (error) {
    console.error('获取所有请假记录失败:', error)
  }
}

// 加载所有报销记录（管理员）
const loadAllReimbursementRecords = async () => {
  try {
    const response = await getReimbursements()
    if (response.success) {
      // 先设置基础数据
      allReimbursementRecords.value = response.data.map((item: any) => ({
        ...item,
        submitDate: item.createdAt?.substring(0, 10) || '',
        distributedUsers: []
      }))
      
      // 然后更新下发人员数据
      allReimbursementRecords.value = allReimbursementRecords.value.map((item: any) => ({
        ...item,
        distributedUsers: getDistributedUsersForApplication(item.id, 'reimbursement')
      }))
    }
  } catch (error) {
    console.error('获取所有报销记录失败:', error)
  }
}

// 加载所有会议记录（管理员）
const loadAllMeetingRecords = async () => {
  try {
    const response = await getMeetings()
    if (response.success) {
      // 先设置基础数据
      allMeetingRecords.value = response.data.map((item: any) => ({
        ...item,
        submitDate: item.createdAt?.substring(0, 10) || '',
        distributedUsers: []
      }))
      
      // 然后更新下发人员数据
      allMeetingRecords.value = allMeetingRecords.value.map((item: any) => ({
        ...item,
        distributedUsers: getDistributedUsersForApplication(item.id, 'meeting')
      }))
    }
  } catch (error) {
    console.error('获取所有会议记录失败:', error)
  }
}

// 加载项目记录
const loadProjectRecords = async () => {
  try {
    console.log('开始加载项目记录...')
    const response = await getProjects()
    console.log('项目API响应:', response)
    if (response.success && response.data && response.data.list) {
      console.log('项目数据:', response.data.list)
      console.log('当前用户名:', currentUsername.value)
      console.log('是否管理员:', isAdmin.value)
      // 管理员/总经理可以看到所有人的记录，普通员工只能看到自己的
      const filteredData = response.data.list.filter((item: any) => {
        const result = isAdmin.value || item.applicant_name === currentUsername.value
        console.log(`筛选项目 ${item.id}: ${item.applicant_name} === ${currentUsername.value} ? ${result}`)
        return result
      })
      console.log('筛选后的数据:', filteredData)
      console.log('筛选后的数据长度:', filteredData.length)
      // 测试map函数
      const mappedData = filteredData.map((item: any, index: number) => {
        console.log(`映射项目 ${index}:`, item)
        // 尝试处理编码问题
        let projectName = item.project_name ? String(item.project_name) : ''
        let projectType = item.project_type ? String(item.project_type) : ''
        
        // 尝试修复乱码
        try {
          // 尝试使用不同的编码转换方法
          if (projectName.includes('?') && projectName.length > 1) {
            // 尝试解码可能的UTF-8编码
            projectName = decodeURIComponent(escape(projectName))
          }
          if (projectType.includes('?') && projectType.length > 1) {
            // 尝试解码可能的UTF-8编码
            projectType = decodeURIComponent(escape(projectType))
          }
        } catch (e) {
          console.error('编码转换失败:', e)
        }
        
        // 如果仍然是乱码，使用占位文本
        if (projectName.includes('????') || /^\?+$/.test(projectName)) {
          projectName = '未知项目名称'
        }
        if (projectType.includes('????') || /^\?+$/.test(projectType)) {
          projectType = '未知项目类型'
        }
        
        return {
          ...item,
          applicant: item.applicant_name,
          projectName: projectName,
          projectType: projectType,
          submitDate: item.created_at?.substring(0, 10) || ''
        }
      })
      console.log('映射后的数据:', mappedData)
      console.log('映射后的数据长度:', mappedData.length)
      // 测试赋值
      projectRecords.value = mappedData
      console.log('最终项目记录:', projectRecords.value)
      console.log('最终项目记录长度:', projectRecords.value.length)
    }
  } catch (error) {
    console.error('获取项目记录失败:', error)
  }
}

// 加载所有项目记录（管理员）
const loadAllProjectRecords = async () => {
  try {
    console.log('开始加载所有项目记录...')
    const response = await getProjects()
    console.log('项目API响应:', response)
    if (response.success && response.data && response.data.list) {
      console.log('项目数据:', response.data.list)
      // 先设置基础数据
      allProjectRecords.value = response.data.list.map((item: any) => {
        // 尝试处理编码问题
        let projectName = item.project_name ? String(item.project_name) : ''
        let projectType = item.project_type ? String(item.project_type) : ''
        
        // 尝试修复乱码
        try {
          // 尝试使用不同的编码转换方法
          if (projectName.includes('?') && projectName.length > 1) {
            // 尝试解码可能的UTF-8编码
            projectName = decodeURIComponent(escape(projectName))
          }
          if (projectType.includes('?') && projectType.length > 1) {
            // 尝试解码可能的UTF-8编码
            projectType = decodeURIComponent(escape(projectType))
          }
        } catch (e) {
          console.error('编码转换失败:', e)
        }
        
        // 如果仍然是乱码，使用占位文本
        if (projectName.includes('????') || /^\?+$/.test(projectName)) {
          projectName = '未知项目名称'
        }
        if (projectType.includes('????') || /^\?+$/.test(projectType)) {
          projectType = '未知项目类型'
        }
        
        return {
          ...item,
          applicant: item.applicant_name,
          projectName: projectName,
          projectType: projectType,
          submitDate: item.created_at?.substring(0, 10) || '',
          distributedUsers: []
        }
      })
      console.log('所有项目记录:', allProjectRecords.value)
      
      // 然后更新下发人员数据
      allProjectRecords.value = allProjectRecords.value.map((item: any) => ({
        ...item,
        distributedUsers: getDistributedUsersForApplication(item.id, 'project')
      }))
      console.log('更新下发人员后的数据:', allProjectRecords.value)
    }
  } catch (error) {
    console.error('获取所有项目记录失败:', error)
  }
}

// 加载出差记录
const loadBusinessTripRecords = async () => {
  try {
    console.log('开始加载出差记录...')
    const response = await getBusinessTrips()
    console.log('出差API响应:', response)
    if (response.success && response.data && response.data.list) {
      console.log('出差数据:', response.data.list)
      console.log('当前用户名:', currentUsername.value)
      console.log('是否管理员:', isAdmin.value)
      // 管理员/总经理可以看到所有人的记录，普通员工只能看到自己的
      const filteredData = response.data.list.filter((item: any) => {
        const result = isAdmin.value || item.applicant_name === currentUsername.value
        console.log(`筛选出差 ${item.id}: ${item.applicant_name} === ${currentUsername.value} ? ${result}`)
        return result
      })
      console.log('筛选后的数据:', filteredData)
      console.log('筛选后的数据长度:', filteredData.length)
      // 测试map函数
      const mappedData = filteredData.map((item: any, index: number) => {
        console.log(`映射出差 ${index}:`, item)
        // 尝试处理编码问题
        let destination = item.destination ? String(item.destination) : ''
        let tripType = item.trip_type ? String(item.trip_type) : ''
        
        // 尝试修复乱码
        try {
          // 尝试使用不同的编码转换方法
          if (destination.includes('?') && destination.length > 1) {
            // 尝试解码可能的UTF-8编码
            destination = decodeURIComponent(escape(destination))
          }
          if (tripType.includes('?') && tripType.length > 1) {
            // 尝试解码可能的UTF-8编码
            tripType = decodeURIComponent(escape(tripType))
          }
        } catch (e) {
          console.error('编码转换失败:', e)
        }
        
        // 如果仍然是乱码，使用占位文本
        if (destination.includes('????') || /^\?+$/.test(destination)) {
          destination = '未知目的地'
        }
        if (tripType.includes('????') || /^\?+$/.test(tripType)) {
          tripType = '未知出差类型'
        }
        
        return {
          ...item,
          applicant: item.applicant_name,
          destination: destination,
          tripType: tripType,
          submitDate: item.created_at?.substring(0, 10) || '',
          estimatedCost: item.estimated_cost || item.estimatedCost || 0
        }
      })
      console.log('映射后的数据:', mappedData)
      console.log('映射后的数据长度:', mappedData.length)
      // 测试赋值
      businessTripRecords.value = mappedData
      console.log('最终出差记录:', businessTripRecords.value)
      console.log('最终出差记录长度:', businessTripRecords.value.length)
    }
  } catch (error) {
    console.error('获取出差记录失败:', error)
  }
}

// 加载所有出差记录（管理员）
const loadAllBusinessTripRecords = async () => {
  try {
    console.log('开始加载所有出差记录...')
    const response = await getBusinessTrips()
    console.log('出差API响应:', response)
    if (response.success && response.data && response.data.list) {
      console.log('出差数据:', response.data.list)
      // 先设置基础数据
      allBusinessTripRecords.value = response.data.list.map((item: any) => {
        // 尝试处理编码问题
        let destination = item.destination ? String(item.destination) : ''
        let tripType = item.trip_type ? String(item.trip_type) : ''
        
        // 尝试修复乱码
        try {
          // 尝试使用不同的编码转换方法
          if (destination.includes('?') && destination.length > 1) {
            // 尝试解码可能的UTF-8编码
            destination = decodeURIComponent(escape(destination))
          }
          if (tripType.includes('?') && tripType.length > 1) {
            // 尝试解码可能的UTF-8编码
            tripType = decodeURIComponent(escape(tripType))
          }
        } catch (e) {
          console.error('编码转换失败:', e)
        }
        
        // 如果仍然是乱码，使用占位文本
        if (destination.includes('????') || /^\?+$/.test(destination)) {
          destination = '未知目的地'
        }
        if (tripType.includes('????') || /^\?+$/.test(tripType)) {
          tripType = '未知出差类型'
        }
        
        return {
          ...item,
          applicant: item.applicant_name,
          destination: destination,
          tripType: tripType,
          submitDate: item.created_at?.substring(0, 10) || '',
          estimatedCost: item.estimated_cost || item.estimatedCost || 0,
          distributedUsers: []
        }
      })
      console.log('所有出差记录:', allBusinessTripRecords.value)
      
      // 然后更新下发人员数据
      allBusinessTripRecords.value = allBusinessTripRecords.value.map((item: any) => ({
        ...item,
        distributedUsers: getDistributedUsersForApplication(item.id, 'businessTrip')
      }))
      console.log('更新下发人员后的数据:', allBusinessTripRecords.value)
    }
  } catch (error) {
    console.error('获取所有出差记录失败:', error)
  }
}

// 更新统计数据
const updateStats = () => {
  const allRecords = [
    ...(isAdmin.value ? allLeaveRecords.value : leaveRecords.value),
    ...(isAdmin.value ? allReimbursementRecords.value : reimbursementRecords.value),
    ...meetingRecords.value,
    ...(isAdmin.value ? allProjectRecords.value : projectRecords.value),
    ...(isAdmin.value ? allBusinessTripRecords.value : businessTripRecords.value)
  ]
  
  const pendingStat = approvalStats.value.find(s => s.key === 'pending')
  if (pendingStat) pendingStat.value = allRecords.filter(r => r.status === '审批中' || r.status === 'pending').length
  
  const approvedStat = approvalStats.value.find(s => s.key === 'approved')
  if (approvedStat) approvedStat.value = allRecords.filter(r => r.status === '已批准' || r.status === 'approved').length
  
  const rejectedStat = approvalStats.value.find(s => s.key === 'rejected')
  if (rejectedStat) rejectedStat.value = allRecords.filter(r => r.status === '已拒绝' || r.status === '拒绝' || r.status === 'rejected').length
  
  const totalStat = approvalStats.value.find(s => s.key === 'total')
  if (totalStat) totalStat.value = allRecords.length
}

// 获取项目类型样式类
const getProjectTypeClass = (type: string) => {
  const map: Record<string, string> = {
    '研发项目': 'type-research',
    '市场项目': 'type-market',
    '运营项目': 'type-operation',
    '基建项目': 'type-construction',
    '其他项目': 'type-other'
  }
  return map[type] || 'type-other'
}

// 获取优先级样式类
const getPriorityClass = (priority: string) => {
  const map: Record<string, string> = {
    '高': 'priority-high',
    '中': 'priority-medium',
    '低': 'priority-low'
  }
  return map[priority] || 'priority-low'
}

// 获取出差类型样式类
const getTripTypeClass = (type: string) => {
  const map: Record<string, string> = {
    '国内出差': 'type-domestic',
    '国外出差': 'type-international'
  }
  return map[type] || 'type-domestic'
}

// 加载所有下发记录（管理员用）
const loadAllDistributedRecords = async () => {
  try {
    const response = await getAllDistributedRecords()
    if (response.success) {
      allDistributedRecords.value = response.data || []
    }
  } catch (error) {
    console.error('获取所有下发记录失败:', error)
  }
}

// 获取申请的下发人员列表
const getDistributedUsersForApplication = (applicationId: number, applicationType: string) => {
  const records = allDistributedRecords.value.filter(
    r => Number(r.applicationId) === Number(applicationId) && r.applicationType === applicationType
  )
  // 对下发人员进行去重处理，避免重复显示
  const uniqueUsers = [...new Set(records.map(r => r.targetUser))]
  return uniqueUsers
}

// 加载所有数据
const loadAllData = async () => {
  // 先加载非管理员数据
  await Promise.all([
    loadLeaveRecords(),
    loadReimbursementRecords(),
    loadMeetingRecords(),
    loadProjectRecords(),
    loadBusinessTripRecords()
  ])
  
  // 如果是管理员，先加载所有下发记录，再加载管理员视图的数据
  if (isAdmin.value) {
    await loadAllDistributedRecords()
    await Promise.all([
      loadAllLeaveRecords(),
      loadAllReimbursementRecords(),
      loadAllMeetingRecords(),
      loadAllProjectRecords(),
      loadAllBusinessTripRecords()
    ])
  }
  
  updateStats()
}

// 格式化日期
const formatDate = (date: any, showTime: boolean = true) => {
  if (!date) return ''
  // 处理字符串格式的日期，确保正确解析为UTC时间
  let dateObj: Date
  if (typeof date === 'string') {
    // 检查是否包含时间
    if (date.includes(' ')) {
      // 假设后端存储的是UTC时间，格式为 "YYYY-MM-DD HH:mm:ss"
      // 将其转换为ISO格式，然后解析为Date对象
      const [datePart, timePart] = date.split(' ')
      const isoString = `${datePart}T${timePart}Z`
      dateObj = new Date(isoString)
    } else {
      // 只有日期部分
      dateObj = new Date(date)
    }
  } else {
    dateObj = date instanceof Date ? date : new Date(date)
  }
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Shanghai' // 使用北京时间（东八区）
  }
  if (showTime) {
    options.hour = '2-digit'
    options.minute = '2-digit'
    options.hour12 = false
  }
  // 使用 toLocaleString 方法，指定时区为北京时间
  return dateObj.toLocaleString('zh-CN', options)
}

// 打开对话框
const openLeaveDialog = () => {
  leaveForm.value = { leaveType: '', startDate: '', endDate: '', days: '', reason: '', approver: '总经理' }
  leaveDialogVisible.value = true
}

const openReimbursementDialog = () => {
  reimbursementForm.value = { reimburseType: '', amount: '', reimburseDate: '', reason: '', approver: '总经理' }
  reimbursementDialogVisible.value = true
}

const openMeetingDialog = () => {
  meetingForm.value = { title: '', meetingDate: '', meetingTime: '', location: '', participants: '', agenda: '', approver: '总经理' }
  meetingDialogVisible.value = true
}

// 提交申请
const submitLeaveApplication = async () => {
  leaveFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      try {
        const data = {
          applicant: currentUsername.value,
          leaveType: leaveForm.value.leaveType,
          startDate: formatDate(leaveForm.value.startDate),
          endDate: formatDate(leaveForm.value.endDate),
          days: leaveForm.value.days,
          reason: leaveForm.value.reason,
          approver: leaveForm.value.approver
        }
        const response = await addLeaveApplication(data)
        if (response.success) {
            ElMessage.success('请假申请已提交')
            leaveDialogVisible.value = false
            await loadLeaveRecords()
          updateStats()
        } else {
          ElMessage.error(response.message || '提交失败')
        }
      } catch (error) {
        console.error('提交请假申请失败:', error)
        ElMessage.error('提交失败')
      }
    }
  })
}

const submitReimbursementApplication = async () => {
  reimbursementFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      try {
        const data = {
          applicant: currentUsername.value,
          reimburseType: reimbursementForm.value.reimburseType,
          amount: reimbursementForm.value.amount,
          reimburseDate: formatDate(reimbursementForm.value.reimburseDate),
          reason: reimbursementForm.value.reason,
          approver: reimbursementForm.value.approver
        }
        const response = await addReimbursement(data)
        if (response.success) {
            ElMessage.success('报销申请已提交')
            reimbursementDialogVisible.value = false
            await loadReimbursementRecords()
          updateStats()
        } else {
          ElMessage.error(response.message || '提交失败')
        }
      } catch (error) {
        console.error('提交报销申请失败:', error)
        ElMessage.error('提交失败')
      }
    }
  })
}

const submitMeetingApplication = async () => {
  meetingFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      try {
        const meetingTime = meetingForm.value.meetingTime instanceof Date 
          ? meetingForm.value.meetingTime.toTimeString().substring(0, 5)
          : meetingForm.value.meetingTime
        
        const data = {
          title: meetingForm.value.title,
          organizer: currentUsername.value,
          meetingDate: formatDate(meetingForm.value.meetingDate),
          meetingTime: meetingTime,
          location: meetingForm.value.location,
          participants: meetingForm.value.participants,
          agenda: meetingForm.value.agenda,
          approver: meetingForm.value.approver
        }
        const response = await addMeeting(data)
        if (response.success) {
            ElMessage.success('会议已创建')
            meetingDialogVisible.value = false
            await loadMeetingRecords()
          updateStats()
        } else {
          ElMessage.error(response.message || '创建失败')
        }
      } catch (error) {
        console.error('创建会议失败:', error)
        ElMessage.error('创建失败')
      }
    }
  })
}

// 审批相关
const approveLeave = (row: any) => {
  currentApprovalItem.value = { ...row, type: 'leave' }
  approvalForm.value = { id: row.id, type: 'leave', comment: '', result: '' }
  approvalDialogVisible.value = true
}

const approveReimbursement = (row: any) => {
  currentApprovalItem.value = { ...row, type: 'reimbursement' }
  approvalForm.value = { id: row.id, type: 'reimbursement', comment: '', result: '' }
  approvalDialogVisible.value = true
}

const approveMeeting = (row: any) => {
  currentApprovalItem.value = { ...row, type: 'meeting' }
  approvalForm.value = { id: row.id, type: 'meeting', comment: '', result: '' }
  approvalDialogVisible.value = true
}

const approveProject = (row: any) => {
  currentApprovalItem.value = { ...row, type: 'project' }
  approvalForm.value = { id: row.id, type: 'project', comment: '', result: '' }
  approvalDialogVisible.value = true
}

const approveBusinessTrip = (row: any) => {
  currentApprovalItem.value = { ...row, type: 'businessTrip' }
  approvalForm.value = { id: row.id, type: 'businessTrip', comment: '', result: '' }
  approvalDialogVisible.value = true
}

const getApprovalTypeName = (type: string) => {
  const typeMap: Record<string, string> = {
    leave: '请假申请',
    reimbursement: '报销申请',
    meeting: '会议申请',
    project: '项目申请',
    businessTrip: '出差申请'
  }
  return typeMap[type] || type
}

const submitApproval = async () => {
  if (!approvalForm.value.result) {
    ElMessage.warning('请选择审批结果')
    return
  }
  
  try {
    let response
    const data = { comment: approvalForm.value.comment, result: approvalForm.value.result }
    
    switch (approvalForm.value.type) {
      case 'leave':
        response = await updateLeaveApplication(approvalForm.value.id, data)
        break
      case 'reimbursement':
        response = await updateReimbursement(approvalForm.value.id, data)
        break
      case 'meeting':
        response = await updateMeeting(approvalForm.value.id, data)
        break
      case 'project':
        response = await updateProject(approvalForm.value.id, data)
        break
      case 'businessTrip':
        response = await updateBusinessTrip(approvalForm.value.id, data)
        break
    }
    
    if (response?.success) {
        ElMessage.success('审批已完成')
        approvalDialogVisible.value = false
        await loadAllData()
    } else {
      ElMessage.error(response?.message || '审批失败')
    }
  } catch (error) {
    console.error('审批失败:', error)
    ElMessage.error('审批失败')
  }
}

// 取消请假申请
const cancelLeaveApplication = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要取消该请假申请吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const response = await updateLeaveApplication(row.id, {
      result: '取消',
      comment: '用户主动取消申请'
    })

    if (response?.success) {
        ElMessage.success('申请已取消')
        await loadLeaveRecords()
        updateStats()
    } else {
      ElMessage.error(response?.message || '取消失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('取消申请失败:', error)
      ElMessage.error('取消申请失败')
    }
  }
}

// 取消项目申请
const cancelProjectApplication = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要取消该项目申请吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const response = await updateProject(row.id, {
      result: '取消',
      comment: '用户主动取消申请'
    })

    if (response?.success) {
        ElMessage.success('申请已取消')
        await loadProjectRecords()
        updateStats()
    } else {
      ElMessage.error(response?.message || '取消失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('取消申请失败:', error)
      ElMessage.error('取消申请失败')
    }
  }
}

// 删除项目申请
const deleteProjectApplication = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该项目申请吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'danger'
    })

    console.log('删除项目申请，ID:', row.id)
    const response = await deleteProject(row.id)
    console.log('删除项目申请响应:', response)

    if (response?.success) {
        ElMessage.success('申请已删除')
        await loadProjectRecords()
        await loadAllProjectRecords()
        updateStats()
    } else {
      ElMessage.error(response?.message || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除申请失败:', error)
      ElMessage.error('删除申请失败')
    }
  }
}

// 取消出差申请
const cancelBusinessTripApplication = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要取消该出差申请吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const response = await updateBusinessTrip(row.id, {
      result: '取消',
      comment: '用户主动取消申请'
    })

    if (response?.success) {
        ElMessage.success('申请已取消')
        await loadBusinessTripRecords()
        updateStats()
    } else {
      ElMessage.error(response?.message || '取消失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('取消申请失败:', error)
      ElMessage.error('取消申请失败')
    }
  }
}

// 管理员终止流程
const terminateProcess = async (row: any, type: string) => {
  try {
    await ElMessageBox.confirm(
        '确定要强制终止该审批流程吗？此操作不可恢复！',
        '⚠️ 警告：终止审批流程',
        {
        confirmButtonText: '确定终止',
        cancelButtonText: '取消',
        type: 'error',
        confirmButtonClass: 'el-button--danger'
      }
    )

    let response
    const data = {
        result: '已终止',
        comment: `管理员[${currentUsername.value}]强制终止流程`
      }

    switch (type) {
      case 'leave':
        response = await updateLeaveApplication(row.id, data)
        break
      case 'reimbursement':
        response = await updateReimbursement(row.id, data)
        break
      case 'meeting':
        response = await updateMeeting(row.id, data)
        break
      case 'project':
        response = await updateProject(row.id, data)
        break
      case 'businessTrip':
        response = await updateBusinessTrip(row.id, data)
        break
    }

    if (response?.success) {
        ElMessage.success('流程已强制终止')
        await loadAllData()
      } else {
      ElMessage.error(response?.message || '终止失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('终止流程失败:', error)
      ElMessage.error('终止流程失败')
    }
  }
}

// 导出数据为CSV
const exportToCSV = (data: any[], filename: string, headers: string[], fields: string[]) => {
  // 创建CSV内容
  let csvContent = '\uFEFF' // BOM for UTF-8

  // 添加表头
  csvContent += headers.join(',') + '\n'

  // 添加数据行
  data.forEach(row => {
    const values = fields.map(field => {
      const value = row[field]
      if (value === null || value === undefined) return ''
      // 处理包含逗号或引号的值
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    })
    csvContent += values.join(',') + '\n'
  })

  // 创建下载链接
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  ElMessage.success(`数据已导出 ${filename}`)
}

// 导出请假数据
const exportLeaveData = () => {
  const data = filteredLeaveRecords.value
  if (data.length === 0) {
    ElMessage.warning('没有数据可导出')
    return
  }

  // 根据筛选条件生成文件名
  let fileName = '请假申请记录'
  if (leaveFilter.value !== 'all') {
    fileName += `_${leaveFilter.value}`
  }
  if (leavePersonFilter.value !== 'all' && leavePersonFilter.value) {
    fileName += `_${leavePersonFilter.value}`
  }

  exportToCSV(
    data,
    fileName,
    ['申请编号', '申请人', '请假类型', '开始日期', '结束日期', '请假天数', '请假原因', '审批状态', '审批人', '提交时间'],
    ['id', 'applicant', 'leaveType', 'startDate', 'endDate', 'days', 'reason', 'status', 'approver', 'submitDate']
  )
}

// 导出报销数据
const exportReimbursementData = () => {
  const data = filteredReimbursementRecords.value
  if (data.length === 0) {
    ElMessage.warning('没有数据可导出')
    return
  }

  // 根据筛选条件生成文件名
  let fileName = '报销申请记录'
  if (reimbursementFilter.value !== 'all') {
    fileName += `_${reimbursementFilter.value}`
  }
  if (reimbursementPersonFilter.value !== 'all' && reimbursementPersonFilter.value) {
    fileName += `_${reimbursementPersonFilter.value}`
  }

  exportToCSV(
    data,
    fileName,
    ['报销编号', '申请人', '报销类型', '报销金额', '报销日期', '报销事由', '审批状态', '审批人', '提交时间'],
    ['id', 'applicant', 'reimburseType', 'amount', 'reimburseDate', 'reason', 'status', 'approver', 'submitDate']
  )
}

// 导出会议数据
const exportMeetingData = () => {
  const data = filteredMeetingRecords.value
  if (data.length === 0) {
    ElMessage.warning('没有数据可导出')
    return
  }

  // 根据筛选条件生成文件名
  let fileName = '会议申请记录'
  if (meetingFilter.value !== 'all') {
    fileName += `_${meetingFilter.value}`
  }
  if (meetingPersonFilter.value !== 'all' && meetingPersonFilter.value) {
    fileName += `_${meetingPersonFilter.value}`
  }

  exportToCSV(
    data,
    fileName,
    ['会议编号', '组织者', '会议主题', '会议日期', '会议时间', '会议地点', '参会人员', '会议议程', '审批状态', '审批人', '创建时间'],
    ['id', 'organizer', 'title', 'meetingDate', 'meetingTime', 'location', 'participants', 'agenda', 'status', 'approver', 'submitDate']
  )
}

// 导出项目数据
const exportProjectData = () => {
  const data = filteredProjectRecords.value
  if (data.length === 0) {
    ElMessage.warning('没有数据可导出')
    return
  }

  // 根据筛选条件生成文件名
  let fileName = '项目申请记录'
  if (projectFilter.value !== 'all') {
    fileName += `_${projectFilter.value}`
  }
  if (projectTypeFilter.value !== 'all' && projectTypeFilter.value) {
    fileName += `_${projectTypeFilter.value}`
  }

  exportToCSV(
    data,
    fileName,
    ['申请编号', '申请人', '项目名称', '项目类型', '预算金额', '优先级', '审批状态', '提交时间'],
    ['id', 'applicant', 'projectName', 'projectType', 'budget', 'priority', 'status', 'submitDate']
  )
}

// 导出出差数据
const exportBusinessTripData = () => {
  const data = filteredBusinessTripRecords.value
  if (data.length === 0) {
    ElMessage.warning('没有数据可导出')
    return
  }

  // 根据筛选条件生成文件名
  let fileName = '出差申请记录'
  if (businessTripFilter.value !== 'all') {
    fileName += `_${businessTripFilter.value}`
  }
  if (businessTripTypeFilter.value !== 'all' && businessTripTypeFilter.value) {
    fileName += `_${businessTripTypeFilter.value}`
  }

  exportToCSV(
    data,
    fileName,
    ['申请编号', '申请人', '目的地', '出差类型', '出差天数', '预估费用', '审批状态', '提交时间'],
    ['id', 'applicant', 'destination', 'tripType', 'days', 'estimatedCost', 'status', 'submitDate']
  )
}

// 导出全部数据
const exportAllData = async () => {
  try {
    // 确保所有数据已加载
    await loadAllData()

    // 合并所有数据
    const allData = [
      ...allLeaveRecords.value.map(item => ({
        ...item,
        dataType: '请假申请',
        typeDetail: item.leaveType,
        amount: '',
        dateRange: `${item.startDate} 至 ${item.endDate}`,
        days: item.days
      })),
      ...allReimbursementRecords.value.map(item => ({
        ...item,
        dataType: '报销申请',
        typeDetail: item.reimburseType,
        amount: item.amount,
        dateRange: item.reimburseDate,
        days: ''
      })),
      ...meetingRecords.value.map(item => ({
        ...item,
        dataType: '会议申请',
        typeDetail: item.title,
        amount: '',
        dateRange: `${item.meetingDate} ${item.meetingTime}`,
        days: ''
      })),
      ...projectRecords.value.map(item => ({
        ...item,
        dataType: '项目申请',
        typeDetail: item.projectType,
        amount: item.budget,
        dateRange: '',
        days: ''
      })),
      ...businessTripRecords.value.map(item => ({
        ...item,
        dataType: '出差申请',
        typeDetail: item.tripType,
        amount: item.estimatedCost,
        dateRange: '',
        days: item.days
      }))
    ]

    if (allData.length === 0) {
      ElMessage.warning('没有数据可导出')
      return
    }

    // 按提交时间排序
    allData.sort((a, b) => new Date(b.submitDate).getTime() - new Date(a.submitDate).getTime())

    // 导出汇总数据
    let csvContent = '\uFEFF'
    csvContent += '数据类型,编号,申请人,组织者,类型详情,金额,日期/时间范围,天数,审批状态,审批人,提交时间\n'

    allData.forEach(row => {
      const values = [
        row.dataType,
        row.id,
        row.applicant || row.organizer,
        row.typeDetail,
        row.amount,
        row.dateRange,
        row.days,
        row.status,
        row.approver || '',
        row.submitDate
      ]

      const escapedValues = values.map(value => {
        if (value === null || value === undefined) return ''
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      })

      csvContent += escapedValues.join(',') + '\n'
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `全部审批记录_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    ElMessage.success('全部数据已导出')
  } catch (error) {
    console.error('导出数据失败:', error)
    ElMessage.error('导出数据失败')
  }
}

// 查看详情
const viewDetail = (row: any, type: string) => {
  currentDetailItem.value = row
  currentDetailType.value = type
  detailDialogVisible.value = true
}

// 打开发下对话框
const openDistributeDialog = (row: any, type: string) => {
  currentDistributeItem.value = row
  currentDistributeType.value = type
  distributeTarget.value = []
  distributeComment.value = ''
  distributeDialogVisible.value = true
}

// 执行下发
const handleDistribute = async () => {
  if (!distributeTarget.value || distributeTarget.value.length === 0) {
    ElMessage.warning('请选择下发对象')
    return
  }

  try {
    // 对下发目标进行去重处理，避免重复下发
    const uniqueTargets = [...new Set(distributeTarget.value)]
    
    // 循环下发给每个选中的对象
    const results = []
    for (const target of uniqueTargets) {
      // 保存下发记录到数据库
      const distributeData = {
        applicationId: currentDistributeItem.value.id,
        applicationType: currentDistributeType.value,
        applicant: extractRealName(currentDistributeItem.value.applicant || currentDistributeItem.value.organizer || ''),
        distributedBy: extractRealName(currentUsername.value),
        targetUser: target,
        comment: distributeComment.value || '',
        status: '待处理'
      }

      console.log('下发数据:', distributeData)

      const response = await addDistributedRecord(distributeData)
      console.log('下发响应:', response)
      results.push(response)
    }

    // 检查是否全部成功
    const allSuccess = results.every(r => r.success)
    if (allSuccess) {
      const targetNames = uniqueTargets.join('、')
      ElMessage.success(`已成功下发给 ${targetNames}`)
      distributeDialogVisible.value = false

      // 刷新列表
      if (isAdmin.value) {
        // 管理员需要刷新下发记录和对应的申请列表        await loadAllDistributedRecords()
        await Promise.all([
          loadAllLeaveRecords(),
          loadAllReimbursementRecords()
        ])
      }
      await Promise.all([
        loadLeaveRecords(),
        loadReimbursementRecords(),
        loadMeetingRecords()
      ])
    } else {
        ElMessage.error('部分下发失败，请检查')
      }
  } catch (error: any) {
    console.error('下发失败:', error)
    ElMessage.error('下发失败: ' + (error.message || '未知错误'))
  }
}

// 加载下发记录
const loadDistributedRecords = async () => {
  try {
    loading.value = true
    console.log('开始加载下发记录...')
    console.log('当前用户名:', currentUsername.value)
    
    // 获取当前用户的真实姓名（从emp_姓名_时间戳格式中提取）
    const realUsername = extractRealName(currentUsername.value)
    console.log('提取后的真实姓名:', realUsername)
    
    // 从API获取下发记录
    const response = await getDistributedRecords(realUsername)
    console.log('下发记录API响应:', response)
    
    if (response.success) {
      distributedRecords.value = response.data.map((record: any) => ({
        ...record,
        distributeDate: record.createdAt
      }))
      console.log('加载到的下发记录数量:', distributedRecords.value.length)
    } else {
      // API返回失败，显示空列表
      console.log('API返回失败:', response.message)
      distributedRecords.value = []
    }
  } catch (error) {
    console.error('获取下发记录失败:', error)
    // 显示错误消息以便于调试
    ElMessage.error('获取下发记录失败，请刷新页面重试')
    distributedRecords.value = []
  } finally {
    loading.value = false
  }
}

// 获取申请类型标签
const getApplicationTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    'leave': '请假申请',
    'reimbursement': '报销申请',
    'meeting': '会议申请',
    'project': '项目申请',
    'businessTrip': '出差申请'
  }
  return typeMap[type] || type
}

// 处理下发项目 - 打开处理对话框
const handleDistributedItem = (row: any) => {
  currentProcessItem.value = row
  processContent.value = ''
  processDialogVisible.value = true
}

// 提交处理结果
const submitProcess = async () => {
  if (!processContent.value.trim()) {
    ElMessage.warning('请输入处理过程')
    return
  }

  try {
    // 调用API更新状态，将处理过程保存到processComment字段
    const response = await updateDistributedRecord(currentProcessItem.value.id, {
      status: '已处理',
      processComment: processContent.value.trim()
    })
    if (response.success) {
      // 更新本地数据
      const index = distributedRecords.value.findIndex(r => r.id === currentProcessItem.value.id)
      if (index !== -1) {
        distributedRecords.value[index].status = '已处理'
        distributedRecords.value[index].processComment = processContent.value.trim()
      }
      ElMessage.success('处理成功')
      processDialogVisible.value = false
    } else {
      ElMessage.error(response.message || '处理失败')
    }
  } catch (error) {
    console.error('处理下发记录失败:', error)
    ElMessage.error('处理失败')
  }
}

// 查看下发详情
const viewDistributedDetail = (row: any) => {
  ElMessageBox.alert(`
    <div style="text-align: left;">
      <p><strong>下发编号：</strong>#${row.id}</p>
      <p><strong>申请类型：</strong>${getApplicationTypeLabel(row.applicationType)}</p>
      <p><strong>原申请编号：</strong>#${row.applicationId}</p>
      <p><strong>原申请人：</strong>${row.applicant}</p>
      <p><strong>下发人：</strong>${row.distributedBy}</p>
      <p><strong>下发时间：</strong>${row.distributeDate}</p>
        <p><strong>处理状态：</strong>${row.status}</p>
        <p><strong>下发说明：</strong>${row.comment || '-'}</p>
    </div>
  `, '下发详情', {
    dangerouslyUseHTMLString: true,
    confirmButtonText: '确定'
  })
}

const getDetailFields = (item: any, type: string) => {
  const fields: Record<string, Record<string, string>> = {
      leave: {
        '申请人': item.applicant || currentUsername.value,
        '请假类型': item.leaveType,
        '开始日期': item.startDate,
        '结束日期': item.endDate,
        '请假天数': item.days + '天',
        '请假原因': item.reason,
        '审批人': item.approver || '待分配',
        '提交时间': item.submitDate
      },
      reimbursement: {
        '申请人': item.applicant || currentUsername.value,
        '报销类型': item.reimburseType,
        '报销金额': '¥' + item.amount,
        '报销日期': item.reimburseDate,
        '报销事由': item.reason,
        '审批人': item.approver || '待分配',
        '提交时间': item.submitDate
      },
      meeting: {
        '组织者': item.organizer || currentUsername.value,
        '会议主题': item.title,
        '会议日期': item.meetingDate,
        '会议时间': item.meetingTime,
        '会议地点': item.location,
        '参会人员': item.participants,
        '会议议程': item.agenda,
        '审批人': item.approver || '待分配',
        '创建时间': item.submitDate
      },
      project: {
        '申请人': item.applicant || currentUsername.value,
        '项目名称': item.projectName,
        '项目类型': item.projectType,
        '预算金额': '¥' + item.budget,
        '优先级': item.priority,
        '提交时间': item.submitDate
      },
      businessTrip: {
        '申请人': item.applicant || currentUsername.value,
        '目的地': item.destination,
        '出差类型': item.tripType,
        '出差天数': item.days + '天',
        '预估费用': '¥' + item.estimatedCost,
        '提交时间': item.submitDate
      }
  }
  return fields[type] || {}
}

// 搜索
const handleSearch = () => {
  // 搜索通过计算属性自动处理
}

// 日期范围变化处理
const handleDateRangeChange = () => {
  // 日期范围变化通过计算属性自动处理
}

// 获取状态样式类
const getStatusClass = (status: string) => {
  switch (status) {
    case '审批中':
    case '待审批':
    case 'pending':
      return 'status-pending'
    case '已批准':
    case 'approved':
      return 'status-approved'
    case '已拒绝':
    case '拒绝':
    case 'rejected':
      return 'status-rejected'
    case '已取消':
      return 'status-cancelled'
    case '待处理':
      return 'status-pending-blue'
    case '已处理':
      return 'status-processed-green'
    default:
      return 'status-default'
  }
}

// 将状态转换为中文显示
const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return '审批中'
    case 'approved':
      return '已批准'
    case 'rejected':
      return '已拒绝'
    case 'cancelled':
      return '已取消'
    default:
      return status
  }
}

// 转换请假类型为中文
const getLeaveTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    'personal': '事假',
    'sick': '病假',
    'annual': '年假',
    'wedding': '婚假',
    'maternity': '产假',
    'other': '其他'
  }
  if (type === '??') {
    return '其他'
  }
  return typeMap[type] || type
}



// 获取请假类型样式
const getLeaveTypeClass = (type: string) => {
  // 先转换为中文
  const chineseType = getLeaveTypeText(type)
  const typeClasses: Record<string, string> = {
    '事假': 'type-personal',
    '病假': 'type-sick',
    '年假': 'type-annual',
    '婚假': 'type-wedding',
    '产假': 'type-maternity',
    '其他': 'type-other'
  }
  return typeClasses[chineseType] || 'type-default'
}

// 获取报销类型样式
const getReimburseTypeClass = (type: string) => {
  const typeClasses: Record<string, string> = {
    '差旅费': 'type-travel',
    '办公用品': 'type-office',
    '餐饮费': 'type-meal',
    '交通费': 'type-transport',
    '其他': 'type-other'
  }
  return typeClasses[type] || 'type-default'
}

// 返回
const handleBack = () => {
  router.back()
}

// 跳转到项目申请页面
const goToProjectApply = () => {
  router.push('/oa/project-apply')
}

// 跳转到项目申请列表
const goToProjectList = () => {
  router.push('/oa/project-apply/list')
}

// 跳转到出差申请页面
const goToBusinessTripApply = () => {
  router.push('/oa/business-trip')
}

// 跳转到出差申请列表
const goToBusinessTripList = () => {
  router.push('/oa/business-trip/list')
}

// 处理URL参数（从快捷入口跳转）
watch(() => route.query, (query) => {
  if (query.action === 'create' && query.type) {
    const type = query.type as string
    switch (type) {
      case 'leave':
        activeTab.value = 'leave'
        openLeaveDialog()
        break
      case 'reimbursement':
        activeTab.value = 'reimbursement'
        openReimbursementDialog()
        break
      case 'meeting':
        activeTab.value = 'meeting'
        openMeetingDialog()
        break
    }
    // 清除URL参数
    router.replace({ path: '/oa-workflow' })
  }
}, { immediate: true })

// 组件挂载
onMounted(async () => {
  await loadEmployees()
  await loadAllData()
  // 加载下发记录（无论是否是管理员）
  await loadDistributedRecords()
})
</script>

<style scoped>
.approval-center-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #E4EDF2 0%, #F0F4F8 100%);
}

/* 顶部导航 */
.header {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(100, 149, 237, 0.2);
  padding: 0 2rem;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.logo {
  position: relative;
  display: flex;
  align-items: center;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.logo-glow {
  position: absolute;
  top: -50%;
  left: -20%;
  width: 140%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(100, 149, 237, 0.3), transparent);
  filter: blur(20px);
  animation: glow 3s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

.nav {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  max-width: 600px;
}

.nav-item {
  color: rgba(51, 51, 51, 0.8);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.nav-item:hover,
.nav-item.active {
  color: #333;
  background: rgba(100, 149, 237, 0.2);
  box-shadow: 0 0 15px rgba(100, 149, 237, 0.3);
}

.logout-btn {
  background: rgba(244, 67, 54, 0.1);
  color: #d32f2f;
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.logout-btn:hover {
  background: rgba(244, 67, 54, 0.2);
  box-shadow: 0 0 15px rgba(244, 67, 54, 0.2);
}

/* 主内容区 */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  position: relative;
  z-index: 1;
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* 页面标题 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3);
}

.title-icon svg {
  width: 20px;
  height: 20px;
}

.page-subtitle {
  color: rgba(51, 51, 51, 0.6);
  font-size: 0.9rem;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.search-box {
  width: 280px;
}

/* 统计 */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-item {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(100, 149, 237, 0.15);
}

.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-icon-wrapper svg {
  width: 24px;
  height: 24px;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  line-height: 1;
}

.stat-name {
  font-size: 0.85rem;
  color: rgba(51, 51, 51, 0.6);
  margin-top: 0.25rem;
}

/* 标签容器 */
.tabs-container {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(100, 149, 237, 0.2);
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.tabs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(100, 149, 237, 0.1);
  background: rgba(100, 149, 237, 0.05);
}

.custom-tabs {
  display: flex;
  gap: 0.5rem;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  color: rgba(51, 51, 51, 0.7);
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid transparent;
}

.tab-item:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(100, 149, 237, 0.3);
}

.tab-item.active {
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  color: #fff;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3);
}

.tab-icon {
  font-size: 1.1rem;
}

.tab-badge {
  background: #FF5252;
  color: #fff;
  font-size: 0.7rem;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  font-weight: 600;
}

.view-toggle {
  display: flex;
  gap: 0.5rem;
}

.toggle-btn {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(100, 149, 237, 0.3);
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: rgba(51, 51, 51, 0.6);
}

.toggle-btn svg {
  width: 18px;
  height: 18px;
}

.toggle-btn:hover {
  border-color: rgba(100, 149, 237, 0.5);
  color: #6495ED;
}

.toggle-btn.active {
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  border-color: transparent;
  color: #fff;
}

/* 标签内容 */
.tab-content {
  padding: 1.5rem;
}

.tab-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.title-badge {
  font-size: 1.2rem;
}

.action-btn {
  background: linear-gradient(45deg, #6495ED, #87CEEB) !important;
  border: none !important;
  border-radius: 8px !important;
  padding: 0.75rem 1.5rem !important;
  font-weight: 500 !important;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3) !important;
}

.action-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(100, 149, 237, 0.4) !important;
}

.btn-icon {
  margin-right: 0.25rem;
  font-weight: 700;
}

/* 列表视图 */
.list-view {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  overflow: hidden;
}

/* 表格高度和滚动 */
:deep(.el-table) {
  max-height: 380px;
}

:deep(.el-table__body-wrapper) {
  overflow-y: auto;
  max-height: 330px;
}

.id-badge {
  background: rgba(100, 149, 237, 0.1);
  color: #6495ED;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
}

.type-tag {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.type-tag.type-personal {
  background: rgba(255, 152, 0, 0.1);
  color: #FF9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
}

.type-tag.type-sick {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.type-tag.type-annual {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.type-tag.type-wedding,
.type-tag.type-maternity {
  background: rgba(233, 30, 99, 0.1);
  color: #E91E63;
  border: 1px solid rgba(233, 30, 99, 0.3);
}

.type-tag.type-travel {
  background: rgba(33, 150, 243, 0.1);
  color: #2196F3;
  border: 1px solid rgba(33, 150, 243, 0.3);
}

.type-tag.type-office {
  background: rgba(156, 39, 176, 0.1);
  color: #9C27B0;
  border: 1px solid rgba(156, 39, 176, 0.3);
}

.type-tag.type-meal {
  background: rgba(255, 87, 34, 0.1);
  color: #FF5722;
  border: 1px solid rgba(255, 87, 34, 0.3);
}

.type-tag.type-transport {
  background: rgba(0, 150, 136, 0.1);
  color: #009688;
  border: 1px solid rgba(0, 150, 136, 0.3);
}

.type-tag.type-other,
.type-tag.type-default {
  background: rgba(158, 158, 158, 0.1);
  color: #9E9E9E;
  border: 1px solid rgba(158, 158, 158, 0.3);
}

.days-badge {
  background: rgba(100, 149, 237, 0.1);
  color: #6495ED;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
}

.amount-badge {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(139, 195, 74, 0.1));
  color: #4CAF50;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 600;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-tag.status-pending {
  background: rgba(255, 152, 0, 0.1);
  color: #FF9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
}

.status-tag.status-approved {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.status-tag.status-rejected {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.status-tag.status-cancelled {
  background: rgba(158, 158, 158, 0.1);
  color: #9E9E9E;
  border: 1px solid rgba(158, 158, 158, 0.3);
}

.status-tag.status-default {
  background: rgba(158, 158, 158, 0.1);
  color: #9E9E9E;
  border: 1px solid rgba(158, 158, 158, 0.3);
}

/* 下发管理状态样式 */
.status-tag.status-pending-blue {
  background: rgba(33, 150, 243, 0.1);
  color: #2196F3;
  border: 1px solid rgba(33, 150, 243, 0.3);
}

.status-tag.status-processed-green {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.action-group {
  display: flex;
  gap: 0.5rem;
}

.action-btn-small {
  background: linear-gradient(45deg, #6495ED, #87CEEB) !important;
  border: none !important;
}

.terminate-btn {
  background: linear-gradient(45deg, #f44336, #ff5722) !important;
  border: none !important;
}

.view-btn,
.cancel-btn {
  background: rgba(100, 149, 237, 0.1) !important;
  color: #6495ED !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.export-btn-small {
  background: linear-gradient(45deg, #4CAF50, #8BC34A) !important;
  border: none !important;
}

/* 卡片视图 */
.card-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.record-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(100, 149, 237, 0.2);
  border-radius: 12px;
  padding: 1.25rem;
  transition: all 0.3s ease;
}

.record-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(100, 149, 237, 0.15);
  border-color: rgba(100, 149, 237, 0.4);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(100, 149, 237, 0.1);
}

.card-id {
  font-size: 0.85rem;
  color: rgba(51, 51, 51, 0.5);
  font-weight: 500;
}

.card-status {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.card-status.status-pending {
  background: rgba(255, 152, 0, 0.1);
  color: #FF9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
}

.card-status.status-approved {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.card-status.status-rejected {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.card-status.status-cancelled {
  background: rgba(158, 158, 158, 0.1);
  color: #9E9E9E;
  border: 1px solid rgba(158, 158, 158, 0.3);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-label {
  font-size: 0.85rem;
  color: rgba(51, 51, 51, 0.6);
}

.card-value {
  font-size: 0.9rem;
  color: #333;
  font-weight: 500;
}

.card-value.highlight {
  color: #6495ED;
  font-weight: 600;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(100, 149, 237, 0.1);
}

.card-date {
  font-size: 0.8rem;
  color: rgba(51, 51, 51, 0.5);
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

/* 审批对话框 */
.approval-info {
  background: rgba(100, 149, 237, 0.05);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.info-row {
  display: flex;
  margin-bottom: 0.5rem;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  width: 80px;
  color: rgba(51, 51, 51, 0.6);
  font-size: 0.9rem;
}

.info-value {
  flex: 1;
  color: #333;
  font-weight: 500;
}

.radio-icon {
  margin-right: 0.25rem;
}

/* 详情对话框 */
.detail-content {
  padding: 0.5rem;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(100, 149, 237, 0.1);
}

.detail-id {
  font-size: 1rem;
  color: #6495ED;
  font-weight: 600;
}

.detail-status {
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-row {
  display: flex;
  padding: 0.75rem;
  background: rgba(100, 149, 237, 0.03);
  border-radius: 8px;
}

.detail-label {
  width: 100px;
  color: rgba(51, 51, 51, 0.6);
  font-size: 0.9rem;
}

.detail-value {
  flex: 1;
  color: #333;
  font-weight: 500;
}

.detail-footer {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(100, 149, 237, 0.1);
}

.comment-box {
  background: rgba(255, 152, 0, 0.05);
  border: 1px solid rgba(255, 152, 0, 0.2);
  border-radius: 8px;
  padding: 1rem;
}

.comment-label {
  color: #FF9800;
  font-weight: 600;
  margin-right: 0.5rem;
}

.comment-content {
  color: #333;
}

/* 处理过程对话框样式 */
.process-content {
  padding: 0.5rem;
}

.process-info {
  background: rgba(100, 149, 237, 0.05);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.process-info .info-row {
  display: flex;
  margin-bottom: 0.5rem;
}

.process-info .info-row:last-child {
  margin-bottom: 0;
}

.process-info .info-label {
  width: 100px;
  color: rgba(51, 51, 51, 0.6);
  font-size: 0.9rem;
  flex-shrink: 0;
}

.process-info .info-value {
  flex: 1;
  color: #333;
  font-weight: 500;
}

.process-form {
  margin-top: 1rem;
}

/* 下发人员样式 */
.distributed-users {
  display: flex;
  align-items: center;
}

.distributed-tag {
  background: linear-gradient(135deg, rgba(100, 149, 237, 0.1), rgba(135, 206, 235, 0.1));
  color: #6495ED;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid rgba(100, 149, 237, 0.3);
}

.no-distributed {
  color: #999;
  font-size: 0.9rem;
}

/* 下发说明和处理说明样式 */
.comment-text {
  color: #666;
  font-size: 0.9rem;
}

.process-comment-text {
  color: #4CAF50;
  font-size: 0.9rem;
  font-weight: 500;
}

.no-process {
  color: #999;
  font-size: 0.9rem;
}

/* 页脚 */
.footer {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(100, 149, 237, 0.2);
  padding: 1rem 2rem;
  text-align: center;
  color: rgba(51, 51, 51, 0.6);
  position: relative;
  z-index: 100;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 滚动条样式 */
.main-content::-webkit-scrollbar {
  width: 8px;
}

.main-content::-webkit-scrollbar-track {
  background: rgba(240, 248, 255, 0.6);
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb {
  background: rgba(100, 149, 237, 0.4);
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 149, 237, 0.6);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .card-view {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .search-box {
    width: 100%;
  }
  
  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .tabs-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .custom-tabs {
    width: 100%;
    overflow-x: auto;
  }
  
  .card-view {
    grid-template-columns: 1fr;
  }
}
</style>
