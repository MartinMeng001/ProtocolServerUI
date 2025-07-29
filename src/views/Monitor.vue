<template>
  <div class="monitor-page">
    <!-- 统计概览 -->
    <el-row :gutter="20" class="overview-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic
            title="设备总数"
            :value="statistics?.totalDevices || 0"
            :loading="loading"
          >
            <template #prefix>
              <el-icon color="#409eff"><Monitor /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic
            title="在线设备"
            :value="statistics?.onlineDevices || 0"
            :loading="loading"
          >
            <template #prefix>
              <el-icon color="#67c23a"><CircleCheck /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic
            title="离线设备"
            :value="statistics?.offlineDevices || 0"
            :loading="loading"
          >
            <template #prefix>
              <el-icon color="#f56c6c"><CircleClose /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic
            title="告警设备"
            :value="alertDeviceCount"
            :loading="loading"
          >
            <template #prefix>
              <el-icon color="#e6a23c"><Warning /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>设备状态趋势</span>
              <el-button size="small" @click="refreshData">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
          </template>
          <v-chart
            class="chart"
            :option="statusTrendOption"
            autoresize
          />
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card>
          <template #header>
            <span>工作模式分布</span>
          </template>
          <v-chart
            class="chart"
            :option="modeDistributionOption"
            autoresize
          />
        </el-card>
      </el-col>
    </el-row>

    <!-- 告警信息 -->
    <el-row :gutter="20" class="alert-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>低电压告警</span>
              <el-badge :value="alerts?.lowBatteryDevices?.length || 0" />
            </div>
          </template>

          <div v-if="!alerts?.lowBatteryDevices?.length" class="no-alerts">
            <el-empty description="暂无低电压告警" />
          </div>

          <div v-else class="alert-list">
            <el-alert
              v-for="deviceId in alerts.lowBatteryDevices"
              :key="deviceId"
              :title="`设备 ${deviceId} 电池电压过低`"
              type="warning"
              :closable="false"
              style="margin-bottom: 10px;"
            >
              <template #default>
                <div class="alert-content">
                  <span>设备ID: {{ deviceId }}</span>
                  <el-button
                    size="small"
                    type="primary"
                    @click="viewDevice(deviceId)"
                  >
                    查看详情
                  </el-button>
                </div>
              </template>
            </el-alert>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>GPS定位异常</span>
              <el-badge :value="alerts?.gpsErrorDevices?.length || 0" />
            </div>
          </template>

          <div v-if="!alerts?.gpsErrorDevices?.length" class="no-alerts">
            <el-empty description="暂无GPS定位异常" />
          </div>

          <div v-else class="alert-list">
            <el-alert
              v-for="deviceId in alerts.gpsErrorDevices"
              :key="deviceId"
              :title="`设备 ${deviceId} GPS未定位`"
              type="error"
              :closable="false"
              style="margin-bottom: 10px;"
            >
              <template #default>
                <div class="alert-content">
                  <span>设备ID: {{ deviceId }}</span>
                  <el-button
                    size="small"
                    type="primary"
                    @click="viewDevice(deviceId)"
                  >
                    查看详情
                  </el-button>
                </div>
              </template>
            </el-alert>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 设备健康状态 -->
    <el-row class="health-row">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>设备健康状态</span>
              <div>
                <el-button
                  size="small"
                  @click="checkHeartbeat"
                  :loading="heartbeatLoading"
                >
                  <el-icon><Cpu /></el-icon>
                  触发心跳检查
                </el-button>
                <el-button size="small" @click="exportHealthReport">
                  <el-icon><Download /></el-icon>
                  导出报告
                </el-button>
              </div>
            </div>
          </template>

          <el-table
            :data="healthDevices"
            style="width: 100%"
            :loading="loading"
          >
            <el-table-column prop="deviceId" label="设备ID" width="200" />

            <el-table-column label="在线状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.online ? 'success' : 'danger'">
                  {{ row.online ? '在线' : '离线' }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column label="电池状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getBatteryStatusType(row.batteryVoltage)">
                  {{ getBatteryStatusText(row.batteryVoltage) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="batteryVoltage" label="电池电压(V)" width="120">
              <template #default="{ row }">
                <span :class="{ 'low-battery': row.batteryVoltage && row.batteryVoltage < 20 }">
                  {{ row.batteryVoltage?.toFixed(1) || '--' }}
                </span>
              </template>
            </el-table-column>

            <el-table-column label="GPS状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.gpsStatus === 'A' ? 'success' : 'warning'">
                  {{ row.gpsStatus === 'A' ? '正常' : '异常' }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column label="心跳状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getHeartbeatStatusType(row.lastHeartbeat)">
                  {{ getHeartbeatStatusText(row.lastHeartbeat) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column label="最后心跳" width="180">
              <template #default="{ row }">
                {{ formatTime(row.lastHeartbeat) }}
              </template>
            </el-table-column>

            <el-table-column label="健康评分" width="120">
              <template #default="{ row }">
                <el-progress
                  :percentage="calculateHealthScore(row)"
                  :color="getHealthColor(calculateHealthScore(row))"
                  :stroke-width="8"
                />
              </template>
            </el-table-column>

            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  size="small"
                  @click="viewDevice(row.deviceId)"
                >
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useDeviceStore } from '@/stores/device'
import { monitorApi } from '@/services/api'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ElMessage } from 'element-plus'
import type { DeviceStatistics, DeviceAlerts, DeviceInfo } from '@/types'

const router = useRouter()
const deviceStore = useDeviceStore()

// 状态
const loading = ref(false)
const heartbeatLoading = ref(false)
const statistics = ref<DeviceStatistics | null>(null)
const alerts = ref<DeviceAlerts | null>(null)
const refreshTimer = ref<NodeJS.Timeout>()

// 计算属性
const alertDeviceCount = computed(() => {
  const lowBatteryCount = alerts.value?.lowBatteryDevices?.length || 0
  const gpsErrorCount = alerts.value?.gpsErrorDevices?.length || 0
  return lowBatteryCount + gpsErrorCount
})

const healthDevices = computed(() => {
  return deviceStore.devices.map(device => ({
    ...device,
    healthScore: calculateHealthScore(device)
  })).sort((a, b) => a.healthScore - b.healthScore)
})

// 图表配置
const statusTrendOption = computed(() => {
  // 模拟趋势数据
  const hours = []
  const onlineData = []
  const offlineData = []

  for (let i = 23; i >= 0; i--) {
    const hour = new Date()
    hour.setHours(hour.getHours() - i)
    hours.push(hour.getHours() + ':00')

    // 模拟数据，实际应用中应该从后端获取
    onlineData.push(Math.floor(Math.random() * 10) + (statistics.value?.onlineDevices || 0))
    offlineData.push(Math.floor(Math.random() * 5) + (statistics.value?.offlineDevices || 0))
  }

  return {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['在线设备', '离线设备']
    },
    xAxis: {
      type: 'category',
      data: hours
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '在线设备',
        type: 'line',
        data: onlineData,
        itemStyle: { color: '#67c23a' }
      },
      {
        name: '离线设备',
        type: 'line',
        data: offlineData,
        itemStyle: { color: '#f56c6c' }
      }
    ]
  }
})

const modeDistributionOption = computed(() => {
  const modeStats = statistics.value?.modeStatistics || {}

  return {
    tooltip: {
      trigger: 'item'
    },
    series: [
      {
        name: '工作模式',
        type: 'pie',
        radius: '70%',
        data: [
          { value: modeStats[0] || 0, name: '自主模式' },
          { value: modeStats[1] || 0, name: '本地模式' },
          { value: modeStats[2] || 0, name: '测试模式' }
        ],
        itemStyle: {
          color: (params: any) => {
            const colors = ['#409eff', '#e6a23c', '#909399']
            return colors[params.dataIndex]
          }
        }
      }
    ]
  }
})

// 工具函数
const formatTime = (timestamp: number | undefined) => {
  if (!timestamp) return '--'
  return formatDistanceToNow(new Date(timestamp), {
    addSuffix: true,
    locale: zhCN
  })
}

const getBatteryStatusType = (voltage: number | undefined) => {
  if (!voltage) return ''
  if (voltage < 20) return 'danger'
  if (voltage < 22) return 'warning'
  return 'success'
}

const getBatteryStatusText = (voltage: number | undefined) => {
  if (!voltage) return '未知'
  if (voltage < 20) return '低电压'
  if (voltage < 22) return '电压偏低'
  return '正常'
}

const getHeartbeatStatusType = (timestamp: number | undefined) => {
  if (!timestamp) return 'info'
  const now = Date.now()
  const diff = now - timestamp
  if (diff > 5 * 60 * 1000) return 'danger' // 5分钟
  if (diff > 2 * 60 * 1000) return 'warning' // 2分钟
  return 'success'
}

const getHeartbeatStatusText = (timestamp: number | undefined) => {
  if (!timestamp) return '无心跳'
  const now = Date.now()
  const diff = now - timestamp
  if (diff > 5 * 60 * 1000) return '心跳超时'
  if (diff > 2 * 60 * 1000) return '心跳延迟'
  return '正常'
}

const calculateHealthScore = (device: DeviceInfo) => {
  let score = 100

  // 在线状态 (40分)
  if (!device.online) score -= 40

  // 电池状态 (30分)
  if (device.batteryVoltage) {
    if (device.batteryVoltage < 20) score -= 30
    else if (device.batteryVoltage < 22) score -= 15
  } else {
    score -= 20 // 无电压数据
  }

  // GPS状态 (20分)
  if (device.gpsStatus !== 'A') score -= 20

  // 心跳状态 (10分)
  if (device.lastHeartbeat) {
    const now = Date.now()
    const diff = now - device.lastHeartbeat
    if (diff > 5 * 60 * 1000) score -= 10
    else if (diff > 2 * 60 * 1000) score -= 5
  } else {
    score -= 10
  }

  return Math.max(0, score)
}

const getHealthColor = (score: number) => {
  if (score >= 80) return '#67c23a'
  if (score >= 60) return '#e6a23c'
  return '#f56c6c'
}

// 操作方法
const refreshData = async () => {
  loading.value = true
  try {
    const [statsResponse, alertsResponse] = await Promise.all([
      monitorApi.getDeviceStatistics(),
      monitorApi.getDeviceAlerts()
    ])

    if (statsResponse.success) {
      statistics.value = statsResponse.data
    }

    if (alertsResponse.success) {
      alerts.value = alertsResponse.data
    }

    await deviceStore.refreshData()
    ElMessage.success('监控数据已刷新')
  } catch (error) {
    console.error('刷新监控数据失败:', error)
    ElMessage.error('刷新监控数据失败')
  } finally {
    loading.value = false
  }
}

const checkHeartbeat = async () => {
  try {
    heartbeatLoading.value = true
    const response = await monitorApi.checkHeartbeat()

    if (response.success) {
      ElMessage.success('心跳检查已触发')
      // 延迟刷新数据
      setTimeout(refreshData, 2000)
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('触发心跳检查失败:', error)
    ElMessage.error('触发心跳检查失败')
  } finally {
    heartbeatLoading.value = false
  }
}

const exportHealthReport = () => {
  // 生成健康报告数据
  const reportData = healthDevices.value.map(device => ({
    设备ID: device.deviceId,
    在线状态: device.online ? '在线' : '离线',
    电池电压: device.batteryVoltage?.toFixed(1) || '--',
    GPS状态: device.gpsStatus === 'A' ? '正常' : '异常',
    健康评分: device.healthScore,
    最后心跳: formatTime(device.lastHeartbeat)
  }))

  // 转换为CSV格式
  const headers = Object.keys(reportData[0] || {})
  const csvContent = [
    headers.join(','),
    ...reportData.map(row =>
      headers.map(header => row[header as keyof typeof row]).join(',')
    )
  ].join('\n')

  // 下载文件
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `设备健康报告_${new Date().toISOString().slice(0, 10)}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  ElMessage.success('健康报告已导出')
}

const viewDevice = (deviceId: string) => {
  router.push(`/device/${deviceId}`)
}

onMounted(() => {
  refreshData()

  // 设置定时刷新
  refreshTimer.value = setInterval(() => {
    refreshData()
  }, 30000) // 30秒刷新一次
})

onBeforeUnmount(() => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
  }
})
</script>

<style scoped>
.monitor-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.overview-row {
  margin-bottom: 0;
}

.stat-card {
  text-align: center;
}

.chart-row {
  margin-bottom: 0;
}

.chart {
  height: 300px;
  width: 100%;
}

.alert-row {
  margin-bottom: 0;
}

.health-row {
  flex: 1;
  margin-bottom: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.no-alerts {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-list {
  max-height: 300px;
  overflow-y: auto;
}

.alert-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.low-battery {
  color: #f56c6c;
  font-weight: bold;
}

:deep(.el-statistic__content) {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.el-statistic__number) {
  font-size: 28px;
  font-weight: bold;
  margin-left: 8px;
}

:deep(.el-progress__text) {
  font-size: 12px !important;
}

:deep(.el-table) {
  background-color: transparent;
}

:deep(.el-card__body) {
  padding: 20px;
}
</style>