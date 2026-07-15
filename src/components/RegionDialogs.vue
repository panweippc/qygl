<template>
  <!-- 添加/编辑省份对话框 -->
  <el-dialog
    v-model="provinceDialogModel"
    :title="isEditingProvince ? '编辑省份' : '添加省份'"
    width="400px"
    :close-on-click-modal="false"
  >
    <el-form :model="provinceForm" label-width="80px">
      <el-form-item label="省份名称" required>
        <el-input v-model="provinceForm.name" placeholder="请输入省份名称" />
      </el-form-item>
      <el-form-item label="省份代码" required>
        <el-input v-model="provinceForm.code" placeholder="请输入省份代码，如：110000" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="provinceDialogModel = false">取消</el-button>
        <el-button type="primary" @click="submitProvince" :loading="submitting">
          确定
        </el-button>
      </span>
    </template>
  </el-dialog>

  <!-- 添加城市对话框 -->
  <el-dialog
    v-model="cityDialogModel"
    :title="isEditingCity ? '编辑城市' : '添加城市'"
    width="400px"
  >
    <el-form :model="cityForm" :rules="cityRules" ref="cityFormRef" label-width="80px">
      <el-form-item label="城市名称" prop="name" required>
        <el-input v-model="cityForm.name" placeholder="请输入城市名称" />
      </el-form-item>
      <el-form-item label="城市代码" prop="code" required>
        <el-input v-model="cityForm.code" placeholder="请输入城市代码" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="cityDialogModel = false">取消</el-button>
        <el-button type="primary" @click="submitCity" :loading="submitting">
          确定
        </el-button>
      </span>
    </template>
  </el-dialog>

  <!-- 添加旗县对话框 -->
  <el-dialog
    v-model="countyDialogModel"
    :title="isEditingCounty ? '编辑旗县' : '添加旗县'"
    width="400px"
    :close-on-click-modal="false"
  >
    <el-form :model="countyForm" label-width="80px">
      <el-form-item label="旗县名称" required>
        <el-input v-model="countyForm.name" placeholder="请输入旗县名称" />
      </el-form-item>
      <el-form-item label="旗县代码" required>
        <el-input v-model="countyForm.code" placeholder="请输入旗县代码，如：110101" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="countyDialogModel = false">取消</el-button>
        <el-button type="primary" @click="submitCounty" :loading="submitting">
          确定
        </el-button>
      </span>
    </template>
  </el-dialog>

  <!-- 添加项目对话框 -->
  <el-dialog
    v-model="projectDialogModel"
    :title="isEditingProject ? '编辑项目' : '添加项目'"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form :model="projectForm" label-width="100px">
      <el-form-item label="项目名称" required>
        <el-input v-model="projectForm.name" placeholder="请输入项目名称" />
      </el-form-item>
      <el-form-item label="项目描述" required>
        <el-input type="textarea" v-model="projectForm.description" placeholder="请输入项目描述" :rows="3" />
      </el-form-item>
      <el-form-item label="项目状态" required>
        <el-select v-model="projectForm.status" placeholder="请选择项目状态">
          <el-option label="进行中" value="进行中" />
          <el-option label="已完成" value="已完成" />
          <el-option label="已取消" value="已取消" />
        </el-select>
      </el-form-item>
      <el-form-item label="项目价格" required>
        <el-input v-model.number="projectForm.price" type="number" placeholder="请输入项目价格" />
      </el-form-item>
      <el-form-item label="成交时间" required>
        <el-date-picker v-model="projectForm.dealTime" type="date" placeholder="请选择成交时间" style="width: 100%" />
      </el-form-item>
      <el-form-item label="服务结束时间" required>
        <el-date-picker v-model="projectForm.serviceEndTime" type="date" placeholder="请选择服务结束时间" style="width: 100%" />
      </el-form-item>
      <el-form-item label="次年费用状态" required>
        <el-select v-model="projectForm.nextYearFeeStatus" placeholder="请选择次年费用状态">
          <el-option label="已支付" value="已支付" />
          <el-option label="未支付" value="未支付" />
        </el-select>
      </el-form-item>
      <el-form-item label="合同费用状态" required>
        <el-select v-model="projectForm.contractFeeStatus" placeholder="请选择合同费用状态">
          <el-option label="未结" value="未结" />
          <el-option label="结清" value="结清" />
          <el-option label="未结算" value="未结算" />
        </el-select>
      </el-form-item>
      <el-form-item label="剩余金额" required v-if="projectForm.contractFeeStatus === '未结算'">
        <el-input v-model.number="projectForm.remainingAmount" type="number" placeholder="请输入剩余金额" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="projectDialogModel = false">取消</el-button>
        <el-button type="primary" @click="submitProject" :loading="submitting">
          确定
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  provinceDialogVisible: boolean
  cityDialogVisible: boolean
  countyDialogVisible: boolean
  projectDialogVisible: boolean
  editingProvince: any
  editingCity: any
  editingCounty: any
  editingProject: any
  currentProvinceId: number | null
  currentCityId: number | null
  currentCountyId: number | null
  submitting: boolean
}>()

const emit = defineEmits<{
  'update:provinceDialogVisible': [value: boolean]
  'update:cityDialogVisible': [value: boolean]
  'update:countyDialogVisible': [value: boolean]
  'update:projectDialogVisible': [value: boolean]
  'save-province': [data: any]
  'save-city': [data: any]
  'save-county': [data: any]
  'save-project': [data: any]
}>()

