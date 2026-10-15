<template>
  <div class="project-application">
    <div class="main-container">
      <!-- 左侧表单区域 -->
      <div class="form-container">
        <el-card class="form-card">
          <template #header>
            <div class="card-header">
              <div class="title-wrap">
                <span class="title">协同申请</span>
                <el-popover placement="bottom" trigger="click" width="360">
                  <template #reference>
                    <el-button size="small" circle title="协同说明" class="title-help-btn">
                      <el-icon><InfoFilled /></el-icon>
                    </el-button>
                  </template>
                  <p><strong>协同对象角色</strong></p>
                  <ul style="margin: 6px 0; padding-left: 16px;">
                    <li><strong>参与人</strong>：需填写意见，并可在响应后追加协同对象</li>
                    <li><strong>抄送</strong>：仅需点击已知悉，回传发起人</li>
                  </ul>
                  <p>请填写发起方与协同对象，支持一对一、一对多、多对一。</p>
                </el-popover>
              </div>
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
                    <el-option label="信息共享" value="信息共享" />
                    <el-option label="任务督办" value="任务督办" />
                    <el-option label="方案评审" value="方案评审" />
                    <el-option label="流程优化" value="流程优化" />
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
                <el-form-item label="截止确认时间" prop="expireAt">
                  <el-date-picker
                    v-model="form.expireAt"
                    type="datetime"
                    placeholder="（可选）超过此时间视为未确认"
                    style="width: 100%"
                    value-format="YYYY-MM-DD HH:mm:ss"
                  />
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

            <!-- 发起方 -->
            <el-divider content-position="left">发起方</el-divider>
            <el-form-item label="主发起人" prop="primaryApplicant">
              <el-tag type="success" size="large">{{ currentUser?.name || '当前用户' }}</el-tag>
              <span class="hint">（当前登录人，自动作为主发起人）</span>
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
                    v-model="c.empIds"
                    multiple
                    filterable
                    placeholder="可选择多名人员"
                    style="flex: 1"
                    @change="onCollaboratorUsersChange(c)"
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
                    v-model="c.deptNames"
                    multiple
                    filterable
                    allow-create
                    default-first-option
                    placeholder="可选择多个部门"
                    style="flex: 1"
                  >
                    <el-option
                      v-for="d in departmentOptions"
                      :key="d"
                      :label="d"
                      :value="d"
                    />
                  </el-select>

                  <el-select v-model="c.collabRole" style="width: 110px" title="角色：参与人需响应（确认/意见），抄送仅知会">
                    <el-option label="参与人" value="participant" />
                    <el-option label="抄送" value="cc" />
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

            <el-form-item label="协同背景">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="4"
                placeholder="请描述本次协同的背景、目标与需要大家配合的事项"
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

            <el-form-item label="附件">
              <el-upload
                v-model:file-list="fileList"
                :auto-upload="false"
                :limit="5"
                multiple
                :on-exceed="onFileExceed"
              >
                <el-button type="primary" plain>选择文件</el-button>
                <template #tip>
                  <div class="el-upload__tip">支持上传相关证明材料，单个文件不超过 50MB，最多 5 个</div>
                </template>
              </el-upload>
            </el-form-item>

            <!-- 提交按钮 -->
            <el-form-item>
              <el-button type="primary" @click="submitForm" :loading="submitting">
                发起协同
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
                        <div>
              <h4>🤝 协同角色说明</h4>
              <p class="text-gray">参与人需填写意见（可随后追加协同对象）；抄送仅需点击「已知悉」。</p>
            </div>
          </el-card>

          <el-card class="tips-card">
            <template #header><span>关系类型提示</span></template>
            <ul class="tips-list">
              <li><b>一对一：</b>发起方 1 人 + 协同对象 1 人</li>
              <li><b>一对多：</b>发起方 1 人 + 协同对象多人 / 多部门</li>
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
import { Plus, Delete, InfoFilled } from '@element-plus/icons-vue';
import { createProjectApplication } from '@/services/workflow';
import { getEmployees, uploadAttachmentFiles } from '@/services/api';

