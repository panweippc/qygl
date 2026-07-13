﻿﻿﻿﻿﻿<template>
  <div class="business-trip-application">
    <div class="main-container">
      <!-- 左侧表单区域 -->
      <div class="form-container">
        <el-card class="form-card">
          <template #header>
            <div class="card-header">
              <span class="title">出差申请</span>
              <el-button @click="goBack">返回</el-button>
            </div>
          </template>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-width="120px"
            class="application-form"
          >
            <!-- 基本信息 -->
            <el-divider content-position="left">基本信息</el-divider>
            
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="出差目的地" prop="destination">
                  <el-input
                    v-model="form.destination"
                    placeholder="请输入出差目的地"
                    maxlength="100"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="出差类型" prop="tripType">
                  <el-select v-model="form.tripType" placeholder="请选择出差类型" style="width: 100%">
                    <el-option label="国内出差" value="domestic" />
                    <el-option label="国外出差" value="international" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="是否紧急">
                  <el-switch
                    v-model="form.isUrgent"
                    active-text="紧急"
                    inactive-text="普通"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="预估费用" prop="estimatedCost">
                  <el-input-number
                    v-model="form.estimatedCost"
                    :min="0"
                    :precision="2"
                    :step="100"
                    style="width: 100%"
                    placeholder="请输入预估费用"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="审批人" prop="approver">
                  <el-select v-model="form.approver" placeholder="请选择审批人" style="width: 100%">
                    <el-option
                      v-for="emp in approverOptions"
                      :key="emp.id"
                      :label="emp.name + ' (' + emp.position + ')'"
                      :value="emp.id"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="审批角色">
                  <el-tag type="success" size="small">总经理</el-tag>
                </el-form-item>
              </el-col>
            </el-row>

        <!-- 时间信息 -->
        <el-divider content-position="left">时间信息</el-divider>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开始日期" prop="startDate">
              <el-date-picker
                v-model="form.startDate"
                type="date"
                placeholder="选择开始日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束日期" prop="endDate">
              <el-date-picker
                v-model="form.endDate"
                type="date"
                placeholder="选择结束日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
                :disabled-date="disabledEndDate"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="出差天数">
          <el-input v-model="tripDays" disabled style="width: 120px">
            <template #append>天</template>
          </el-input>
        </el-form-item>

        <!-- 出差目的 -->
        <el-divider content-position="left">出差详情</el-divider>
        
        <el-form-item label="出差目的" prop="purpose">
          <el-input
            v-model="form.purpose"
            type="textarea"
            :rows="3"
            placeholder="请详细描述出差目的和预期成果"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <!-- 行程安排 -->
        <el-form-item label="行程安排">
          <div class="itinerary-list">
            <div
              v-for="(item, index) in form.itinerary"
              :key="index"
              class="itinerary-item"
            >
              <el-row :gutter="10">
                <el-col :span="6">
                  <el-date-picker
                    v-model="item.date"
                    type="date"
                    placeholder="日期"
                    value-format="YYYY-MM-DD"
                    style="width: 100%"
                  />
                </el-col>
                <el-col :span="6">
                  <el-input v-model="item.location" placeholder="地点" />
                </el-col>
                <el-col :span="10">
                  <el-input v-model="item.activity" placeholder="活动安排" />
                </el-col>
                <el-col :span="2">
                  <el-button type="danger" circle @click="removeItinerary(index)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </el-col>
              </el-row>
            </div>
            <el-button type="primary" plain @click="addItinerary">
              <el-icon><Plus /></el-icon>添加行程
            </el-button>
          </div>
        </el-form-item>

        <!-- 费用明细 -->
        <el-divider content-position="left">费用明细</el-divider>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="交通费">
              <el-input-number
                v-model="form.costBreakdown.transport"
                :min="0"
                :precision="2"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="住宿费">
              <el-input-number
                v-model="form.costBreakdown.accommodation"
                :min="0"
                :precision="2"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="餐饮费">
              <el-input-number
                v-model="form.costBreakdown.meals"
                :min="0"
                :precision="2"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="其他费用">
              <el-input-number
                v-model="form.costBreakdown.other"
                :min="0"
                :precision="2"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="16">
            <el-form-item label="费用总计">
              <el-input v-model="totalCost" disabled style="width: 200px">
                <template #append>元</template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 其他信息 -->
        <el-divider content-position="left">其他信息</el-divider>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="住宿安排">
              <el-input v-model="form.accommodation" placeholder="请输入住宿安排" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="交通方式">
              <el-select v-model="form.transport" placeholder="请选择交通方式" style="width: 100%">
                <el-option label="飞机" value="飞机" />
                <el-option label="高铁" value="高铁" />
                <el-option label="火车" value="火车" />
                <el-option label="汽车" value="汽车" />
                <el-option label="自驾" value="自驾" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="同行人员">
          <el-select
            v-model="form.accompanyPersons"
            multiple
            filterable
            remote
            :remote-method="searchEmployees"
            placeholder="请选择同行人员"
            style="width: 100%"
          >
            <el-option
              v-for="emp in employeeOptions"
              :key="emp.id"
              :label="emp.name + ' (' + emp.department + ')'"
              :value="emp.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="客户信息">
          <el-input
            v-model="form.customerInfo"
            type="textarea"
            :rows="2"
            placeholder="请填写客户名称、联系人等信息"
          />
        </el-form-item>

        <!-- 提交按钮 -->
        <el-form-item>
          <el-button type="primary" @click="submitForm" :loading="submitting">
            提交申请
          </el-button>
          <el-button @click="resetForm">重置</el-button>
          <el-button @click="saveDraft">保存草稿</el-button>
        </el-form-item>
      </el-form>
    </el-card>
      </div>

      <!-- 右侧滚动区域 -->
      <div class="scroll-container">
        <div class="scroll-content">
          <el-card class="process-preview">
            <template #header>
              <span>审批流程预览</span>
            </template>
            <el-timeline>
              <el-timeline-item type="primary" :hollow="true">
                <template #dot>
                  <el-icon><User /></el-icon>
                </template>
                <div class="timeline-content">
                  <h4>提交申请</h4>
                  <p class="text-gray">{{ currentUser?.name || '当前用户' }}</p>
                </div>
              </el-timeline-item>
              
              <el-timeline-item type="warning" :hollow="true">
                <template #dot>
                  <el-icon><UserFilled /></el-icon>
                </template>
                <div class="timeline-content">
                  <h4>直接主管审批</h4>
                  <p class="text-gray">直属上级</p>
                </div>
              </el-timeline-item>

              <el-timeline-item type="warning" :hollow="true">
                <template #dot>
                  <el-icon><UserFilled /></el-icon>
                </template>
                <div class="timeline-content">
                  <h4>部门经理审批</h4>
                  <p class="text-gray">自动分配</p>
                </div>
              </el-timeline-item>

              <el-timeline-item 
                v-if="form.tripType === 'international'" 
                type="warning" 
                :hollow="true"
              >
                <template #dot>
                  <el-icon><UserFilled /></el-icon>
                </template>
                <div class="timeline-content">
                  <h4>外事审批</h4>
                  <p class="text-gray">国外出差需HR审批</p>
                </div>
              </el-timeline-item>

              <el-timeline-item 
                v-if="form.estimatedCost >= 5000" 
                type="warning" 
                :hollow="true"
              >
                <template #dot>
                  <el-icon><UserFilled /></el-icon>
                </template>
                <div class="timeline-content">
                  <h4>财务审核</h4>
                  <p class="text-gray">费用 > 5000时触发</p>
                </div>
              </el-timeline-item>

              <el-timeline-item type="success" :hollow="true">
                <template #dot>
                  <el-icon><CircleCheck /></el-icon>
                </template>
                <div class="timeline-content">
                  <h4>审批完成</h4>
                  <p class="text-gray">出差批准</p>
                </div>
              </el-timeline-item>
            </el-timeline>
          </el-card>

          <el-card class="info-card">
            <template #header>
              <span>审批人信息</span>
            </template>
            <div v-if="selectedApprover" class="approver-info">
              <el-avatar :size="60" class="approver-avatar">
                {{ selectedApprover.name?.charAt(0) || '?' }}
              </el-avatar>
              <div class="approver-details">
                <h4>{{ selectedApprover.name }}</h4>
                <p>职位: {{ selectedApprover.position }}</p>
                <p>部门: {{ selectedApprover.department }}</p>
              </div>
            </div>
            <div v-else class="empty-state">
              <el-icon size="48" class="empty-icon"><UserFilled /></el-icon>
              <p>请选择审批人</p>
            </div>
          </el-card>

          <el-card class="tips-card">
            <template #header>
              <span>温馨提示</span>
            </template>
            <ul class="tips-list">
              <li>审批人默认为总经理角色</li>
              <li>提交后将发送通知给审批人</li>
              <li>审批进度可在个人中心查看</li>
              <li>审批完成后结果将下发到您手中</li>
            </ul>
          </el-card>
        </div>
      </div>
    </div>

    <!-- 我的出差申请列表 -->
    <el-card class="my-list-card">
      <template #header>
        <div class="card-header">
          <span class="title">我的出差申请</span>
          <el-button type="primary" @click="refreshList" :loading="listLoading" size="small">
            <el-icon><Refresh /></el-icon>刷新
          </el-button>
        </div>
      </template>
      <el-table :data="myTripList" v-loading="listLoading" stripe empty-text="暂无出差申请记录">
        <el-table-column type="index" width="50" />
        <el-table-column prop="trip_code" label="出差编号" width="140" />
        <el-table-column prop="destination" label="目的地" min-width="120" show-overflow-tooltip />
        <el-table-column prop="trip_type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.trip_type === 'international' ? 'warning' : 'info'">
              {{ row.trip_type === 'international' ? '国外' : '国内' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="days" label="天数" width="80">
          <template #default="{ row }">{{ row.days }}天</template>
        </el-table-column>
        <el-table-column prop="estimated_cost" label="预估费用" width="120">
          <template #default="{ row }">¥{{ formatMoney(row.estimated_cost) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="提交时间" width="110">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
      </el-table>
      <div class="pagination" v-if="myTripList.length > 0">
        <el-pagination
          v-model:current-page="listPagination.page"
          :page-size="listPagination.pageSize"
          :total="listPagination.total"
          layout="total, prev, pager, next"
          small
          @current-change="handleListPageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, UserFilled, CircleCheck, Plus, Delete, Refresh } from '@element-plus/icons-vue';
import { createBusinessTrip, getBusinessTrips } from '@/services/workflow';
import { getEmployees } from '@/services/api';

const router = useRouter();
const formRef = ref();
const submitting = ref(false);
const employeeOptions = ref([]);
const approverOptions = ref([]);

const currentUser = computed(() => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
});

const selectedApprover = computed(() => {
  return approverOptions.value.find(emp => emp.id === form.approver) || null;
});

const form = reactive({
  destination: '',
  tripType: 'domestic',
  isUrgent: false,
  estimatedCost: 0,
  startDate: '',
  endDate: '',
  purpose: '',
  itinerary: [] as any[],
  costBreakdown: {
    transport: 0,
    accommodation: 0,
    meals: 0,
    other: 0
  },
  accommodation: '',
  transport: '',
  accompanyPersons: [],
  customerInfo: '',
  approver: ''
});

const rules = {
  destination: [
    { required: true, message: '请输入出差目的地', trigger: 'blur' }
  ],
  tripType: [
    { required: true, message: '请选择出差类型', trigger: 'change' }
  ],
  estimatedCost: [
      { required: true, message: '请输入预估费用', trigger: 'blur' },
      { type: 'number', min: 0, message: '费用不能为负数', trigger: 'blur' }
    ],
  approver: [
    { required: true, message: '请选择审批人', trigger: 'change' }
  ],
  startDate: [
    { required: true, message: '请选择开始日期', trigger: 'change' }
  ],
  endDate: [
    { required: true, message: '请选择结束日期', trigger: 'change' }
  ],
  purpose: [
    { required: true, message: '请输入出差目的', trigger: 'blur' }
  ]
};

const tripDays = computed(() => {
  if (!form.startDate || !form.endDate) return 0;
  const start = new Date(form.startDate);
  const end = new Date(form.endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return days > 0 ? days : 0;
});

const totalCost = computed(() => {
  const { transport, accommodation, meals, other } = form.costBreakdown;
  return (transport || 0) + (accommodation || 0) + (meals || 0) + (other || 0);
});

const disabledEndDate = (time: Date) => {
  if (!form.startDate) return false;
  return time.getTime() < new Date(form.startDate).getTime();
};

const addItinerary = () => {
  form.itinerary.push({
    date: '',
    location: '',
    activity: ''
  });
};

const removeItinerary = (index: number) => {
  form.itinerary.splice(index, 1);
};

const searchEmployees = async (query: string) => {
  try {
    const response = await getEmployees();
    if (response.success) {
      let employees = response.data;
      if (query) {
        employees = employees.filter((emp: any) =>
          emp.name.includes(query) || emp.department.includes(query)
        );
      }
      employeeOptions.value = employees;
    }
  } catch (error) {
    console.error('搜索员工失败:', error);
  }
};

const loadApprovers = async () => {
  try {
    const response = await getEmployees();
    if (response.success) {
      const managers = response.data.filter((emp: any) => {
        const position = emp.position || '';
        return position.includes('总经理') || position.includes('总监') || position.includes('经理');
      });
      approverOptions.value = managers;
      
      const defaultManager = managers.find(emp => (emp.position || '').includes('总经理'));
      if (defaultManager) {
        form.approver = defaultManager.id;
      }
    }
  } catch (error) {
    console.error('获取审批人失败:', error);
  }
};

const myTripList = ref<any[]>([]);
const listLoading = ref(false);
const listPagination = reactive({ page: 1, pageSize: 10, total: 0 });

const loadMyTrips = async () => {
  try {
    listLoading.value = true;
    const params: any = { page: listPagination.page, pageSize: listPagination.pageSize };
    if (currentUser.value?.name) {
      params.applicant = currentUser.value.name;
    }
    const response = await getBusinessTrips(params);
    if (response.success) {
      myTripList.value = response.data.list || [];
      listPagination.total = response.data.pagination?.total || 0;
    }
  } catch (error) {
    console.error('获取出差申请列表失败:', error);
  } finally {
    listLoading.value = false;
  }
};

const refreshList = () => loadMyTrips();

const handleListPageChange = (page: number) => {
  listPagination.page = page;
  loadMyTrips();
};

const getStatusType = (status: string) => {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  return 'warning';
};

const getStatusText = (status: string) => {
  if (status === 'approved') return '已批准';
  if (status === 'rejected') return '已拒绝';
  return '待审批';
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
};

const formatMoney = (val: any) => {
  const num = parseFloat(val);
  if (isNaN(num)) return '0.00';
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const submitForm = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      if (!currentUser.value?.id) {
        ElMessage.error('请先登录');
        return;
      }

      submitting.value = true;
      try {
        const submitData = {
          ...form,
          applicantId: currentUser.value.id,
          applicantName: currentUser.value.name,
          approverId: form.approver
        };

        const response = await createBusinessTrip(submitData);

        if (response.success) {
          ElMessage.success('出差申请提交成功');
          resetForm();
          loadMyTrips();
        } else {
          ElMessage.error(response.message || '提交失败');
        }
      } catch (error: any) {
        console.error('提交错误:', error);
        ElMessage.error(error.message || '提交失败');
      } finally {
        submitting.value = false;
      }
    }
  });
};

