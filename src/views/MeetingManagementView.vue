<template>
  <div class="meeting-management-container">
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
          会议管理
        </h2>

        <!-- 会议申请表单 -->
        <div class="form-container">
          <el-form :model="form" label-width="100px">
            <el-form-item label="会议主题">
              <el-input v-model="form.meetingTitle" placeholder="请输入会议主题"></el-input>
            </el-form-item>
            
            <el-form-item label="会议时间">
              <el-date-picker
                v-model="form.meetingTime"
                type="datetime"
                placeholder="选择会议时间"
                style="width: 100%"
              ></el-date-picker>
            </el-form-item>
            
            <el-form-item label="会议地点">
              <el-input v-model="form.meetingLocation" placeholder="请输入会议地点"></el-input>
            </el-form-item>
            
            <el-form-item label="参会人员">
              <el-select v-model="form.attendees" multiple placeholder="请选择参会人员">
                <el-option label="张三" value="zhangsan"></el-option>
                <el-option label="李四" value="lisi"></el-option>
                <el-option label="王五" value="wangwu"></el-option>
                <el-option label="赵六" value="zhaoliu"></el-option>
              </el-select>
            </el-form-item>
            
            <el-form-item label="会议议程">
              <el-input
                v-model="form.agenda"
                type="textarea"
                :rows="4"
                placeholder="请输入会议议程"
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
                    支持上传会议相关文件
                  </div>
                </template>
              </el-upload>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="createMeeting">创建会议</el-button>
              <el-button @click="resetForm">重置</el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 会议记录 -->
        <div class="records-container">
          <h3 class="records-title">会议记录</h3>
          <el-table :data="meetingRecords" style="width: 100%">
            <el-table-column prop="id" label="会议ID" width="80"></el-table-column>
            <el-table-column prop="meetingTitle" label="会议主题"></el-table-column>
            <el-table-column prop="meetingTime" label="会议时间"></el-table-column>
            <el-table-column prop="meetingLocation" label="会议地点"></el-table-column>
            <el-table-column prop="attendees" label="参会人员"></el-table-column>
            <el-table-column prop="status" label="状态"></el-table-column>
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const form = ref({
  meetingTitle: '',
  meetingTime: '',
  meetingLocation: '',
  attendees: [],
  agenda: ''
})

const fileList = ref([])

const meetingRecords = ref([
  {
    id: 1,
    meetingTitle: '周会',
    meetingTime: '2024-01-15 10:00',
    meetingLocation: '会议室A',
    attendees: '张三, 李四, 王五',
    status: '已结束'
  },
  {
    id: 2,
    meetingTitle: '项目启动会',
    meetingTime: '2024-02-01 14:00',
    meetingLocation: '会议室B',
    attendees: '张三, 李四, 赵六',
    status: '未开始'
  }
])

const handleFileChange = (file) => {
  fileList.value.push(file)
}

const createMeeting = () => {
  // 模拟提交
  alert('会议创建成功')
  resetForm()
}

const resetForm = () => {
  form.value = {
    meetingTitle: '',
    meetingTime: '',
    meetingLocation: '',
    attendees: [],
    agenda: ''
  }
  fileList.value = []
}

const handleBack = () => {
  router.back()
}
</script>

<style scoped>
.meeting-management-container {
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
