<template>
  <div class="project-application">
    <div class="main-container">
      <!-- 左侧表单区域 -->
      <div class="form-container">
        <el-card class="form-card">
          <template #header>
            <div class="card-header">
              <span class="title">协同申请</span>
              <el-button @click="goBack">返回</el-button>
            </div>
          </template>

          <el-alert
            type="info"
            :closable="false"
            show-icon
            style="margin-bottom: 16px;"
            title="协同说明"
            description="协同申请无需审批：可选择『意见征集』（相关人填写一条意见）或『通知』（相关人点击已知晓）。请填写发起方与协同对象，支持一对一、一对多、多对一。"
          />

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
                <el-form-item label="协同事项名称" prop="projectName">
                  <el-input
                    v-model="form.projectName"
                    placeholder="请输入协同事项名称"
                    maxlength="100"
                    show-word-limit
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="协作类型" prop="projectType">
                  <el-select v-model="form.projectType" placeholder="请选择协作类型" style="width: 100%">
                    <el-option label="跨部门协作" value="跨部门协作" />
                    <el-option label="联合支持" value="联合支持" />
                    <el-option label="资源协调" value="资源协调" />
                    <el-option label="其他" value="其他" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="优先级" prop="priority">
                  <el-select v-model="form.priority" placeholder="请选择优先级" style="width: 100%">
                    <el-option label="高" value="高"><el-tag type="danger">高</el-tag></el-option>
                    <el-option label="中" value="中"><el-tag type="warning">中</el-tag></el-option>
                    <el-option label="低" value="低"><el-tag type="info">低</el-tag></el-option>
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="协同模式" prop="collaborationMode">
                  <el-radio-group v-model="form.collaborationMode">
                    <el-radio-button value="opinion">意见征集</el-radio-button>
                    <el-radio-button value="notify">通知</el-radio-button>
                  </el-radio-group>
                </el-form-item>
              </el-col>
            </el-row>

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

            <el-form-item v-if="form.collaborationMode === 'notify'" label="截止确认时间" prop="expireAt">
              <el-date-picker
                v-model="form.expireAt"
                type="datetime"
                placeholder="（可选）超过此时间视为未确认"
                style="width: 100%"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>

            <!-- 发起方 -->
            <el-divider content-position="left">发起方</el-divider>
            <el-form-item label="主发起人" prop="primaryApplicant">
              <el-tag type="success" size="large">{{ currentUser?.name || '当前用户' }}</el-tag>
              <span class="hint">（当前登录人，自动作为主发起人）</span>
            </el-form-item>
            <el-form-item label="联合发起人">
              <el-select
                v-model="extraApplicantIds"
                multiple
                filterable
                remote
                :remote-method="searchEmployees"
                placeholder="可添加多人联合发起（多对一场景）"
                style="width: 100%"
                @change="syncExtraApplicants"
              >
                <el-option
                  v-for="emp in employeeOptions"
                  :key="emp.id"
                  :label="emp.name + ' (' + emp.department + ')'"
                  :value="emp.id"
                />
              </el-select>
              <div v-if="extraApplicants.length" class="chip-list">
                <el-tag
                  v-for="a in extraApplicants"
                  :key="a.id"
                  class="chip"
                  closable
                  @close="removeExtraApplicant(a.id)"
                >{{ a.name }}（{{ a.dept }}）</el-tag>
              </div>
            </el-form-item>

            <!-- 协同对象 -->
            <el-divider content-position="left">协同对象</el-divider>
            <el-form-item label="" label-width="0">
              <div class="collaborator-list">
                <div
                  v-for="(c, idx) in collaborators"
                  :key="idx"
                  class="collaborator-row"
                >
                  <el-select v-model="c.type" style="width: 110px" @change="onCollaboratorTypeChange(c)">
                    <el-option label="人员" value="user" />
                    <el-option label="部门" value="dept" />
                  </el-select>

                  <el-select
                    v-if="c.type === 'user'"
                    v-model="c.empId"
                    filterable
                    remote
                    :remote-method="searchEmployees"
                    placeholder="选择人员"
                    style="flex: 1"
                    @change="onCollaboratorUserChange(c)"
                  >
                    <el-option
                      v-for="emp in employeeOptions"
                      :key="emp.id"
                      :label="emp.name + ' (' + emp.department + ')'"
                      :value="emp.id"
                    />
                  </el-select>

                  <el-select
                    v-else
                    v-model="c.deptName"
                    filterable
                    allow-create
                    default-first-option
                    placeholder="选择或输入部门"
                    style="flex: 1"
                  >
                    <el-option
                      v-for="d in departmentOptions"
                      :key="d"
                      :label="d"
                      :value="d"
                    />
                  </el-select>

                  <el-input
                    v-model="c.role"
                    placeholder="配合职责/期望（可选）"
                    style="flex: 1"
                  />

                  <el-button
                    type="danger"
                    :icon="Delete"
                    circle
                    @click="removeCollaborator(idx)"
                  />
                </div>

                <div v-if="collaborators.length === 0" class="empty-hint">
                  尚未添加协同对象，点击下方按钮添加（一对多可添加多个）
                </div>

                <el-button type="primary" plain :icon="Plus" @click="addCollaborator">
                  添加协同对象
                </el-button>
              </div>
            </el-form-item>

            <!-- 协同详情 -->
            <el-divider content-position="left">协同详情</el-divider>

            <el-form-item label="协作说明" prop="description">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="4"
                placeholder="请详细描述协同事项的内容、背景与目标"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="期望产出" prop="objectives">
              <el-input
                v-model="form.objectives"
                type="textarea"
                :rows="3"
                placeholder="请描述协同事项的预期成果和交付物"
                maxlength="300"
                show-word-limit
              />
            </el-form-item>

            <!-- 提交按钮 -->
            <el-form-item>
              <el-button type="primary" @click="submitForm" :loading="submitting">
                提交申请
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </div>

      <!-- 右侧说明区域 -->
      <div class="scroll-container">
        <div class="scroll-content">
          <el-card class="info-card">
            <template #header><span>模式说明</span></template>
            <div v-if="form.collaborationMode === 'opinion'">
              <h4>💬 意见征集</h4>
              <p class="text-gray">相关人会收到通知并填写一条意见。您可在协同详情中随时查看汇集的意见，便于决策参考。</p>
            </div>
            <div v-else>
              <h4>🔔 通知</h4>
              <p class="text-gray">相关人会收到通知并点击「已知晓」。您可查看谁已确认、谁尚未确认，掌握通知触达结果。</p>
            </div>
          </el-card>

          <el-card class="tips-card">
            <template #header><span>关系类型提示</span></template>
            <ul class="tips-list">
              <li><b>一对一：</b>发起方 1 人 + 协同对象 1 人</li>
              <li><b>一对多：</b>发起方 1 人 + 协同对象多人 / 多部门</li>
              <li><b>多对一：</b>发起方多人（加联合发起人）+ 协同对象 1 人</li>
              <li>协同对象支持选择「人员」或「部门」，部门将展开为该部门全部成员。</li>
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
import { Plus, Delete } from '@element-plus/icons-vue';
import { createProjectApplication } from '@/services/workflow';
import { getEmployees } from '@/services/api';

