<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { TableInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import {
  getClientAuthoritys,
  grantClientResources,
  type AccessItem,
} from '@/api/platform'
import { formatDictionary, formatMultiDictionary } from '@/utils/dictionary'

function formatAuthority(value?: string | null) {
  return formatMultiDictionary('oauth2_authority', value) || value || '-'
}

interface Props {
  visible: boolean
  clientId?: string | number | null
  clientLabel?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const loading = ref(false)
const submitting = ref(false)
const accessList = ref<AccessItem[]>([])
const tableRef = ref<TableInstance>()

watch(
  () => props.visible,
  async (visible) => {
    if (!visible || props.clientId == null || props.clientId === '') {
      return
    }
    loading.value = true
    try {
      const res = await getClientAuthoritys(props.clientId)
      accessList.value = res.accesses ?? []
      const grantedIds = new Set((res.resourceIds ?? []).map(String))
      await nextTick()
      tableRef.value?.clearSelection()
      for (const row of accessList.value) {
        if (grantedIds.has(String(row.id))) {
          tableRef.value?.toggleRowSelection(row, true)
        }
      }
    } finally {
      loading.value = false
    }
  },
)

function closeDialog() {
  emit('update:visible', false)
}

async function handleSubmit() {
  if (props.clientId == null || props.clientId === '' || !tableRef.value) {
    return
  }
  const selectedRows = tableRef.value.getSelectionRows() as AccessItem[]
  submitting.value = true
  try {
    await grantClientResources({
      clientId: props.clientId,
      resourceIds: selectedRows.map((row) => row.id),
    })
    ElMessage.success('授权成功')
    emit('success')
    closeDialog()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="clientLabel ? `授权 - ${clientLabel}` : '授权'"
    width="800px"
    destroy-on-close
    @close="closeDialog"
  >
    <div class="grant-table">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="accessList"
        row-key="id"
        border
        fit
        highlight-current-row
        height="550"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="resourceName" label="权限" width="120" />
        <el-table-column prop="resource" label="访问地址" min-width="180" />
        <el-table-column label="请求方法" width="100">
          <template #default="{ row }">
            {{ formatDictionary('request_type', row.method) || row.method }}
          </template>
        </el-table-column>
        <el-table-column label="权限" width="120">
          <template #default="{ row }">
            {{ formatAuthority(row.authority) }}
          </template>
        </el-table-column>
        <el-table-column prop="scope" label="范围" width="130" />
        <el-table-column prop="moduleCode" label="所属模块" width="130" />
      </el-table>
    </div>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.grant-table {
  width: 100%;
}
</style>
