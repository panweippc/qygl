<template>
  <div class="business-trip-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">出差申请列表</span>
          <div>
            <el-button type="primary" @click="goToApply">
              <el-icon><Plus /></el-icon>新建申请
            </el-button>
            <el-button @click="goBack">
              <el-icon><ArrowLeft /></el-icon>返回
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
        <el-form-item label="出差类型">
          <el-select v-model="filterForm.tripType" placeholder="全部类型" clearable style="width: 120px">
            <el-option label="国内出差" value="domestic" />
            <el-option label="国外出差" value="international" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleFilter">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据表格 -->
      <el-table :data="tripList" v-loading="loading" stripe>
        <el-table-column type="index" width="50" />
        <el-table-column prop="trip_code" label="出差编号" width="140" />
        <el-table-column prop="destination" label="目的地" min-width="150" show-overflow-tooltip />
        <el-table-column prop="applicant_name" label="申请人" width="100" />
        <el-table-column prop="department" label="所属部门" width="120" />
        <el-table-column prop="trip_type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.trip_type === 'international' ? 'warning' : 'info'">
              {{ row.trip_type === 'international' ? '国外' : '国内' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="days" label="天数" width="80">
          <template #default="{ row }">
            {{ row.days }}天
          </template>
        </el-table-column>
        <el-table-column prop="estimated_cost" label="预估费用" width="120">
          <template #default="{ row }">
            ¥{{ formatMoney(row.estimated_cost) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="start_date" label="开始日期" width="110">
          <template #default="{ row }">
            {{ formatDate(row.start_date) }}
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
        <p><strong>出差编号：</strong>{{ currentRow?.trip_code }}</p>
        <p><strong>目的地：</strong>{{ currentRow?.destination }}</p>
        <p><strong>申请人：</strong>{{ currentRow?.applicant_name }}</p>
        <p><strong>出差天数：</strong>{{ currentRow?.days }}天</p>
        <p><strong>预估费用：</strong>¥{{ formatMoney(currentRow?.estimated_cost) }}</p>
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

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="出差申请详情" width="700px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="出差编号">{{ detailData.trip_code }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ detailData.applicant_name }}</el-descriptions-item>
        <el-descriptions-item label="所属部门">{{ detailData.department }}</el-descriptions-item>
        <el-descriptions-item label="出差类型">
          <el-tag :type="detailData.trip_type === 'international' ? 'warning' : 'info'">
            {{ detailData.trip_type === 'international' ? '国外出差' : '国内出差' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="目的地">{{ detailData.destination }}</el-descriptions-item>
        <el-descriptions-item label="出差天数">{{ detailData.days }}天</el-descriptions-item>
        <el-descriptions-item label="开始日期">{{ detailData.start_date }}</el-descriptions-item>
        <el-descriptions-item label="结束日期">{{ detailData.end_date }}</el-descriptions-item>
        <el-descriptions-item label="预估费用">¥{{ formatMoney(detailData.estimated_cost) }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(detailData.status)">{{ getStatusText(detailData.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="是否紧急">
          <el-tag v-if="detailData.is_urgent" type="danger">紧急</el-tag>
          <span v-else>普通</span>
        </el-descriptions-item>
        <el-descriptions-item label="住宿安排">{{ detailData.accommodation || '-' }}</el-descriptions-item>
        <el-descriptions-item label="交通方式">{{ detailData.transport || '-' }}</el-descriptions-item>
        <el-descriptions-item label="同行人员">
          <span v-if="detailData.accompany_persons && detailData.accompany_persons.length > 0">
            {{ detailData.accompany_persons.join('、') }}
          </span>
          <span v-else>-</span>
        </el-descriptions-item>
      </el-descriptions>
      
      <div style="margin-top: 20px;">
        <h4>出差目的</h4>
        <p style="background: #f5f7fa; padding: 10px; border-radius: 4px;">{{ detailData.purpose }}</p>
      </div>
      
      <div v-if="detailData.itinerary && detailData.itinerary.length > 0" style="margin-top: 20px;">
        <h4>行程安排</h4>
        <el-table :data="detailData.itinerary" border size="small">
          <el-table-column prop="date" label="日期" width="120" />
          <el-table-column prop="location" label="地点" />
          <el-table-column prop="activity" label="活动安排" />
        </el-table>
      </div>
      
      <div style="margin-top: 20px;">
        <h4>费用明细</h4>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="交通费">¥{{ formatMoney(detailData.cost_breakdown?.transport) }}</el-descriptions-item>
          <el-descriptions-item label="住宿费">¥{{ formatMoney(detailData.cost_breakdown?.accommodation) }}</el-descriptions-item>
          <el-descriptions-item label="餐饮费">¥{{ formatMoney(detailData.cost_breakdown?.meals) }}</el-descriptions-item>
          <el-descriptions-item label="其他费用">¥{{ formatMoney(detailData.cost_breakdown?.other) }}</el-descriptions-item>
        </el-descriptions>
      </div>
      
      <div v-if="detailData.customer_info" style="margin-top: 20px;">
        <h4>客户信息</h4>
        <p style="background: #f5f7fa; padding: 10px; border-radius: 4px;">{{ detailData.customer_info }}</p>
      </div>
      
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus, ArrowLeft } from '@element-plus/icons-vue';
import { getBusinessTrips, approveBusinessTrip } from '@/services/workflow';
import api from '@/services/api';

const router = useRouter();
const loading = ref(false);
const tripList = ref([]);
const approving = ref(false);
const approveDialogVisible = ref(false);
const currentRow = ref<any>(null);

const filterForm = reactive({
  status: '',
  tripType: ''
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
  return new Date(date).toLocaleDateString('zh-CN');
};

// 判断是否可以审批
const canApprove = (row: any) => {
  const currentApprovers = JSON.parse(row.current_approvers || '[]');
  return currentApprovers.includes(currentUser.value?.id);
};

// 加载数据
const loadData = async () => {
  loading.value = true;
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filterForm
    };
    
    // 如果不是总经理/管理员，只能看到自己的申请
    if (!isManager.value) {
      params.applicantId = currentUser.value?.id;
    }
    
    const response = await getBusinessTrips(params);
    if (response.success) {
      tripList.value = response.data.list;
      pagination.total = response.data.pagination.total;
    }
  } catch (error) {
    console.error('加载数据失败:', error);
    ElMessage.error('加载数据失败');
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
  filterForm.tripType = '';
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
  router.push('/oa/business-trip');
};

// 返回
const goBack = () => {
  router.back();
};

// 查看详情
const detailDialogVisible = ref(false);
const detailData = ref<any>({});

const viewDetail = async (row: any) => {
  try {
    const response = await api.get(`/business-trips/${row.id}`);
    if (response.data.success) {
      detailData.value = response.data.data;
      detailDialogVisible.value = true;
    } else {
      ElMessage.error(response.data.message || '获取详情失败');
    }
  } catch (error: any) {
    console.error('获取详情失败:', error);
    ElMessage.error(error.message || '获取详情失败');
  }
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
    const response = await approveBusinessTrip(currentRow.value.id, {
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
.business-trip-list {
  padding: 20px;
}

.business-trip-list .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.business-trip-list .card-header .title {
  font-size: 18px;
  font-weight: bold;
}

.business-trip-list .filter-form {
  margin-bottom: 20px;
}

.business-trip-list .pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.business-trip-list .approve-info {
  margin-bottom: 20px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
}

.business-trip-list .approve-info p {
  margin: 5px 0;
}
</style>
