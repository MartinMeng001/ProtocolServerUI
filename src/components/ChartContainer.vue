<template>
  <div
    class="chart-container"
    :class="containerClass"
  >
    <!-- 图表头部 -->
    <div
      v-if="title || $slots.title || showActions || $slots.actions"
      class="chart-container__header"
    >
      <div class="chart-container__title-section">
        <!-- 标题 -->
        <h3 class="chart-container__title">
          <slot name="title">{{ title }}</slot>
        </h3>

        <!-- 副标题 -->
        <p
          v-if="subtitle || $slots.subtitle"
          class="chart-container__subtitle"
        >
          <slot name="subtitle">{{ subtitle }}</slot>
        </p>
      </div>

      <!-- 操作按钮 -->
      <div
        v-if="showActions || $slots.actions"
        class="chart-container__actions"
      >
        <slot name="actions">
          <el-button-group v-if="showRefresh || showExport || showFullscreen">
            <el-button
              v-if="showRefresh"
              size="small"
              :loading="refreshing"
              @click="handleRefresh"
            >
              <el-icon><Refresh /></el-icon>
            </el-button>

            <el-button
              v-if="showExport"
              size="small"
              @click="handleExport"
            >
              <el-icon><Download /></el-icon>
            </el-button>

            <el-button
              v-if="showFullscreen"
              size="small"
              @click="handleFullscreen"
            >
              <el-icon><FullScreen /></el-icon>
            </el-button>
          </el-button-group>

          <!-- 时间范围选择器 -->
          <el-select
            v-if="showTimeRange"
            v-model="selectedTimeRange"
            size="small"
            style="width: 120px"
            @change="handleTimeRangeChange"
          >
            <el-option
              v-for="option in timeRangeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>

          <!-- 图表类型切换 -->
          <el-radio-group
            v-if="showChartTypeSwitch"
            v-model="selectedChartType"
            size="small"
            @change="handleChartTypeChange"
          >
            <el-radio-button
              v-for="type in chartTypes"
              :key="type.value"
              :value="type.value"
            >
              <el-icon><component :is="type.icon" /></el-icon>
              {{ type.label }}
            </el-radio-button>
          </el-radio-group>
        </slot>
      </div>
    </div>

    <!-- 图表主体 -->
    <div class="chart-container__body">
      <!-- 加载状态 -->
      <div
        v-if="loading"
        class="chart-container__loading"
      >
        <el-icon class="is-loading"><Loading /></el-icon>
        <span style="margin-left: 8px;">{{ loadingText }}</span>
      </div>

      <!-- 空数据状态 -->
      <div
        v-else-if="isEmpty"
        class="chart-container__empty"
      >
        <el-icon class="chart-container__empty-icon"><Document /></el-icon>
        <p class="chart-container__empty-text">{{ emptyText }}</p>
        <el-button
          v-if="showRetry"
          type="primary"
          @click="handleRetry"
        >
          重试
        </el-button>
      </div>

      <!-- 错误状态 -->
      <div
        v-else-if="error"
        class="chart-container__error"
      >
        <el-icon class="chart-container__error-icon"><Warning /></el-icon>
        <p class="chart-container__error-text">{{ error }}</p>
        <el-button
          v-if="showRetry"
          type="primary"
          @click="handleRetry"
        >
          重试
        </el-button>
      </div>

      <!-- 图表内容 -->
      <div
        v-else
        class="chart-container__chart"
        :style="{ height: chartHeight }"
      >
        <slot>
          <v-chart
            ref="chartRef"
            class="chart"
            :option="chartOption"
            :theme="theme"
            :init-options="initOptions"
            :update-options="updateOptions"
            :group="group"
            :autoresize="autoresize"
            :loading="chartLoading"
            :loading-options="loadingOptions"
            @click="handleChartClick"
            @dblclick="handleChartDblClick"
            @mouseover="handleChartMouseover"
            @mouseout="handleChartMouseout"
            @selectchanged="handleChartSelectChanged"
            @finished="handleChartFinished"
          />
        </slot>
      </div>
    </div>

    <!-- 图表底部 -->
    <div
      v-if="showFooter || $slots.footer"
      class="chart-container__footer"
    >
      <slot name="footer">
        <div
          v-if="showLegend && legendData.length"
          class="chart-container__legend"
        >
          <div
            v-for="item in legendData"
            :key="item.name"
            class="legend-item"
            :class="{ 'legend-item--disabled': item.disabled }"
            @click="handleLegendClick(item)"
          >
            <span
              class="legend-item__color"
              :style="{ backgroundColor: item.color }"
            />
            <span class="legend-item__name">{{ item.name }}</span>
            <span
              v-if="item.value !== undefined"
              class="legend-item__value"
            >
              {{ formatLegendValue(item.value) }}
            </span>
          </div>
        </div>

        <div
          v-if="showDataZoom"
          class="chart-container__data-zoom"
        >
          <el-slider
            v-model="dataZoomRange"
            range
            :min="0"
            :max="100"
            :step="1"
            @change="handleDataZoomChange"
          />
        </div>
      </slot>
    </div>

    <!-- 全屏模态框 -->
    <el-dialog
      v-if="showFullscreen"
      v-model="fullscreenVisible"
      :title="title"
      width="90%"
      top="5vh"
      :before-close="handleFullscreenClose"
      class="chart-fullscreen-dialog"
    >
      <div class="chart-fullscreen-container">
        <v-chart
          class="chart chart--fullscreen"
          :option="chartOption"
          :theme="theme"
          :init-options="initOptions"
          :update-options="updateOptions"
          :autoresize="true"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { EChartsOption, EChartsType } from 'echarts'

