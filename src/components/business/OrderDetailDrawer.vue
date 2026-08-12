<script setup lang="ts">
import { ref, watch } from 'vue'
import type { OrderDetailModel } from '@/types/order'

interface Props {
  visible: boolean
  loading?: boolean
  detail: OrderDetailModel | null
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  title: '订单详情',
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const drawerVisible = ref(false)

watch(
  () => props.visible,
  (value) => {
    drawerVisible.value = value
  },
  { immediate: true },
)

function closeDrawer() {
  emit('update:visible', false)
}
</script>

<template>
  <el-drawer v-model="drawerVisible" :title="title" size="480px" @close="closeDrawer">
    <el-skeleton :loading="loading" animated>
      <template v-if="detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="订单 ID">{{ detail.id }}</el-descriptions-item>
          <el-descriptions-item label="收货人">{{ detail.name }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.phone" label="手机号">{{ detail.phone }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.address" label="地址">{{ detail.address }}</el-descriptions-item>
          <el-descriptions-item label="金额">¥{{ detail.total }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.status !== undefined" label="状态">
            {{ detail.status }}
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.updatedAt" label="更新时间">
            {{ detail.updatedAt }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="detail.items?.length" class="order-detail__items">
          <h4>商品明细</h4>
          <el-table :data="detail.items" size="small" stripe>
            <el-table-column prop="title" label="商品" min-width="160" />
            <el-table-column prop="quantity" label="数量" width="80" />
            <el-table-column prop="price" label="单价" width="100">
              <template #default="{ row }">¥{{ row.price }}</template>
            </el-table-column>
          </el-table>
        </div>
      </template>
    </el-skeleton>
  </el-drawer>
</template>

<style scoped lang="scss">
.order-detail__items {
  margin-top: 20px;

  h4 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
  }
}
</style>
