<template>
  <div class="project-application">
    <div class="main-container">
      <!-- 左侧表单区域 -->
      <div class="form-container">
        <el-card class="form-card">
          <template #header>
            <div class="card-header">
              <span class="title">项目申请</span>
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
                <el-form-item label="项目名称" prop="projectName">
                  <el-input
                    v-model="form.projectName"
                    placeholder="请输入项目名称"
                    maxlength="100"
                    show-word-limit
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="项目类型" prop="projectType">
                  <el-select v-model="form.projectType" placeholder="请选择项目类型" style="width: 100%">
                    <el-option label="研发项目" value="研发项目" />
                    <el-option label="市场项目" value="市场项目" />
                    <el-option label="运营项目" value="运营项目" />
                    <el-option label="基建项目" value="基建项目" />
                    <el-option label="其他项目" value="其他项目" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="优先级" prop="priority">
                  <el-select v-model="form.priority" placeholder="请选择优先级" style="width: 100%">
                    <el-option label="高" value="高">
                      <el-tag type="danger">高</el-tag>
                    </el-option>
                    <el-option label="中" value="中">
                      <el-tag type="warning">中</el-tag>
                    </el-option>
                    <el-option label="低" value="低">
                      <el-tag type="info">低</el-tag>
                    </el-option>
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="预算金额" prop="budget">
                  <el-input-number
                    v-model="form.budget"
                    :min="0"
                    :precision="2"
                    :step="1000"
                    style="width: 100%"
                    placeholder="请输入预算金额"
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

        <!-- 时间规划 -->
        <el-divider content-position="left">时间规划</el-divider>
        
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

        <!-- 项目详情 -->
        <el-divider content-position="left">项目详情</el-divider>
        
        <el-form-item label="项目描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="请详细描述项目内容、背景和目标"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="项目目标" prop="objectives">
          <el-input
            v-model="form.objectives"
            type="textarea"
            :rows="3"
            placeholder="请描述项目的预期成果和目标"
            maxlength="300"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="项目成员">
          <el-select
            v-model="form.teamMembers"
            multiple
            filterable
            remote
            :remote-method="searchEmployees"
            placeholder="请选择项目成员"
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

        <el-form-item label="所需资源" prop="resources">
          <el-input
            v-model="form.resources"
            type="textarea"
            :rows="2"
            placeholder="请描述项目所需的设备、场地等资源"
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
                  <h4>部门经理审批</h4>
                  <p class="text-gray">自动分配</p>
                </div>
              </el-timeline-item>

              <el-timeline-item 
                v-if="form.budget >= 100000" 
                type="warning" 
                :hollow="true"
              >
                <template #dot>
                  <el-icon><UserFilled /></el-icon>
                </template>
                <div class="timeline-content">
                  <h4>财务审核</h4>
                  <p class="text-gray">预算 ≥10万时触发</p>
                </div>
              </el-timeline-item>

              <el-timeline-item type="success" :hollow="true">
                <template #dot>
                  <el-icon><CircleCheck /></el-icon>
                </template>
                <div class="timeline-content">
                  <h4>总经理审批</h4>
                  <p class="text-gray">最终审批</p>
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
              <li>预算超过10万需财务审核</li>
            </ul>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, UserFilled, CircleCheck } from '@element-plus/icons-vue';
import { createProjectApplication } from '@/services/workflow';
import { getEmployees } from '@/services/api';

const router = useRouter();
const formRef = ref();
const submitting = ref(false);
const employeeOptions = ref([]);
const approverOptions = ref([]);

// 获取当前用户信息（从localStorage）
const currentUser = computed(() => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
});

// 当前选择的审批人信息
const selectedApprover = computed(() => {
  return approverOptions.value.find(emp => emp.id === form.approver) || null;
});

const form = reactive({
  projectName: '',
  projectType: '',
  priority: '高',
  budget: 0,
  startDate: '',
  endDate: '',
  description: '',
  objectives: '',
  teamMembers: [],
  resources: '',
  approver: ''
});