// 定义组件属性接口
interface ChartContainerProps {
  // 基本属性
  title?: string
  subtitle?: string
  chartOption?: EChartsOption
  height?: string | number
  theme?: string
  loading?: boolean
  loadingText?: string
  error?: string
  isEmpty?: boolean
  emptyText?: string

  // 显示控制
  showActions?: boolean
  showRefresh?: boolean
  showExport?: boolean
  showFullscreen?: boolean
  showTimeRange?: boolean
  showChartTypeSwitch?: boolean
  showFooter?: boolean
  showLegend?: boolean
  showDataZoom?: boolean
  showRetry?: boolean

  // 图表配置
  autoresize?: boolean
  chartLoading?: boolean
  loadingOptions?: any
  initOptions?: any
  updateOptions?: any
  group?: string

  // 其他配置
  containerClass?: string | object | Array<string | object>
  refreshInterval?: number
  exportFormats?: string[]
  timeRangeOptions?: Array<{ label: string; value: string }>
  chartTypes?: Array<{ label: string; value: string; icon: string }>
  legendData?: Array<{ name: string; color: string; value?: number; disabled?: boolean }>
}

// 定义属性默认值
const props = withDefaults(defineProps<ChartContainerProps>(), {
  title: '',
  subtitle: '',
  chartOption: () => ({}),
  height: '400px',
  theme: 'default',
  loading: false,
  loadingText: '加载中...',
  error: '',
  isEmpty: false,
  emptyText: '暂无数据',
  showActions: true,
  showRefresh: true,
  showExport: true,
  showFullscreen: true,
  showTimeRange: false,
  showChartTypeSwitch: false,
  showFooter: false,
  showLegend: false,
  showDataZoom: false,
  showRetry: true,
  autoresize: true,
  chartLoading: false,
  loadingOptions: () => ({}),
  initOptions: () => ({}),
  updateOptions: () => ({}),
  group: '',
  containerClass: '',
  refreshInterval: 0,
  exportFormats: () => ['png', 'jpg', 'pdf', 'svg'],
  timeRangeOptions: () => [
    { label: '近1小时', value: '1h' },
    { label: '近6小时', value: '6h' },
    { label: '近24小时', value: '24h' },
    { label: '近7天', value: '7d' },
    { label: '近30天', value: '30d' }
  ],
  chartTypes: () => [
    { label: '折线图', value: 'line', icon: 'TrendCharts' },
    { label: '柱状图', value: 'bar', icon: 'Histogram' },
    { label: '饼图', value: 'pie', icon: 'PieChart' }
  ],
  legendData: () => []
})

// 定义事件
const emit = defineEmits<{
  refresh: []
  export: [format: string]
  fullscreen: [visible: boolean]
  timeRangeChange: [value: string]
  chartTypeChange: [value: string]
  retry: []
  chartClick: [params: any]
  chartDblClick: [params: any]
  chartMouseover: [params: any]
  chartMouseout: [params: any]
  chartSelectChanged: [params: any]
  chartFinished: []
  legendClick: [item: any]
  dataZoomChange: [range: number[]]
}>()

// 响应式数据
const chartRef = ref<EChartsType>()
const refreshing = ref(false)
const fullscreenVisible = ref(false)
const selectedTimeRange = ref(props.timeRangeOptions[0]?.value || '')
const selectedChartType = ref(props.chartTypes[0]?.value || '')
const dataZoomRange = ref([0, 100])
const refreshTimer = ref<number>()

// 计算属性
const chartHeight = computed(() => {
  if (typeof props.height === 'number') {
    return `${props.height}px`
  }
  return props.height
})

// 事件处理方法
const handleRefresh = async (): Promise<void> => {
  if (refreshing.value) return

  try {
    refreshing.value = true
    emit('refresh')
  } finally {
    setTimeout(() => {
      refreshing.value = false
    }, 1000)
  }
}

const handleExport = (): void => {
  if (!chartRef.value) {
    ElMessage.warning('图表未加载完成')
    return
  }

  ElMessageBox.confirm(
    '请选择导出格式',
    '导出图表',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(() => {
    // 默认导出为PNG格式
    const dataURL = chartRef.value!.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff'
    })

    // 创建下载链接
    const link = document.createElement('a')
    link.download = `chart_${Date.now()}.png`
    link.href = dataURL
    link.click()

    emit('export', 'png')
    ElMessage.success('导出成功')
  }).catch(() => {
    // 用户取消
  })
}

