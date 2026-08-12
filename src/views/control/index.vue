<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import * as echarts from 'echarts'
import type { ECharts, EChartsOption } from 'echarts'
import { ElMessage } from 'element-plus'
import {
  getMemoryInfo,
  reloadAccessResource,
  reloadCache,
  reloadFirewall,
  type MemoryInfo,
} from '@/api/platform'
import { usePageButtons } from '@/composables/usePageButtons'

const { buttons, hasButton } = usePageButtons()

const HISTORY_LIMIT = 20
const unit = 'MB'
const pollSeconds = ref(3)
const loading = ref(false)
const memory = ref<MemoryInfo | null>(null)

const physicalMemoryRef = ref<HTMLDivElement | null>(null)
const swapMemoryRef = ref<HTMLDivElement | null>(null)
const jvmMemoryRef = ref<HTMLDivElement | null>(null)
const jvmCpuRef = ref<HTMLDivElement | null>(null)
const systemCpuRef = ref<HTMLDivElement | null>(null)

const physicalChart = shallowRef<ECharts | null>(null)
const swapChart = shallowRef<ECharts | null>(null)
const jvmMemoryChart = shallowRef<ECharts | null>(null)
const jvmCpuChart = shallowRef<ECharts | null>(null)
const systemCpuChart = shallowRef<ECharts | null>(null)

let timer: ReturnType<typeof setInterval> | null = null

const jvmTimeline: string[] = []
const jvmMaxSeries: number[] = []
const jvmTotalSeries: number[] = []
const jvmUsedSeries: number[] = []
const jvmCpuSeries: Array<{ name: string; value: [string, number] }> = []
const systemCpuSeries: Array<{ name: string; value: [string, number] }> = []

function formatAxisTime(value: string | number) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    return String(value)
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function pushLimited<T>(list: T[], item: T) {
  list.push(item)
  while (list.length > HISTORY_LIMIT) {
    list.shift()
  }
}

function initCharts() {
  if (physicalMemoryRef.value) {
    physicalChart.value = echarts.init(physicalMemoryRef.value)
  }
  if (swapMemoryRef.value) {
    swapChart.value = echarts.init(swapMemoryRef.value)
  }
  if (jvmMemoryRef.value) {
    jvmMemoryChart.value = echarts.init(jvmMemoryRef.value)
  }
  if (jvmCpuRef.value) {
    jvmCpuChart.value = echarts.init(jvmCpuRef.value)
  }
  if (systemCpuRef.value) {
    systemCpuChart.value = echarts.init(systemCpuRef.value)
  }
  renderCharts(null)
}

function gaugeOption(title: string, value: number, max: number, unitLabel: string): EChartsOption {
  return {
    title: { text: title, left: 'center' },
    series: [
      {
        type: 'gauge',
        min: 0,
        max: Math.max(max, 1),
        detail: { formatter: `{value}${unitLabel}` },
        data: [{ name: title, value }],
      },
    ],
  }
}

function renderCharts(data: MemoryInfo | null) {
  const unitLabel = data?.unit || unit
  const usedPhysical = data?.usedPhysical ?? data?.systemUsed ?? 0
  const totalPhysical = data?.totalPhysical ?? data?.systemTotal ?? 100
  const usedSwap = data?.usedSwap ?? 0
  const totalSwap = data?.totalSwap ?? 100

  physicalChart.value?.setOption(
    gaugeOption('服务器内存', Number(usedPhysical.toFixed(2)), totalPhysical, unitLabel),
    true,
  )
  swapChart.value?.setOption(
    gaugeOption('服务器 Swap 内存', Number(usedSwap.toFixed(2)), totalSwap, unitLabel),
    true,
  )

  jvmMemoryChart.value?.setOption(
    {
      title: { text: 'JVM 内存使用' },
      tooltip: { trigger: 'axis' },
      legend: { data: ['JVM最大内存', 'JVM总内存', 'JVM使用内存'] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: [...jvmTimeline],
        axisLabel: { formatter: (value: string) => formatAxisTime(value) },
      },
      yAxis: {
        type: 'value',
        name: `单位: ${unitLabel}`,
      },
      series: [
        { name: 'JVM最大内存', type: 'line', data: [...jvmMaxSeries] },
        { name: 'JVM总内存', type: 'line', data: [...jvmTotalSeries] },
        { name: 'JVM使用内存', type: 'line', data: [...jvmUsedSeries] },
      ],
    } satisfies EChartsOption,
    true,
  )

  jvmCpuChart.value?.setOption(
    {
      title: { text: 'JVM CPU 使用率' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'time',
        axisLabel: { formatter: (value: number) => formatAxisTime(value) },
        splitLine: { show: false },
      },
      yAxis: { type: 'value', splitLine: { show: false } },
      series: [
        {
          name: 'JVM CPU使用率',
          type: 'line',
          showSymbol: false,
          data: jvmCpuSeries.map((item) => ({ ...item, value: [...item.value] as [string, number] })),
        },
      ],
    } satisfies EChartsOption,
    true,
  )

  systemCpuChart.value?.setOption(
    {
      title: { text: 'CPU 使用率' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'time',
        axisLabel: { formatter: (value: number) => formatAxisTime(value) },
        splitLine: { show: false },
      },
      yAxis: { type: 'value', splitLine: { show: false } },
      series: [
        {
          name: '系统 CPU使用率',
          type: 'line',
          showSymbol: false,
          data: systemCpuSeries.map((item) => ({ ...item, value: [...item.value] as [string, number] })),
        },
      ],
    } satisfies EChartsOption,
    true,
  )
}

