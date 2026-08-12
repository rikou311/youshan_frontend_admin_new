<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  searchMerchantCommodityByUid,
  type MerchantCommodityPickerItem,
} from '@/api/merchant'

export interface MerchantCommodityCartItem {
  id: number
  title: string
  price: number
  addCount: number
  tax?: number
  taxtype?: number
  unit?: string
  home?: string
  code?: string
}

interface Props {
  visible: boolean
  uid: number
  mode?: 'add' | 'append'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'add',
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [items: MerchantCommodityCartItem[]]
  append: [cart: Record<number, MerchantCommodityCartItem>]
}>()

const loading = ref(false)
const list = ref<Array<MerchantCommodityPickerItem & { addCount: number }>>([])
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })
const searchForm = reactive({ title: '', code: '' })
const cart = ref<Record<number, MerchantCommodityCartItem>>({})

function resetState() {
  searchForm.title = ''
  searchForm.code = ''
  pagination.page = 1
  cart.value = {}
  list.value = []
}

async function fetchList() {
  if (!props.uid) {
    list.value = []
    pagination.total = 0
    return
  }
  loading.value = true
  try {
    const result = await searchMerchantCommodityByUid({
      page: pagination.page,
      pageSize: pagination.pageSize,
      title: searchForm.title || undefined,
      code: searchForm.code || undefined,
      userid: props.uid,
    })
    list.value = result.list.map((item) => ({
      ...item,
      addCount: cart.value[item.id]?.addCount ?? 0,
    }))
    pagination.total = result.total
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.visible, props.uid] as const,
  ([visible, uid]) => {
    if (!visible) {
      return
    }
    resetState()
    if (uid) {
      void fetchList()
    }
  },
)

function onCountChange(row: MerchantCommodityPickerItem & { addCount: number }) {
  if (row.addCount > 0) {
    cart.value[row.id] = {
      id: row.id,
      title: row.title,
      price: row.price,
      addCount: row.addCount,
      tax: row.tax,
      taxtype: row.taxtype,
      unit: row.unit,
      home: row.home,
      code: row.code,
    }
    return
  }
  delete cart.value[row.id]
}

function rowClassName({ row }: { row: MerchantCommodityPickerItem }) {
  return Number(row.total) < 50 ? 'merchant-commodity-picker__row--low' : ''
}

function closeDialog() {
  emit('update:visible', false)
}

async function handleConfirm() {
  const items = Object.values(cart.value).filter((item) => item.addCount > 0)
  if (!items.length) {
    ElMessage.warning('请先选择商品数量')
    return
  }
  await ElMessageBox.confirm(
    props.mode === 'append' ? '确认要追加商品吗？' : '确认添加所选商品吗？',
    '确认',
    { type: 'warning' },
  )
  if (props.mode === 'append') {
    emit('append', { ...cart.value })
  } else {
    emit('confirm', items)
  }
  closeDialog()
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="选择商户商品"
    width="86%"
    top="4vh"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <el-alert
      v-if="!uid"
      type="warning"
      :closable="false"
      title="请先选择订单用户，再添加商品"
      show-icon
      class="merchant-commodity-picker__alert"
    />

    <el-form :inline="true" @submit.prevent="fetchList">
      <el-form-item label="商品名">
        <el-input v-model="searchForm.title" clearable />
      </el-form-item>
      <el-form-item label="CODE">
        <el-input v-model="searchForm.code" clearable />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :disabled="!uid" :loading="loading" @click="fetchList">
          查询
        </el-button>
      </el-form-item>
    </el-form>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
      max-height="520"
      :row-class-name="rowClassName"
    >
      <el-table-column prop="code" label="CODE" width="100" />
      <el-table-column label="SKU" width="100">
        <template #default="{ row }">YS{{ row.id }}</template>
      </el-table-column>
      <el-table-column prop="title" label="商品名" min-width="220" />
      <el-table-column label="价格" width="140">
        <template #default="{ row }">
          ¥{{ row.price }}
          <span v-if="row.priced" class="merchant-commodity-picker__priced">¥{{ row.priced }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="total" label="库存" width="90" />
      <el-table-column label="数量" width="160">
        <template #default="{ row }">
          <el-input-number
            v-if="row.total > 0"
            v-model="row.addCount"
            :min="0"
            :max="row.total"
            size="small"
            @change="onCountChange(row)"
          />
          <span v-else class="merchant-commodity-picker__empty">无库存</span>
        </template>
      </el-table-column>
    </el-table>

    <div class="merchant-commodity-picker__pagination">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next"
        :page-sizes="[10, 20, 50]"
        background
        @current-change="fetchList"
        @size-change="fetchList"
      />
    </div>

    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :disabled="!uid" @click="handleConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.merchant-commodity-picker {
  &__alert {
    margin-bottom: 12px;
  }

  &__priced {
    margin-left: 6px;
    color: #909399;
    text-decoration: line-through;
  }

  &__empty {
    color: #f56c6c;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}

:deep(.merchant-commodity-picker__row--low) {
  --el-table-tr-bg-color: #fdf6ec;
}
</style>