const handleFullscreen = (): void => {
  fullscreenVisible.value = true
  emit('fullscreen', true)
}

const handleFullscreenClose = (): void => {
  fullscreenVisible.value = false
  emit('fullscreen', false)
}

const handleTimeRangeChange = (value: string): void => {
  emit('timeRangeChange', value)
}

const handleChartTypeChange = (value: string): void => {
  emit('chartTypeChange', value)
}

const handleRetry = (): void => {
  emit('retry')
}

// 图表事件处理
const handleChartClick = (params: any): void => {
  emit('chartClick', params)
}

const handleChartDblClick = (params: any): void => {
  emit('chartDblClick', params)
}

const handleChartMouseover = (params: any): void => {
  emit('chartMouseover', params)
}

const handleChartMouseout = (params: any): void => {
  emit('chartMouseout', params)
}

const handleChartSelectChanged = (params: any): void => {
  emit('chartSelectChanged', params)
}

const handleChartFinished = (): void => {
  emit('chartFinished')
}

const handleLegendClick = (item: any): void => {
  // 切换图例状态
  item.disabled = !item.disabled
  emit('legendClick', item)
}

const handleDataZoomChange = (range: number[]): void => {
  emit('dataZoomChange', range)
}

// 格式化图例值
const formatLegendValue = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toString()
}

// 获取图表实例
const getChartInstance = (): EChartsType | undefined => {
  return chartRef.value
}

// 刷新图表
const refreshChart = (): void => {
  nextTick(() => {
    if (chartRef.value) {
      chartRef.value.resize()
    }
  })
}

// 导出图表
const exportChart = (format: string = 'png'): string | undefined => {
  if (!chartRef.value) return

  return chartRef.value.getDataURL({
    type: format,
    pixelRatio: 2,
    backgroundColor: '#fff'
  })
}

// 设置自动刷新
const startAutoRefresh = (): void => {
  if (props.refreshInterval > 0) {
    refreshTimer.value = window.setInterval(() => {
      handleRefresh()
    }, props.refreshInterval * 1000)
  }
}

const stopAutoRefresh = (): void => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
    refreshTimer.value = undefined
  }
}

// 监听刷新间隔变化
watch(
  () => props.refreshInterval,
  (newInterval) => {
    stopAutoRefresh()
    if (newInterval > 0) {
      startAutoRefresh()
    }
  },
  { immediate: true }
)

// 生命周期
onMounted(() => {
  if (props.refreshInterval > 0) {
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})

// 暴露方法
defineExpose({
  getChartInstance,
  refreshChart,
  exportChart,
  startAutoRefresh,
  stopAutoRefresh
})
</script>

<style scoped>
.chart-container {
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.chart-container:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.chart-container__header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  background: var(--el-bg-color-page);
}

.chart-container__title-section {
  flex: 1;
  min-width: 0;
}

.chart-container__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 4px 0;
  line-height: 1.4;
}

.chart-container__subtitle {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin: 0;
  line-height: 1.4;
}

.chart-container__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  margin-left: 16px;
}

.chart-container__body {
  position: relative;
  min-height: 200px;
}

.chart-container__loading,
.chart-container__empty,
.chart-container__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--el-text-color-secondary);
  padding: 20px;
}

.chart-container__empty-icon,
.chart-container__error-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.chart-container__empty-text,
.chart-container__error-text {
  margin: 0 0 16px 0;
  text-align: center;
  line-height: 1.5;
}

.chart-container__chart {
  padding: 20px;
}

.chart {
  width: 100%;
  height: 100%;
}

.chart--fullscreen {
  height: 70vh;
}

.chart-container__footer {
  padding: 12px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color-page);
}

.chart-container__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: opacity 0.3s ease;
  font-size: 13px;
}

.legend-item--disabled {
  opacity: 0.5;
}

.legend-item__color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-item__name {
  color: var(--el-text-color-primary);
}

.legend-item__value {
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.chart-container__data-zoom {
  margin-top: 12px;
}

.chart-fullscreen-dialog {
  .el-dialog__body {
    padding: 0;
  }
}

.chart-fullscreen-container {
  padding: 20px;
}

/* 深色主题适配 */
.dark .chart-container {
  background: var(--el-bg-color-dark);
  border: 1px solid var(--el-border-color);
}

.dark .chart-container__header,
.dark .chart-container__footer {
  background: var(--el-bg-color-darker);
  border-color: var(--el-border-color);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chart-container__header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .chart-container__actions {
    margin-left: 0;
    justify-content: flex-end;
  }

  .chart-container__legend {
    justify-content: center;
  }

  .chart--fullscreen {
    height: 50vh;
  }
}

@media (max-width: 480px) {
  .chart-container__header {
    padding: 12px 16px;
  }

  .chart-container__chart {
    padding: 16px 12px;
  }

  .chart-container__footer {
    padding: 8px 16px;
  }
}
</style>