// --- Province dialog ---
const provinceDialogModel = computed({
  get: () => props.provinceDialogVisible,
  set: (val) => emit('update:provinceDialogVisible', val)
})

const provinceForm = ref({ id: '', name: '', code: '' })
const isEditingProvince = ref(false)

watch(() => props.provinceDialogVisible, (visible) => {
  if (visible) {
    if (props.editingProvince) {
      isEditingProvince.value = true
      provinceForm.value = {
        id: String(props.editingProvince.id),
        name: props.editingProvince.name,
        code: props.editingProvince.code
      }
    } else {
      isEditingProvince.value = false
      provinceForm.value = { id: '', name: '', code: '' }
    }
  }
})

const submitProvince = () => {
  if (!provinceForm.value.name.trim()) {
    ElMessage.warning('请输入省份名称')
    return
  }
  if (!provinceForm.value.code.trim()) {
    ElMessage.warning('请输入省份代码')
    return
  }
  emit('save-province', { ...provinceForm.value, isEditing: isEditingProvince.value })
}

// --- City dialog ---
const cityDialogModel = computed({
  get: () => props.cityDialogVisible,
  set: (val) => emit('update:cityDialogVisible', val)
})

const cityForm = ref({ id: '', name: '', code: '' })
const cityFormRef = ref()
const cityRules = {
  name: [
    { required: true, message: '请输入城市名称', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入城市代码', trigger: 'blur' }
  ]
}
const isEditingCity = computed(() => !!cityForm.value.id)

watch(() => props.cityDialogVisible, (visible) => {
  if (visible) {
    if (props.editingCity) {
      cityForm.value = {
        id: String(props.editingCity.id),
        name: String(props.editingCity.name),
        code: String(props.editingCity.code)
      }
    } else {
      cityForm.value = { id: '', name: '', code: '' }
    }
  }
})

const submitCity = async () => {
  if (!cityFormRef.value) {
    ElMessage.warning('表单引用无效')
    return
  }
  const valid = await cityFormRef.value.validate().catch(() => false)
  if (!valid) {
    ElMessage.warning('表单验证失败，请检查输入')
    return
  }
  emit('save-city', {
    ...cityForm.value,
    provinceId: props.currentProvinceId,
    isEditing: isEditingCity.value
  })
}

// --- County dialog ---
const countyDialogModel = computed({
  get: () => props.countyDialogVisible,
  set: (val) => emit('update:countyDialogVisible', val)
})

const countyForm = ref({ id: '', name: '', code: '' })
const isEditingCounty = computed(() => !!countyForm.value.id)

watch(() => props.countyDialogVisible, (visible) => {
  if (visible) {
    if (props.editingCounty) {
      countyForm.value = {
        id: String(props.editingCounty.id),
        name: props.editingCounty.name,
        code: props.editingCounty.code
      }
    } else {
      countyForm.value = { id: '', name: '', code: '' }
    }
  }
})

const submitCounty = () => {
  if (!countyForm.value.name.trim()) {
    ElMessage.warning('请输入旗县名称')
    return
  }
  if (!countyForm.value.code.trim()) {
    ElMessage.warning('请输入旗县代码')
    return
  }
  if (!props.currentCityId) {
    ElMessage.error('当前城市ID无效')
    return
  }
  emit('save-county', {
    ...countyForm.value,
    cityId: props.currentCityId,
    isEditing: isEditingCounty.value
  })
}

// --- Project dialog ---
const projectDialogModel = computed({
  get: () => props.projectDialogVisible,
  set: (val) => emit('update:projectDialogVisible', val)
})

const projectForm = ref({
  id: '',
  name: '',
  description: '',
  status: '进行中',
  price: 0,
  dealTime: '',
  serviceEndTime: '',
  nextYearFeeStatus: '待确认',
  contractFeeStatus: '未结',
  remainingAmount: 0
})
const isEditingProject = computed(() => !!projectForm.value.id)

watch(() => props.projectDialogVisible, (visible) => {
  if (visible) {
    if (props.editingProject) {
      const p = props.editingProject
      projectForm.value = {
        id: String(p.id),
        name: p.name,
        description: p.description,
        status: p.status,
        price: p.price,
        dealTime: p.dealTime,
        serviceEndTime: p.serviceEndTime,
        nextYearFeeStatus: p.nextYearFeeStatus,
        contractFeeStatus: p.contractFeeStatus || '未结',
        remainingAmount: p.remainingAmount || 0
      }
    } else {
      projectForm.value = {
        id: '',
        name: '',
        description: '',
        status: '进行中',
        price: 0,
        dealTime: '',
        serviceEndTime: '',
        nextYearFeeStatus: '待确认',
        contractFeeStatus: '未结',
        remainingAmount: 0
      }
    }
  }
})

const submitProject = () => {
  if (!projectForm.value.name.trim()) {
    ElMessage.warning('请输入项目名称')
    return
  }
  if (!projectForm.value.description.trim()) {
    ElMessage.warning('请输入项目描述')
    return
  }
  if (!props.currentCountyId) {
    ElMessage.error('当前旗县ID无效')
    return
  }
  emit('save-project', {
    ...projectForm.value,
    provinceId: props.currentProvinceId,
    cityId: props.currentCityId,
    countyId: props.currentCountyId,
    isEditing: isEditingProject.value
  })
}
</script>
