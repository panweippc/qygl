<template>
  <div class="project-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">项目申请列表</span>
          <div class="header-buttons">
            <el-button @click="goBack">
              <el-icon><ArrowLeft /></el-icon>返回
            </el-button>
            <el-button type="primary" @click="goToApply">
              <el-icon><Plus /></el-icon>新建申请
            </el-button>
          </div>
        </div>
      </template>

      <!-- 筛选栏 -->
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 120px">
            <el-option label="待审批" value="pending" />
            <el-option label="已批准" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目类型">
          <el-select v-model="filterForm.projectType" placeholder="全部类型" clearable style="width: 140px">
            <el-option label="研发项目" value="研发项目" />
            <el-option label="市场项目" value="市场项目" />
            <el-option label="运营项目" value="运营项目" />
            <el-option label="基建项目" value="基建项目" />
            <el-option label="其他项目" value="其他项目" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleFilter">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据表格 -->
      <el-table :data="projectList" v-loading="loading" stripe>
        <el-table-column type="index" width="50" />
        <el-table-column prop="project_code" label="项目编号" width="140" />
        <el-table-column prop="project_name" label="项目名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="applicant_name" label="申请人" width="100" />
        <el-table-column prop="department" label="所属部门" width="120" />
        <el-table-column prop="project_type" label="项目类型" width="100" />
        <el-table-column prop="priority" label="优先级" width="80">
          <template #default="{ row }">
            <el-tag :type="getPriorityType(row.priority)">{{ row.priority }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="budget" label="预算金额" width="120">
          <template #default="{ row }">
            ¥{{ formatMoney(row.budget) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row)">查看</el-button>
            <el-button 
              v-if="row.status === 'pending' && canApprove(row)" 
              link 
              type="success" 
              @click="handleApprove(row)"
            >
              审批
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 审批对话框-->
    <el-dialog v-model="approveDialogVisible" title="审批处理" width="500px">
      <div class="approve-info">
        <p><strong>项目编号：</strong>{{ currentRow?.project_code }}</p>
        <p><strong>项目名称：</strong>{{ currentRow?.project_name }}</p>
        <p><strong>申请人：</strong>{{ currentRow?.applicant_name }}</p>
        <p><strong>预算金额：</strong>¥{{ formatMoney(currentRow?.budget) }}</p>
      </div>
      <el-form :model="approveForm" label-width="80px">
        <el-form-item label="审批意见">
          <el-radio-group v-model="approveForm.action">
            <el-radio-button label="agree">同意</el-radio-button>
            <el-radio-button label="reject">拒绝</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审批备注">
          <el-input
            v-model="approveForm.comment"
            type="textarea"
            :rows="3"
            placeholder="请输入审批备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitApprove" :loading="approving">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, ArrowLeft } from '@element-plus/icons-vue';
import { getProjectApplications, approveProject } from '@/services/workflow';

const router = useRouter();
const loading = ref(false);
const projectList = ref([]);
const approving = ref(false);
const approveDialogVisible = ref(false);
const currentRow = ref<any>(null);

const filterForm = reactive({
  status: '',
  projectType: ''
});

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
});

const approveForm = reactive({
  action: 'agree',
  comment: ''
});

// 获取当前用户
const currentUser = computed(() => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
});

// 判断是否为总经理/管理员
  const isManager = computed(() => {
    const user = currentUser.value;
    if (!user) return false;
    // 检查角色：总经理、管理员、CEO等可以查看所有申请
    const managerRoles = ['gm', 'admin', 'ceo', 'general_manager', 'manager'];
  return managerRoles.some(role => 
    user.roles?.includes(role) || 
    user.role?.toLowerCase().includes(role)
  );
});

// 获取优先级标签类型
  const getPriorityType = (priority: string) => {
    const map: Record<string, string> = {
      '高': 'danger',
      '中': 'warning',
      '低': 'info'
  };
  return map[priority] || 'info';
};

// 获取状态标签类型
const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    'pending': 'warning',
    'approved': 'success',
    'rejected': 'danger'
  };
  return map[status] || 'info';
};

// 获取状态文本
const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    'pending': '待审批',
    'approved': '已批准',
    'rejected': '已拒绝'
  };
  return map[status] || status;
};

// 格式化金额
  const formatMoney = (amount: number) => {
    if (!amount) return '0.00';
    return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

// 格式化日期
const formatDate = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

// 判断是否可以审批
const canApprove = (row: any) => {
  // 这里应该根据当前用户的角色和审批权限判断
  // 简化处理：当前用户是审批人时可以审批
  const currentApprovers = JSON.parse(row.current_approvers || '[]');
  return currentApprovers.includes(currentUser.value?.id);
};

// 加载数据
const loadData = async () => {
  loading.value = true;
  try {
    console.log('开始加载项目申请数据');
    console.log('当前用户:', currentUser.value);
    console.log('是否为管理员:', isManager.value);
    
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filterForm
    };
    
    // 如果不是总经理/管理员，只能看到自己的申请
    if (!isManager.value) {
      params.applicantId = currentUser.value?.id;
      console.log('添加申请人ID参数:', params.applicantId);
    }
    
    console.log('请求参数:', params);
    
    const response = await getProjectApplications(params);
    console.log('API响应:', response);
    
    if (response.success) {
      console.log('数据加载成功:', response.data);
      projectList.value = response.data.list || [];
      pagination.total = response.data.pagination?.total || 0;
    } else {
      console.error('API返回失败:', response.message);
      ElMessage.error(response.message || '加载数据失败');
    }
  } catch (error: any) {
    console.error('加载数据失败:', error);
    ElMessage.error(error.message || '加载数据失败');
  } finally {
    loading.value = false;
  }
};

// 筛选
const handleFilter = () => {
  pagination.page = 1;
  loadData();
};

// 重置筛选
const resetFilter = () => {
  filterForm.status = '';
  filterForm.projectType = '';
  handleFilter();
};

// 分页大小变化
const handleSizeChange = (size: number) => {
  pagination.pageSize = size;
  loadData();
};

// 页码变化
const handlePageChange = (page: number) => {
  pagination.page = page;
  loadData();
};

// 新建申请
const goToApply = () => {
  router.push('/oa/project-apply');
};

// 返回
const goBack = () => {
  router.back();
};

// 查看详情
const viewDetail = (row: any) => {
  router.push(`/oa/project-apply/detail/${row.id}`);
};

// 打开审批对话框
const handleApprove = (row: any) => {
  currentRow.value = row;
  approveForm.action = 'agree';
  approveForm.comment = '';
  approveDialogVisible.value = true;
};

// 提交审批
const submitApprove = async () => {
  if (!currentRow.value) return;
  
  approving.value = true;
  try {
    const response = await approveProject(currentRow.value.id, {
      action: approveForm.action,
      comment: approveForm.comment,
      approverId: currentUser.value?.id
    });
    
    if (response.success) {
      ElMessage.success('审批成功');
      approveDialogVisible.value = false;
      loadData();
    } else {
      ElMessage.error(response.message || '审批失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '审批失败');
  } finally {
    approving.value = false;
  }
};

// 初始化
onMounted(() => {
  loadData();
});
</script>

<style scoped>
.project-list {
  padding: 20px;
}

.project-list .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-list .header-buttons {
  display: flex;
  gap: 10px;
  align-items: center;
}

.project-list .card-header .title {
  font-size: 18px;
  font-weight: bold;
}

.project-list .filter-form {
  margin-bottom: 20px;
}

.project-list .pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.project-list .approve-info {
  margin-bottom: 20px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
}

.project-list .approve-info p {
  margin: 5px 0;
}
</style>
