<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import * as echarts from 'echarts'
import type { EChartsType } from 'echarts'
import {
  getDashboardSalesDetail,
  getDashboardSalesIndex,
  type DashboardProductDetailItem,
} from '@/api/dashboard'
import { formatMoneyJp } from '@/utils/format'

const emit = defineEmits<{
  'data-updated': [
    data: {
      salesData: { dates: string[]; volumes: number[] }
      dateRange: string[]
      category: string
    },
  ]
}>()

const chartRef = ref<HTMLDivElement>()
const chart = ref<EChartsType | null>(null)
const loading = ref(false)
const filters = reactive({
  time: 'month',
  category: 'all',
})
const internalSalesData = reactive({
  dates: [] as string[],
  volumes: [] as number[],
})
const totalPrice = ref(0)
const averagePrice = ref(0)

const detailDialogVisible = ref(false)
const detailDialogLoading = ref(false)
const detailDialogDate = ref('')
const detailList = ref<DashboardProductDetailItem[]>([])

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = new Date()
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
const dateRange = ref<string[]>([formatDate(firstDayOfMonth), formatDate(today)])

const totalQuantity = computed(() =>
  detailList.value.reduce((sum, item) => sum + (Number(item.count) || 0), 0),
)

const totalAmount = computed(() =>
  detailList.value.reduce((sum, item) => {
    const price = Number(item.price) || 0
    const count = Number(item.count) || 0
    return sum + price * count
  }, 0),
)

function updateChart() {
  if (!chart.value) {
    return
  }
  const dataLength = internalSalesData.dates.length
  let startPercent = 0
  const endPercent = 100
  if (dataLength > 10) {
    startPercent = Math.max(0, ((dataLength - 10) / dataLength) * 100)
  }

  const volumes = internalSalesData.volumes || []
  let yAxisMax = 1000000
  let yAxisInterval = 100000
  if (volumes.length > 0) {
    const maxValue = Math.max(...volumes)
    if (maxValue > 0) {
      const paddedMax = maxValue * 1.2
      const magnitude = 10 ** Math.floor(Math.log10(paddedMax))
      const normalized = paddedMax / magnitude
      let roundedNormalized = 10
      if (normalized <= 1) {
        roundedNormalized = 1
      } else if (normalized <= 2) {
        roundedNormalized = 2
      } else if (normalized <= 5) {
        roundedNormalized = 5
      }
      yAxisMax = roundedNormalized * magnitude
      const rawInterval = yAxisMax / 8
      const intervalMagnitude = 10 ** Math.floor(Math.log10(rawInterval))
      const normalizedInterval = rawInterval / intervalMagnitude
      let roundedInterval = 10
      if (normalizedInterval <= 1) {
        roundedInterval = 1
      } else if (normalizedInterval <= 2) {
        roundedInterval = 2
      } else if (normalizedInterval <= 5) {
        roundedInterval = 5
      }
      yAxisInterval = roundedInterval * intervalMagnitude
    }
  }

  chart.value.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    toolbox: {
      feature: {
        dataZoom: { yAxisIndex: 'none' },
        restore: { show: true, title: '还原' },
        saveAsImage: { show: true, title: '保存为图片' },
      },
      right: 10,
      top: 10,
    },
    dataZoom: [
      {
        type: 'inside',
        start: startPercent,
        end: endPercent,
        xAxisIndex: [0],
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
      },
      {
        type: 'slider',
        start: startPercent,
        end: endPercent,
        xAxisIndex: [0],
        height: 20,
        bottom: 10,
        show: dataLength > 5,
        handleStyle: { color: '#409EFF', borderColor: '#409EFF' },
        borderColor: '#409EFF',
        fillerColor: 'rgba(64, 158, 255, 0.1)',
        handleSize: '80%',
      },
    ],
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: internalSalesData.dates,
      axisLabel: { color: '#666' },
      axisLine: { lineStyle: { color: '#e0e0e0' } },
    },
    yAxis: {
      type: 'value',
      name: '销售量',
      min: 0,
      max: yAxisMax,
      interval: yAxisInterval,
      axisLabel: { color: '#666' },
      axisLine: { lineStyle: { color: '#e0e0e0' } },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
    },
    series: [
      {
        name: '销售量',
        type: 'bar',
        data: internalSalesData.volumes,
        itemStyle: { color: '#409EFF' },
        barWidth: '50%',
        label: {
          show: true,
          position: 'top',
          formatter: (params: { value?: number | string }) => {
            const value = params.value
            return value !== undefined && value !== null ? Number(value).toLocaleString() : ''
          },
        },
      },
    ],
  })
}

async function loadData(range?: string[]) {
  loading.value = true
  internalSalesData.dates = []
  internalSalesData.volumes = []
  totalPrice.value = 0
  averagePrice.value = 0
  const dateList =
    range && range.length === 2
      ? range
      : [formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), formatDate(new Date())]
  try {
    const response = await getDashboardSalesIndex({ dateList })
    const salesVolume = response?.salesVolume || []
    const dateMap = new Map<string, number>()
    let totalQuantityCount = 0
    for (const item of salesVolume) {
      totalQuantityCount += 1
      const formattedDate = item.date ? String(item.date).substring(0, 10) : ''
      if (!formattedDate) {
        continue
      }
      const amount = Number(item.total) || 0
      dateMap.set(formattedDate, (dateMap.get(formattedDate) || 0) + amount)
      totalPrice.value += amount
    }
    averagePrice.value = totalQuantityCount ? totalPrice.value / totalQuantityCount : 0
    Array.from(dateMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .forEach(([date, volume]) => {
        internalSalesData.dates.push(date)
        internalSalesData.volumes.push(volume)
      })
    emit('data-updated', {
      salesData: { dates: [...internalSalesData.dates], volumes: [...internalSalesData.volumes] },
      dateRange: [...dateRange.value],
      category: filters.category,
    })
    updateChart()
  } finally {
    loading.value = false
  }
}

