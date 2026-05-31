<template>
  <div class="reimbursement-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友软件</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/" class="nav-item">首页</router-link>
        <router-link to="/oa-office" class="nav-item">OA办公</router-link>
        <button class="nav-item logout-btn" @click="handleBack">返回</button>
      </nav>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <div class="content-wrapper">
        <h2 class="section-title">
          <span class="title-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM11 17H7V10H11V17ZM17 17H13V7H17V17Z"/>
            </svg>
          </span>
          报销管理
        </h2>

        <!-- 报销申请表单 - 仅非管理员可见-->
        <div v-if="!isAdmin" class="form-container">
          <el-form :model="form" label-width="100px">
            <el-form-item label="报销类型">
              <el-select v-model="form.reimburseType" placeholder="请选择报销类型">
                <el-option label="差旅费" value="travel"></el-option>
                <el-option label="办公用品" value="office"></el-option>
                <el-option label="餐饮费" value="food"></el-option>
                <el-option label="交通费" value="traffic"></el-option>
                <el-option label="其他" value="other"></el-option>
              </el-select>
            </el-form-item>
            
            <el-form-item label="报销金额">
              <el-input v-model="form.amount" type="number" placeholder="请输入报销金额"></el-input>
            </el-form-item>
            
            <el-form-item label="报销日期">
              <el-date-picker
                v-model="form.reimburseDate"
                type="date"
                placeholder="选择报销日期"
                style="width: 100%"
              ></el-date-picker>
            </el-form-item>
            
            <el-form-item label="报销事由">
              <el-input
                v-model="form.reason"
                type="textarea"
                :rows="4"
                placeholder="请输入报销事由"
              ></el-input>
            </el-form-item>
            
            <el-form-item label="附件">
              <el-upload
                class="upload-demo"
                action="#"
                :auto-upload="false"
                :on-change="handleFileChange"
                :file-list="fileList"
              >
                <el-button type="primary">选择文件</el-button>
                <template #tip>
                  <div class="el-upload__tip">
                    支持上传发票、收据等证明文件
                  </div>
                </template>
              </el-upload>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="submitReimbursement">提交报销</el-button>
              <el-button @click="resetForm">重置</el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 报销记录 -->
        <div class="records-container">
          <h3 class="records-title">{{ isAdmin ? '所有报销记录' : '我的报销记录' }}</h3>
          <el-table :data="filteredReimburseRecords" style="width: 100%">
            <el-table-column prop="id" label="报销ID" width="80"></el-table-column>
            <el-table-column v-if="isAdmin" prop="applicant" label="申请人"></el-table-column>
            <el-table-column prop="reimburseType" label="报销类型"></el-table-column>
            <el-table-column prop="amount" label="金额" width="120"></el-table-column>
            <el-table-column prop="reimburseDate" label="报销日期"></el-table-column>
            <el-table-column prop="status" label="状态"></el-table-column>
            <el-table-column prop="submitDate" label="提交日期"></el-table-column>
            <el-table-column v-if="isAdmin" label="操作" width="120">
              <template #default="{ row }">
                <el-button size="small" @click="approveReimbursement(row)" class="approve-btn">
                  审批
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <p>© 2026 企业管理系统 | 科技赋能未来</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const form = ref({
  reimburseType: '',
  amount: '',
  reimburseDate: '',
  reason: ''
})

const fileList = ref([])

const reimburseRecords = ref([
  {
      id: 1,
      reimburseType: '差旅费',
    amount: 1200,
    reimburseDate: '2024-01-15',
    status: '已批准',
    submitDate: '2024-01-20',
    applicant: '张三'
  },
  {
    id: 2,
    reimburseType: '办公用品',
    amount: 500,
    reimburseDate: '2024-02-01',
    status: '审批中',
    submitDate: '2024-02-03',
    applicant: '李四'
  }
])

// 计算用户角色
const isAdmin = computed(() => {
  // 从localStorage获取用户角色信息
  const role = localStorage.getItem('role')
  // 实际项目中应该根据登录API返回的角色信息判�?  return role === 'admin'
})

// 计算用户是否是财务总监
const isFinanceDirector = computed(() => {
  // 从localStorage获取用户角色信息
  const role = localStorage.getItem('role')
  // 实际项目中应该根据登录API返回的角色信息判断
  return role === 'finance_director'
})

// 计算用户是否需要默认审批人（非管理员且非财务总监）
const needDefaultApprover = computed(() => {        
  return !isAdmin.value && !isFinanceDirector.value
})

// 当前用户
const currentUsername = computed(() => {
  return localStorage.getItem('username') || '当前用户'
})

// 过滤后的报销记录（非管理员只能看到自己的）
const filteredReimburseRecords = computed(() => {
  if (isAdmin.value) {
    return reimburseRecords.value
  } else {
    return reimburseRecords.value.filter(item => item.applicant === currentUsername.value)
  }
})

const handleFileChange = (file) => {
  fileList.value.push(file)
}

const submitReimbursement = () => {
  // 模拟提交
  if (needDefaultApprover.value) {
    // 非管理员和非财务总监用户，默认审批人是总经理
    alert('报销申请已提交，审批人：总经理')
  } else {
    // 管理员和财务总监用户，需要选择审批人
    alert('报销申请已提交，等待审批')
  }
  resetForm()
}

const resetForm = () => {
  form.value = {
    reimburseType: '',
    amount: '',
    reimburseDate: '',
    reason: ''
  }
  fileList.value = []
}

const handleBack = () => {
  router.back()
}

// 审批报销
const approveReimbursement = (row) => {
  // 模拟审批
  alert(`审批报销申请 ID: ${row.id}`)
}
</script>

<style scoped>
.reimbursement-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: #E4EDF2;
}

/* 顶部导航 */
.header {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(100, 149, 237, 0.3);
  padding: 0 2rem;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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

.nav-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(100, 149, 237, 0.2), transparent);
  transition: left 0.3s ease;
}

.nav-item:hover::before,
.nav-item.active::before {
  left: 100%;
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
  position: relative;
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
}

.logout-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(244, 67, 54, 0.2), transparent);
  transition: left 0.3s ease;
}

.logout-btn:hover::before {
  left: 100%;
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
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* 标题 */
.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.title-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3);
}

.title-icon svg {
  width: 18px;
  height: 18px;
}

/* 表单容器 */
.form-container {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 12px;
  padding: 2rem;
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.form-container::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, #6495ED, #87CEEB, #6495ED);
  border-radius: 14px;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s ease;
  animation: borderGlow 3s linear infinite;
  background-size: 200% 200%;
}

.form-container:hover::before {
  opacity: 1;
}

/* 记录容器 */
.records-container {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 12px;
  padding: 2rem;
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.records-container::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, #6495ED, #87CEEB, #6495ED);
  border-radius: 14px;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s ease;
  animation: borderGlow 3s linear infinite;
  background-size: 200% 200%;
}

.records-container:hover::before {
  opacity: 1;
}

.records-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #6495ED;
  margin: 0 0 1.5rem 0;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

/* 页脚 */
.footer {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(100, 149, 237, 0.3);
  padding: 1rem 2rem;
  text-align: center;
  color: rgba(51, 51, 51, 0.6);
  position: relative;
  z-index: 100;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 滚动条样�?*/
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

/* 动画 */
@keyframes borderGlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>