function appendHistory(data: MemoryInfo) {
  const now = data.dateTime || new Date().toISOString()
  pushLimited(jvmTimeline, now)
  pushLimited(jvmMaxSeries, data.jvmMax ?? 0)
  pushLimited(jvmTotalSeries, data.jvmTotal ?? data.jvmMax ?? 0)
  pushLimited(jvmUsedSeries, data.jvmUsed ?? 0)
  pushLimited(jvmCpuSeries, {
    name: now,
    value: [now, data.processCpu ?? data.cpuUsage ?? 0],
  })
  pushLimited(systemCpuSeries, {
    name: now,
    value: [now, data.systemCpu ?? data.cpuUsage ?? 0],
  })
}

async function fetchMemory() {
  loading.value = true
  try {
    const data = await getMemoryInfo(unit)
    memory.value = data
    appendHistory(data)
    renderCharts(data)
  } finally {
    loading.value = false
  }
}

function clearTask() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function createTask() {
  clearTask()
  timer = setInterval(fetchMemory, pollSeconds.value * 1000)
}

function onPollChange() {
  createTask()
}

async function handleReload(action: () => Promise<void>, label: string) {
  await action()
  ElMessage.success(`${label}成功`)
}

function handleResize() {
  physicalChart.value?.resize()
  swapChart.value?.resize()
  jvmMemoryChart.value?.resize()
  jvmCpuChart.value?.resize()
  systemCpuChart.value?.resize()
}

onMounted(async () => {
  await nextTick()
  initCharts()
  await fetchMemory()
  createTask()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  clearTask()
  window.removeEventListener('resize', handleResize)
  physicalChart.value?.dispose()
  swapChart.value?.dispose()
  jvmMemoryChart.value?.dispose()
  jvmCpuChart.value?.dispose()
  systemCpuChart.value?.dispose()
})
</script>

<template>
  <div class="control-page">
    <el-card shadow="never">
      <template #header>
        <div class="control-page__header">
          <span>系统监控</span>
          <div class="control-page__actions">
            <div class="control-page__poll">
              <span>刷新间隔</span>
              <el-slider
                v-model="pollSeconds"
                :min="1"
                :max="30"
                :format-tooltip="(v: number) => `${v}秒`"
                style="width: 160px"
                @change="onPollChange"
              />
              <span>{{ pollSeconds }}s</span>
            </div>
            <el-button
              v-if="hasButton('reloadFireWall') || buttons.reloadFireWall"
              type="primary"
              @click="handleReload(reloadFirewall, '刷新防火墙')"
            >
              {{ buttons.reloadFireWall?.authName ?? '刷新防火墙' }}
            </el-button>
            <el-button
              v-if="hasButton('reloadCache') || buttons.reloadCache"
              @click="handleReload(reloadCache, '刷新缓存')"
            >
              {{ buttons.reloadCache?.authName ?? '刷新缓存' }}
            </el-button>
            <el-button
              v-if="hasButton('reloadAccessResource') || buttons.reloadAccessResource"
              @click="handleReload(reloadAccessResource, '重载访问资源')"
            >
              {{ buttons.reloadAccessResource?.authName ?? '重载访问资源' }}
            </el-button>
          </div>
        </div>
      </template>

      <el-skeleton :loading="loading && !memory" animated>
        <el-row v-if="memory" :gutter="16" class="control-page__stats">
          <el-col :xs="12" :sm="6">
            <el-statistic title="JVM 已用 (MB)" :value="memory.jvmUsed" />
          </el-col>
          <el-col :xs="12" :sm="6">
            <el-statistic title="JVM 最大 (MB)" :value="memory.jvmMax" />
          </el-col>
          <el-col :xs="12" :sm="6">
            <el-statistic
              title="系统内存已用 (MB)"
              :value="memory.usedPhysical ?? memory.systemUsed ?? 0"
            />
          </el-col>
          <el-col :xs="12" :sm="6">
            <el-statistic
              title="CPU 使用率 (%)"
              :value="memory.systemCpu ?? memory.cpuUsage ?? 0"
            />
          </el-col>
        </el-row>
      </el-skeleton>

      <div class="control-page__gauges">
        <div ref="physicalMemoryRef" class="control-page__chart control-page__chart--gauge" />
        <div ref="swapMemoryRef" class="control-page__chart control-page__chart--gauge" />
      </div>
      <div ref="jvmMemoryRef" class="control-page__chart control-page__chart--full" />
      <div class="control-page__lines">
        <div ref="jvmCpuRef" class="control-page__chart control-page__chart--half" />
        <div ref="systemCpuRef" class="control-page__chart control-page__chart--half" />
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.control-page {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  &__poll {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: 8px;
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }

  &__stats {
    margin-bottom: 16px;
  }

  &__gauges,
  &__lines {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__chart {
    min-height: 320px;

    &--gauge,
    &--half {
      flex: 1;
      min-width: 0;
      height: 420px;
    }

    &--full {
      width: 100%;
      height: 400px;
      margin-bottom: 12px;
    }
  }
}

@media (max-width: 900px) {
  .control-page {
    &__gauges,
    &__lines {
      flex-direction: column;
    }

    &__chart--gauge,
    &__chart--half {
      height: 320px;
    }
  }
}
</style>
