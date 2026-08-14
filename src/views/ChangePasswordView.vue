<template>
  <div class="change-password-page">
    <div class="page-card">
      <h2>修改密码</h2>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" style="max-width: 420px; margin-top: 20px;">
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input v-model="form.oldPassword" type="password" show-password placeholder="请输入旧密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="form.newPassword" type="password" show-password placeholder="至少10位，含大小写字母、数字和特殊字符" />
          <template #error></template>
        </el-form-item>
        <div v-if="form.newPassword" class="pwd-strength-block">
          <div class="pwd-strength-bar">
            <div class="pwd-strength-fill" :class="pwdStrength.class" :style="{ width: pwdStrength.percent + '%' }"></div>
          </div>
          <span class="pwd-strength-label" :class="pwdStrength.class">{{ pwdStrength.label }}</span>
          <ul class="pwd-check-list">
            <li :class="pwdChecks.lengthOk ? 'ok' : ''">✓ 至少 10 位</li>
            <li :class="pwdChecks.lowerOk ? 'ok' : ''">✓ 包含小写字母</li>
            <li :class="pwdChecks.upperOk ? 'ok' : ''">✓ 包含大写字母</li>
            <li :class="pwdChecks.digitOk ? 'ok' : ''">✓ 包含数字</li>
            <li :class="pwdChecks.specialOk ? 'ok' : ''">✓ 包含特殊字符（如 !@#$%^&*）</li>
          </ul>
        </div>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="submit">确认修改</el-button>
          <el-button @click="$router.push('/')">返回</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const formRef = ref<any>(null)
const submitting = ref(false)
const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const rules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 10, message: '密码长度不能少于10位', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: any) => {
        if (!value) return callback()
        if (!/[a-z]/.test(value)) return callback(new Error('密码必须包含小写字母'))
        if (!/[A-Z]/.test(value)) return callback(new Error('密码必须包含大写字母'))
        if (!/\d/.test(value)) return callback(new Error('密码必须包含数字'))
        if (!/[^A-Za-z0-9]/.test(value)) return callback(new Error('密码必须包含特殊字符'))
        callback()
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: any) => {
        if (value !== form.newPassword) callback(new Error('两次输入的密码不一致'))
        else callback()
      },
      trigger: 'blur'
    }
  ]
}

// 密码强度实时计算
const pwdChecks = computed(() => {
  const v = form.newPassword
  return {
    lengthOk: v.length >= 10,
    lowerOk: /[a-z]/.test(v),
    upperOk: /[A-Z]/.test(v),
    digitOk: /\d/.test(v),
    specialOk: /[^A-Za-z0-9]/.test(v)
  }
})
const pwdStrength = computed(() => {
  const c = pwdChecks.value
  const met = [c.lengthOk, c.lowerOk, c.upperOk, c.digitOk, c.specialOk].filter(Boolean).length
  if (!form.newPassword) return { percent: 0, class: '', label: '' }
  if (met <= 2) return { percent: 25, class: 'weak', label: '弱' }
  if (met === 3) return { percent: 50, class: 'medium', label: '中' }
  if (met === 4) return { percent: 75, class: 'good', label: '较强' }
  return { percent: 100, class: 'strong', label: '强' }
})

const submit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    const username = localStorage.getItem('username') || ''
    const res = await fetch('/api/user/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, oldPassword: form.oldPassword, newPassword: form.newPassword })
    })
    const json = await res.json()
    if (json.success) {
      ElMessage.success('密码修改成功，请重新登录')
      localStorage.clear()
      router.push('/login')
    } else {
      ElMessage.error(json.message || '修改失败')
    }
  } catch {
    ElMessage.error('修改密码失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.change-password-page {
  padding: 40px;
  display: flex;
  justify-content: center;
}
.page-card {
  background: #fff;
  border-radius: 12px;
  padding: 40px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}
.page-card h2 {
  margin: 0 0 8px 0;
  color: #333;
}
.pwd-strength-block {
  margin-top: -14px;
  margin-bottom: 14px;
}
.pwd-strength-bar {
  height: 6px;
  border-radius: 3px;
  background: #ebeef5;
  overflow: hidden;
}
.pwd-strength-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s, background-color 0.3s;
}
.pwd-strength-fill.weak { background: #f56c6c; }
.pwd-strength-fill.medium { background: #e6a23c; }
.pwd-strength-fill.good { background: #409eff; }
.pwd-strength-fill.strong { background: #67c23a; }
.pwd-strength-label {
  display: block;
  margin-top: 4px;
  font-size: 12px;
}
.pwd-strength-label.weak { color: #f56c6c; }
.pwd-strength-label.medium { color: #e6a23c; }
.pwd-strength-label.good { color: #409eff; }
.pwd-strength-label.strong { color: #67c23a; }
.pwd-check-list {
  list-style: none;
  padding: 0;
  margin: 8px 0 0 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
}
.pwd-check-list li {
  font-size: 12px;
  color: #c0c4cc;
}
.pwd-check-list li.ok {
  color: #67c23a;
}
</style>