const rules = {
  projectName: [
      { required: true, message: '请输入项目名称', trigger: 'blur' },
      { min: 2, max: 100, message: '长度在 2 到 100 个字符之间', trigger: 'blur' }
    ],
  projectType: [
    { required: true, message: '请选择项目类型', trigger: 'change' }
  ],
  priority: [
    { required: true, message: '请选择优先级', trigger: 'change' }
  ],
  budget: [
    { required: true, message: '请输入预算金额', trigger: 'blur' },
    { type: 'number', min: 0, message: '预算不能为负数', trigger: 'blur' }
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
  description: [
    { required: true, message: '请输入项目描述', trigger: 'blur' },
    { min: 10, message: '描述至少10个字符', trigger: 'blur' }
  ],
  objectives: [
    { required: true, message: '请输入项目目标', trigger: 'blur' }
  ],
  resources: [
    { required: true, message: '请输入所需资源', trigger: 'blur' }
  ]
};

// 禁用结束日期
const disabledEndDate = (time: Date) => {
  if (!form.startDate) return false;
  return time.getTime() < new Date(form.startDate).getTime();
};

// 搜索员工
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

// 获取审批人选项（总经理、部门经理等管理角色）
const loadApprovers = async () => {
  try {
    const response = await getEmployees();
    if (response.success) {
      console.log('所有员工:', response.data);
      // 筛选出管理角色的员工（总经理、总监、经理等）
      const managers = response.data.filter((emp: any) => {
        const position = emp.position || '';
        return position.includes('总经理') || position.includes('总监') || position.includes('经理');
      });
      console.log('筛选后的审批人:', managers);
      approverOptions.value = managers;
      
      // 默认选择总经理
      const defaultManager = managers.find(emp => (emp.position || '').includes('总经理'));
      if (defaultManager) {
        form.approver = defaultManager.id;
        console.log('默认审批人:', defaultManager);
      }
    }
  } catch (error) {
    console.error('获取审批人失败:', error);
  }
};

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      if (!currentUser.value?.id) {
        ElMessage.error('请先登录');
        return;
      }

      console.log('currentUser:', currentUser.value);
      console.log('currentUser.id:', currentUser.value.id);
      
      // 获取员工信息
      try {
        const employeesResponse = await getEmployees();
        if (employeesResponse.success) {
          let employeeName = currentUser.value.username;
          // 处理 emp_姓名_时间戳 格式的用户名
          if (employeeName.startsWith('emp_')) {
            const parts = employeeName.split('_');
            if (parts.length >= 2) {
              employeeName = parts[1];
            }
          }
          
          const employee = employeesResponse.data.find((emp: any) => emp.name === employeeName);
          if (employee) {
            console.log('找到员工:', employee);
            console.log('submitting form data:', {
              ...form,
              applicantId: employee.id
            });
            ElMessage.info(`当前用户ID: ${currentUser.value.id}, 员工ID: ${employee.id}`);

            submitting.value = true;
            try {
              const response = await createProjectApplication({
                ...form,
                applicantId: employee.id,
                approverId: form.approver
              });

              if (response.success) {
                ElMessage.success('项目申请提交成功');
                router.push('/oa/project-apply/list');
              } else {
                ElMessage.error(response.message || '提交失败');
              }
            } catch (error: any) {
              ElMessage.error(error.message || '提交失败');
            } finally {
              submitting.value = false;
            }
          } else {
            ElMessage.error('未找到对应员工信息');
          }
        } else {
          ElMessage.error('获取员工信息失败');
        }
      } catch (error: any) {
        ElMessage.error('获取员工信息失败');
      }
    }
  });
};

// 重置表单
const resetForm = () => {
  formRef.value?.resetFields();
};

// 保存草稿
const saveDraft = () => {
    localStorage.setItem('projectDraft', JSON.stringify(form));
    ElMessage.success('草稿已保存');
  };

// 返回
const goBack = () => {
  router.back();
};

// 加载草稿
const loadDraft = () => {
  const draft = localStorage.getItem('projectDraft');
  if (draft) {
    Object.assign(form, JSON.parse(draft));
  }
};

// 初始化
loadDraft();
searchEmployees('');
loadApprovers();
</script>

<style scoped>
.project-application {
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

.project-application .form-card {
  margin-bottom: 20px;
}

.project-application .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-application .card-header .title {
  font-size: 18px;
  font-weight: bold;
}

.project-application .application-form .el-divider {
  margin: 30px 0 20px;
}

.project-application .process-preview .timeline-content h4 {
  margin: 0 0 5px 0;
  font-size: 14px;
}

.project-application .process-preview .timeline-content p {
  margin: 0;
  font-size: 12px;
}

.project-application .process-preview .timeline-content .text-gray {
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
</style>