const router = useRouter();
const formRef = ref();
const submitting = ref(false);
const employeeOptions = ref<any[]>([]);
const fileList = ref<any[]>([]);
const onFileExceed = () => {
  ElMessage.warning('最多只能上传5个附件');
};
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
  isCollaboration: true,
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

  startDate: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  endDate: [{ required: true, message: '请选择结束日期', trigger: 'change' }]
};

// 协同对象（每行支持多选：同职责下可选多人或多部门）
const collaborators = ref<{
  type: 'user' | 'dept';
  empIds: (string | number)[];
  empNames: string[];
  empDepts: string[];
  deptNames: string[];
  role: string;
  collabRole: 'participant' | 'cc';
}[]>([]);

const addCollaborator = () => {
  collaborators.value.push({ type: 'user', empIds: [], empNames: [], empDepts: [], deptNames: [], role: '', collabRole: 'participant' });
};
const removeCollaborator = (idx: number) => {
  collaborators.value.splice(idx, 1);
};
const onCollaboratorUsersChange = (c: any) => {
  c.empNames = [];
  c.empDepts = [];
  for (const id of c.empIds) {
    const emp = employeeOptions.value.find((e) => String(e.id) === String(id));
    if (emp) {
      c.empNames.push(emp.name);
      c.empDepts.push(emp.department);
    }
  }
};
const onCollaboratorTypeChange = (c: any) => {
  // 切换类型时清空已选目标，避免类型错配
  c.empIds = [];
  c.empNames = [];
  c.empDepts = [];
  c.deptNames = [];
};

// 禁用结束日期（允许与开始日期同一天，按本地日期比较避免时区差一天）
const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const disabledEndDate = (time: Date) => {
  if (!form.startDate) return false;
  const start = String(form.startDate).slice(0, 10);
  const end = toLocalDateStr(time);
  return end < start;
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
      if (c.type === 'user' && c.empIds.length === 0) {
        ElMessage.error('存在未选择人员的协同对象，请补全');
        return;
      }
      if (c.type === 'dept' && c.deptNames.length === 0) {
        ElMessage.error('存在未选择部门的协同对象，请补全');
        return;
      }
    }

    submitting.value = true;
    try {
      // 把每行多选展开为后端需要的单对象数组
      const flatCollaborators: any[] = []
      for (const c of collaborators.value) {
        if (c.type === 'user') {
          for (let i = 0; i < c.empIds.length; i++) {
            flatCollaborators.push({
              type: 'user',
              id: c.empIds[i],
              name: c.empNames[i] || '',
              dept: c.empDepts[i] || '',
              role: c.role,
              collabRole: c.collabRole || 'participant'
            })
          }
        } else {
          for (const deptName of c.deptNames) {
            flatCollaborators.push({
              type: 'dept',
              id: null,
              name: deptName,
              dept: deptName,
              role: c.role,
              collabRole: c.collabRole || 'participant'
            })
          }
        }
      }

      // 附件上传（复用统一 /api/upload 通道）
      let attachments: any = null
      if (fileList.value.length > 0) {
        const files = fileList.value.map((item: any) => item.raw).filter(Boolean) as File[]
        const uploadRes = await uploadAttachmentFiles(files, currentUser.value?.id)
        if (!uploadRes.success) {
          ElMessage.error(uploadRes.message || '附件上传失败')
          return
        }
        attachments = JSON.stringify(uploadRes.data || [])
      }

      const submitData = {
        isCollaboration: true,
        projectName: form.projectName,
        projectType: form.projectType,
        priority: form.priority,
        startDate: form.startDate,
        endDate: form.endDate,
        expireAt: form.expireAt || null,
        description: form.description,
        objectives: form.objectives,
        attachments,
        collaborators: flatCollaborators
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
  width: 100%;
  box-sizing: border-box;
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
.project-application .card-header .title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.project-application .card-header .title {
  font-size: 18px;
  font-weight: bold;
}
.project-application .title-help-btn {
  padding: 4px;
  height: auto;
}
.project-application .collab-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 16px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #606266;
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