const resetForm = () => {
  formRef.value?.resetFields();
  form.itinerary = [];
  form.costBreakdown = { transport: 0, accommodation: 0, meals: 0, other: 0 };
};

const saveDraft = () => {
    localStorage.setItem('businessTripDraft', JSON.stringify(form));
    ElMessage.success('草稿已保存');
  };

const goBack = () => {
  router.back();
};

const loadDraft = () => {
  const draft = localStorage.getItem('businessTripDraft');
  if (draft) {
    const draftData = JSON.parse(draft);
    Object.assign(form, draftData);
  }
};

loadDraft();
searchEmployees('');
loadApprovers();
loadMyTrips();
</script>

<style scoped>
.business-trip-application {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.main-container {
  display: flex;
  gap: 20px;
}

.form-container {
  flex: 1;
}

.scroll-container {
  width: 360px;
  flex-shrink: 0;
}

.scroll-content {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
  scrollbar-width: thin;
  scrollbar-color: #d9d9d9 #f5f5f5;
}

.scroll-content::-webkit-scrollbar {
  width: 6px;
}

.scroll-content::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 3px;
}

.scroll-content::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.scroll-content::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}

.business-trip-application .form-card {
  margin-bottom: 20px;
}

.business-trip-application .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.business-trip-application .card-header .title {
  font-size: 18px;
  font-weight: bold;
}

.business-trip-application .application-form .el-divider {
  margin: 30px 0 20px;
}

.business-trip-application .itinerary-list .itinerary-item {
  margin-bottom: 10px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
}

.business-trip-application .process-preview .timeline-content h4 {
  margin: 0 0 5px 0;
  font-size: 14px;
}

.business-trip-application .process-preview .timeline-content p {
  margin: 0;
  font-size: 12px;
}

.business-trip-application .process-preview .timeline-content .text-gray {
  color: #909399;
}

.info-card {
  margin-top: 20px;
}

.approver-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 0;
}

.approver-avatar {
  flex-shrink: 0;
}

.approver-details h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: bold;
}

.approver-details p {
  margin: 4px 0;
  font-size: 13px;
  color: #606266;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #909399;
}

.empty-icon {
  margin-bottom: 10px;
  opacity: 0.5;
}

.tips-card {
  margin-top: 20px;
}

.tips-list {
  margin: 0;
  padding-left: 20px;
}

.tips-list li {
  margin: 8px 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

.my-list-card {
  margin-top: 20px;
}

.my-list-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.my-list-card .card-header .title {
  font-size: 16px;
  font-weight: bold;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
