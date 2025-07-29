<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon total">
              <el-icon><Monitor /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ deviceStore.deviceCount }}</div>
              <div class="stat-label">设备总数</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon online">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ deviceStore.onlineDevices.length }}</div>
              <div class="stat-label">在线设备</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon offline">
              <el-icon><CircleClose /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ deviceStore.offlineDevices.length }}</div>
              <div class="stat-label">离线设备</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon connection">
              <el-icon><Connection /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ deviceStore.connectionCount }}</div>
              <div class="stat-label">活跃连接</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card title="设备状态分布">
          <template #header>
            <span>设备状态分布</span>
          </template>
          <v-chart
            class="chart"
            :option="deviceStatusChartOption"
            autoresize
          />
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card title="工作模式统计">
          <template #header>
            <span>工作模式统计</span>
          </template>
          <v-chart
            class="chart"
            :option="workModeChartOption"
            autoresize
          />
        </el-card>
      </el-col>
    </el-row>

    <!-- 设备列表 -->
    <el-row class="device-list-row">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最近活跃设备</span>
              <el-button type="primary" @click="$router.push('/devices')">
                查看全部
              </el-button>
            </div>
          </template>

          <el-table
            :data="recentActiveDevices"
            style="width: 100%"
            v-loading="deviceStore.loading"
          >
            <el-table-column prop="deviceId" label="设备ID" width="200" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.online ? 'success' : 'danger'">
                  {{ row.online ? '在线' : '离线' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="工作模式" width="120">
              <template #default="{ row }">
                <span>{{ getModeText(row.mode) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="batteryVoltage" label="电池电压(V)" width="120">
              <template #default="{ row }">
                <span :class="{ 'low-battery': row.batteryVoltage < 20 }">
                  {{ row.batteryVoltage?.toFixed(1) || '--' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="GPS状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.gpsStatus === 'A' ? 'success' : 'warning'">
                  {{ row.gpsStatus === 'A' ? '已定位' : '未定位' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="remoteAddress" label="远程地址" />
            <el-table-column label="最后心跳" width="180">
              <template #default="{ row }">
                {{ formatTime(row.lastHeartbeat) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  size="small"
                  @click="$router.push(`/device/${row.deviceId}`)"
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
import { computed, onMounted, ref } from 'vue'
import { useDeviceStore } from '@/stores/device'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const deviceStore = useDeviceStore()

// 最近活跃设备 (最多显示10个)
const recentActiveDevices = computed(() => {
  return deviceStore.devices
    .filter(device => device.online)
    .sort((a, b) => b.lastHeartbeat - a.lastHeartbeat)
    .slice(0, 10)
})

// 设备状态分布图表配置
const deviceStatusChartOption = computed(() => ({
  tooltip: {
    trigger: 'item'
  },
  series: [
    {
      name: '设备状态',
      type: 'pie',
      radius: '70%',
      data: [
        { value: deviceStore.onlineDevices.length, name: '在线设备' },
        { value: deviceStore.offlineDevices.length, name: '离线设备' }
      ],
      itemStyle: {
        color: (params: any) => {
          const colors = ['#67c23a', '#f56c6c']
          return colors[params.dataIndex]
        }
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }
  ]
}))

// 工作模式统计图表配置
const workModeChartOption = computed(() => {
  const modeStats = deviceStore.statistics?.modeStatistics || {}

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    xAxis: {
      type: 'category',
      data: ['自主模式', '本地模式', '测试模式']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '设备数量',
        type: 'bar',
        data: [
          modeStats[0] || 0,
          modeStats[1] || 0,
          modeStats[2] || 0
        ],
        itemStyle: {
          color: '#409eff'
        }
      }
    ]
  }
})

// 工具函数
const getModeText = (mode: number | undefined) => {
  const modeMap: Record<number, string> = {
    0: '自主模式',
    1: '本地模式',
    2: '测试模式'
  }
  return mode !== undefined ? modeMap[mode] || '未知' : '--'
}

const formatTime = (timestamp: number) => {
  if (!timestamp) return '--'
  return formatDistanceToNow(new Date(timestamp), {
    addSuffix: true,
    locale: zhCN
  })
}

onMounted(() => {
  // 定时刷新数据
  const interval = setInterval(() => {
    deviceStore.refreshData()
  }, 10000) // 10秒刷新一次

  // 组件卸载时清除定时器
  onBeforeUnmount(() => {
    clearInterval(interval)
  })
})
</script>

<style scoped>
.dashboard {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-row {
  margin-bottom: 0;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
  color: white;
}

.stat-icon.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.online {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.offline {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.connection {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.chart-row {
  margin-bottom: 0;
}

.chart {
  height: 300px;
  width: 100%;
}

.device-list-row {
  flex: 1;
  margin-bottom: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.low-battery {
  color: #f56c6c;
  font-weight: bold;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-table) {
  background-color: transparent;
}
</style>