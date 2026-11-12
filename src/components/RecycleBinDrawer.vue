<template>
  <el-drawer
    :model-value="visible"
    @update:model-value="(v: boolean) => { if (!v) close() }"
    title="回收站"
    size="720px"
    direction="rtl"
    class="rb-drawer"
  >
    <div class="rb-head">
      <div class="rb-tip">
        保留 {{ keepDays }} 天，过期自动清除。
        <template v-if="isAdmin">当前为管理员，可查看并恢复所有人删除的记录。</template>
        <template v-else>仅显示你自己删除的记录。</template>
      </div>
      <div class="rb-filters">
        <el-input v-model="keyword" placeholder="搜索标题 / 删除人" clearable style="width: 210px" @keyup.enter="search" @clear="search" />
        <el-select v-model="module" placeholder="全部模块" clearable style="width: 150px" @change="search">
          <el-option v-for="m in modules" :key="m.key" :label="m.label" :value="m.key" />
        </el-select>
        <el-button type="primary" @click="search">查询</el-button>
      </div>
    </div>

    <div v-loading="loading" class="rb-body">
      <el-empty v-if="!loading && !list.length" description="回收站是空的" :image-size="80" />
      <div v-else class="rb-list">
        <div v-for="it in list" :key="it.id" class="rb-item">
          <div class="rb-item-main">
            <div class="rb-item-title">
              <el-tag size="small" effect="plain" class="rb-mod-tag">{{ it.module_label }}</el-tag>
              <span class="rb-title-text">{{ it.title || '(无标题)' }}</span>
            </div>
            <div class="rb-item-meta">
              <span>#{{ it.record_id }}</span>
              <span>删除人：{{ it.deleted_by || '系统' }}</span>
              <span>{{ formatDate(it.deleted_at) }}</span>
              <span class="rb-expire">{{ daysLeft(it.expire_at) }} 天后清除</span>
            </div>
          </div>
          <div class="rb-item-ops">
            <el-popconfirm title="确认恢复这条记录？" confirm-button-text="恢复" cancel-button-text="取消" width="210" @confirm="restore(it.id)">
              <template #reference><el-button size="small" type="primary" plain>恢复</el-button></template>
            </el-popconfirm>
            <el-popconfirm title="彻底清除后无法再恢复，确认？" confirm-button-text="清除" cancel-button-text="取消" width="220" @confirm="purge(it.id)">
              <template #reference><el-button size="small" type="danger" plain>清除</el-button></template>
            </el-popconfirm>
          </div>
        </div>
      </div>
      <div v-if="total > pageSize" class="rb-pager">
        <el-pagination
          layout="total, prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :current-page="page"
          @current-change="changePage"
        />
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { useRecycleBin } from '../composables/useRecycleBin'

const {
  visible, loading, list, total, page, pageSize, isAdmin, keepDays, keyword, module, modules,
  close, search, changePage, restore, purge
} = useRecycleBin()

const formatDate = (v: string) => {
  if (!v) return ''
  const s = String(v).replace('T', ' ').slice(0, 16)
  return s
}
const daysLeft = (v: string) => {
  if (!v) return keepDays.value
  const t = new Date(String(v).replace(' ', 'T')).getTime()
  if (Number.isNaN(t)) return keepDays.value
  return Math.max(0, Math.ceil((t - Date.now()) / 86400000))
}
</script>

<style scoped>
.rb-head { padding-bottom: 12px; border-bottom: 1px solid #e8edf4; }
.rb-tip { font-size: 12px; color: #7a8699; line-height: 1.7; margin-bottom: 10px; }
.rb-filters { display: flex; gap: 8px; flex-wrap: wrap; }
.rb-body { min-height: 240px; padding-top: 8px; }
.rb-list { display: flex; flex-direction: column; }
.rb-item { display: flex; align-items: center; gap: 12px; padding: 11px 4px; border-bottom: 1px solid #f0f3f8; }
.rb-item-main { flex: 1; min-width: 0; }
.rb-item-title { display: flex; align-items: center; gap: 8px; min-width: 0; }
.rb-mod-tag { flex-shrink: 0; }
.rb-title-text { font-size: 13px; color: #2c3542; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rb-item-meta { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 5px; font-size: 11px; color: #98a2b3; }
.rb-expire { color: #d48a20; }
.rb-item-ops { display: flex; gap: 6px; flex-shrink: 0; }
.rb-pager { display: flex; justify-content: flex-end; padding-top: 14px; }
</style>