const router = useRouter();
const formRef = ref();
const submitting = ref(false);
const employeeOptions = ref<any[]>([]);

// 当前登录用户（主发起人）
const currentUser = computed(() => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
});

// 部门选项：从员工列表去重
const departmentOptions = computed(() => {
  const set = new Set<string>();
  for (const emp of employeeOptions.value || []) {
    if (emp.department) set.add(emp.department);
  }
  return Array.from(set);
});

const form = reactive({
  projectName: '',
  projectType: '',
  priority: '中',
  collaborationMode: 'opinion',
  startDate: '',
  endDate: '',
  expireAt: '',
  description: '',
  objectives: ''
});

const rules = {
  projectName: [
    { required: true, message: '请输入协同事项名称', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符之间', trigger: 'blur' }
  ],
  projectType: [{ required: true, message: '请选择协作类型', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  collaborationMode: [{ required: true, message: '请选择协同模式', trigger: 'change' }],
  startDate: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  endDate: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
  description: [
    { required: true, message: '请输入协作说明', trigger: 'blur' },
    { min: 10, message: '说明至少10个字符', trigger: 'blur' }
  ]
};

// 联合发起人（额外发起方）
const extraApplicantIds = ref<(string | number)[]>([]);
const extraApplicants = ref<{ id: any; name: string; dept: string }[]>([]);

const syncExtraApplicants = () => {
  extraApplicants.value = extraApplicantIds.value
    .map((id) => employeeOptions.value.find((e) => String(e.id) === String(id)))
    .filter((e): e is any => !!e)
    .map((e) => ({ id: e.id, name: e.name, dept: e.department }));
};
const removeExtraApplicant = (id: any) => {
  extraApplicantIds.value = extraApplicantIds.value.filter((x) => String(x) !== String(id));
  syncExtraApplicants();
};

// 协同对象
const collaborators = ref<{
  type: 'user' | 'dept';
  empId: any;
  empName: string;
  empDept: string;
  deptName: string;
  role: string;
}[]>([]);

const addCollaborator = () => {
  collaborators.value.push({ type: 'user', empId: null, empName: '', empDept: '', deptName: '', role: '' });
};
const removeCollaborator = (idx: number) => {
  collaborators.value.splice(idx, 1);
};
const onCollaboratorUserChange = (c: any) => {
  const emp = employeeOptions.value.find((e) => String(e.id) === String(c.empId));
  if (emp) {
    c.empName = emp.name;
    c.empDept = emp.department;
  }
};
const onCollaboratorTypeChange = (c: any) => {
  // 切换类型时清空已选目标，避免类型错配
  c.empId = null;
  c.empName = '';
  c.empDept = '';
  c.deptName = '';
};

// 禁用结束日期
const disabledEndDate = (time: Date) => {
  if (!form.startDate) return false;
  return time.getTime() < new Date(form.startDate).getTime();
};

// 搜索员工（同时用于发起方与协同对象选择）
const searchEmployees = async (query: string) => {
  try {
    const response = await getEmployees();
    if (response.success) {
      let employees = response.data;
      if (query) {
        employees = employees.filter((emp: any) =>
          emp.name.includes(query) || (emp.department || '').includes(query)
        );
      }
      employeeOptions.value = employees;
    }
  } catch (error) {
    console.error('搜索员工失败:', error);
  }
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return;
    if (!currentUser.value?.id) {
      ElMessage.error('请先登录');
      return;
    }
    if (collaborators.value.length === 0) {
      ElMessage.error('请至少添加一个协同对象');
      return;
    }
    for (const c of collaborators.value) {
      if (c.type === 'user' && !c.empId) {
        ElMessage.error('存在未选择人员的协同对象，请补全');
        return;
      }
      if (c.type === 'dept' && !c.deptName) {
        ElMessage.error('存在未选择部门的协同对象，请补全');
        return;
      }
    }

    submitting.value = true;
    try {
      const submitData = {
        collaborationMode: form.collaborationMode,
        projectName: form.projectName,
        projectType: form.projectType,
        priority: form.priority,
        startDate: form.startDate,
        endDate: form.endDate,
        expireAt: form.expireAt || null,
        description: form.description,
        objectives: form.objectives,
        // 主发起人由后端按当前登录用户写入；此处仅传联合发起人
        applicants: extraApplicants.value.map((a) => ({ id: a.id, name: a.name, dept: a.dept })),
        collaborators: collaborators.value.map((c) =>
          c.type === 'user'
            ? { type: 'user', id: c.empId, name: c.empName, dept: c.empDept, role: c.role }
            : { type: 'dept', id: null, name: c.deptName, dept: c.deptName, role: c.role }
        )
      };

      const response = await createProjectApplication(submitData);
      if (response.success) {
        ElMessage.success('协同申请提交成功');
        router.replace('/oa-office?tab=project');
      } else {
        ElMessage.error(response.message || '提交失败');
      }
    } catch (error: any) {
      console.error('提交错误:', error);
      ElMessage.error(error.message || '提交失败');
    } finally {
      submitting.value = false;
    }
  });
};

const goBack = () => router.back();

// 初始化：加载员工列表
searchEmployees('');
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
.hint {
  margin-left: 10px;
  font-size: 12px;
  color: #909399;
}
.chip-list {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.collaborator-list {
  width: 100%;
}
.collaborator-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}
.empty-hint {
  color: #909399;
  font-size: 13px;
  margin-bottom: 10px;
}
.info-card {
  margin-bottom: 20px;
}
.info-card h4 {
  margin: 0 0 8px 0;
  font-size: 15px;
}
.text-gray {
  color: #909399;
  font-size: 13px;
  line-height: 1.7;
  margin: 0;
}
.tips-card .tips-list {
  margin: 0;
  padding-left: 20px;
}
.tips-card .tips-list li {
  margin: 8px 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}
</style>