function handleFilterChange() {
  void loadData(dateRange.value)
}

function handleTimeChange() {
  const now = new Date()
  let startDate: Date
  let endDate: Date
  if (filters.time === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    endDate = now
  } else if (filters.time === 'week') {
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    startDate = monday
    endDate = now
  } else if (filters.time === 'day') {
    startDate = now
    endDate = now
  } else {
    return
  }
  dateRange.value = [formatDate(startDate), formatDate(endDate)]
  void nextTick(() => handleFilterChange())
}

function handleDateRangeChange(value: string[] | null) {
  if (value && value.length === 2 && value[0] && value[1]) {
    handleFilterChange()
  }
}

async function loadDetailData(date: string) {
  if (!date) {
    return
  }
  detailDialogLoading.value = true
  try {
    let dateObj: Date
    if (date.includes('-')) {
      dateObj = new Date(`${date}T00:00:00`)
    } else if (date.includes('.')) {
      const parts = date.split('.')
      dateObj = new Date(new Date().getFullYear(), Number(parts[0]) - 1, Number(parts[1]))
    } else {
      dateObj = new Date(date)
    }
    if (Number.isNaN(dateObj.getTime())) {
      return
    }
    detailList.value = await getDashboardSalesDetail({ date: dateObj })
  } finally {
    detailDialogLoading.value = false
  }
}

function handleBarDblClick(params: { componentType?: string; name?: string }) {
  if (!params || params.componentType !== 'series' || !params.name) {
    return
  }
  detailDialogDate.value = params.name
  detailDialogVisible.value = true
  void loadDetailData(params.name)
}

function handleResize() {
  chart.value?.resize()
}

watch(internalSalesData, () => updateChart(), { deep: true })

onMounted(() => {
  if (chartRef.value) {
    chart.value = echarts.init(chartRef.value)
    chart.value.on('dblclick', handleBarDblClick)
    updateChart()
  }
  window.addEventListener('resize', handleResize)
  void loadData(dateRange.value)
})

onBeforeUnmount(() => {
  chart.value?.dispose()
  chart.value = null
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div v-loading="loading">
    <div class="chart-section">
      <div class="section-header">
        <h3 class="section-title">销售数据统计</h3>
        <div class="filter-group">
          <div class="filter-item">
            <span class="filter-label">时间:</span>
            <el-select
              v-model="filters.time"
              placeholder="请选择"
              style="width: 150px"
              @change="handleTimeChange"
            >
              <el-option label="本月" value="month" />
              <el-option label="本周" value="week" />
              <el-option label="本日" value="day" />
              <el-option label="自定义" value="custom" />
            </el-select>
            <span class="filter-label">平均额: {{ formatMoneyJp(averagePrice) }}</span>
            <span class="filter-label">总金额: {{ formatMoneyJp(totalPrice) }}</span>
            <el-date-picker
              v-if="filters.time === 'custom'"
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 300px; margin-left: 10px"
              @change="handleDateRangeChange"
            />
            <span
              v-if="filters.time !== 'custom'"
              style="margin-left: 10px; color: #909399; font-size: 12px"
            >
              {{ dateRange?.[0] }} 至 {{ dateRange?.[1] }}
            </span>
          </div>
        </div>
      </div>
      <div ref="chartRef" class="chart-container" />
    </div>

    <el-dialog
      v-model="detailDialogVisible"
      width="800px"
      :title="`商品销售明细 - ${detailDialogDate}`"
      append-to-body
    >
      <el-table v-loading="detailDialogLoading" :data="detailList" border style="width: 100%">
        <el-table-column prop="title" label="商品名称" min-width="150" width="300" />
        <el-table-column prop="count" label="销售数量" width="100" align="right" />
        <el-table-column prop="price" label="单价" width="100" align="left" sortable>
          <template #default="{ row }">{{ formatMoneyJp(row.price) }}</template>
        </el-table-column>
        <el-table-column label="总额" width="120" align="left" sortable>
          <template #default="{ row }">
            {{ formatMoneyJp(Number(row.price || 0) * Number(row.count || 0)) }}
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <div class="dialog-footer">
          <div class="detail-summary">
            <div class="summary-item">
              <span class="summary-label">总数量：</span>
              <span class="summary-value">{{ totalQuantity }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">总金额：</span>
              <span class="summary-value summary-amount">{{ formatMoneyJp(totalAmount) }}</span>
            </div>
          </div>
          <el-button @click="detailDialogVisible = false">关 闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.chart-section {
  background: #fff;
  padding: 20px;
  border-radius: 4px;
  margin-bottom: 20px;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.12),
    0 0 6px rgba(0, 0, 0, 0.04);

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 15px;

    .section-title {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }

    .filter-group {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      align-items: center;

      .filter-item {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;

        .filter-label {
          font-size: 14px;
          color: #606266;
          white-space: nowrap;
        }
      }
    }
  }

  .chart-container {
    width: 100%;
    height: 400px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;

  .detail-summary {
    display: flex;
    justify-content: flex-start;
    gap: 30px;
    flex: 1;

    .summary-item {
      display: flex;
      align-items: center;
      gap: 8px;

      .summary-label {
        font-size: 14px;
        color: #606266;
        font-weight: 500;
      }

      .summary-value {
        font-size: 16px;
        color: #303133;
        font-weight: 600;

        &.summary-amount {
          color: #f56c6c;
          font-size: 18px;
        }
      }
    }
  }
}
</style>
