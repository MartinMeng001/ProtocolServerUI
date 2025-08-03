<template>
  <div class="device-detail">
    <el-page-header @back="$router.go(-1)">
      <template #content>
        <span class="text-large font-600 mr-3">设备详情 - {{ deviceId }}</span>
        <el-tag :type="deviceInfo?.online ? 'success' : 'danger'">
          {{ deviceInfo?.online ? '在线' : '离线' }}
        </el-tag>
      </template>
    </el-page-header>

    <div class="detail-content" v-loading="loading">
      <!-- 基本信息 -->
      <el-row :gutter="20" class="info-row">
        <el-col :span="12">
          <el-card title="基本信息">
            <template #header>
              <span>基本信息</span>
              <el-button
                type="primary"
                size="small"
                @click="querySystemStatus"
                :disabled="!deviceInfo?.online"
                style="float: right;"
              >
                刷新状态
              </el-button>
            </template>

            <el-descriptions :column="1" border>
              <el-descriptions-item label="设备ID">
                {{ deviceData?.ID || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="工作模式">
                <el-tag :type="getModeTagType(deviceData?.Mode)">
                  {{ getModeText(deviceData?.Mode) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="连接ID">
                {{ deviceInfo?.connectionId || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="远程地址">
                {{ deviceInfo?.remoteAddress || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="最后心跳">
                {{ formatTime(deviceInfo?.lastHeartbeat) }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card title="电源状态">
            <template #header>
              <span>电源状态</span>
            </template>

            <el-descriptions :column="1" border>
              <el-descriptions-item label="小车电池电压">
                <span :class="{ 'low-voltage': deviceData?.V && deviceData.V < 20 }">
                  {{ deviceData?.V?.toFixed(1) || '--' }} V
                  <el-icon v-if="deviceData?.V && deviceData.V < 20">
                    <Warning />
                  </el-icon>
                </span>
              </el-descriptions-item>
              <el-descriptions-item label="摆渡车电池电压">
                <span :class="{ 'low-voltage': deviceData?.V0 && deviceData.V0 < 20 }">
                  {{ deviceData?.V0?.toFixed(1) || '--' }} V
                  <el-icon v-if="deviceData?.V0 && deviceData.V0 < 20">
                    <Warning />
                  </el-icon>
                </span>
              </el-descriptions-item>
              <el-descriptions-item label="电压告警">
                <el-tag :type="getVoltageAlertType()">
                  {{ getVoltageAlertText() }}
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
      </el-row>

      <!-- 电机状态 -->
      <el-row :gutter="20" class="info-row">
        <el-col :span="24">
          <el-card title="电机状态">
            <el-table :data="motorData" style="width: 100%">
              <el-table-column prop="name" label="电机名称" width="150" />
              <el-table-column label="工作状态" width="120">
                <template #default="{ row }">
                  <el-tag :type="getMotorStatusType(row.status)">
                    {{ getMotorStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="转动方向" width="120">
                <template #default="{ row }">
                  {{ row.direction === 0 ? '顺时针' : '逆时针' }}
                </template>
              </el-table-column>
              <el-table-column label="电流值(A)" width="120">
                <template #default="{ row }">
                  {{ row.current?.toFixed(1) || '--' }}
                </template>
              </el-table-column>
              <el-table-column label="电流警示" width="120">
                <template #default="{ row }">
                  <el-tag :type="getCurrentAlertType(row.currentAlert)">
                    {{ getCurrentAlertText(row.currentAlert) }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>
      </el-row>

      <!-- 温度和GPS -->
      <el-row :gutter="20" class="info-row">
        <el-col :span="12">
          <el-card title="温度监控">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="温度1">
                {{ deviceData?.T1?.toFixed(1) || '--' }} °C
              </el-descriptions-item>
              <el-descriptions-item label="温度2">
                {{ deviceData?.T2?.toFixed(1) || '--' }} °C
              </el-descriptions-item>
              <el-descriptions-item label="小车功率件温度">
                <span :class="{ 'high-temp': deviceData?.Ta === 2 }">
                  {{ deviceData?.Ta === 0 ? '正常' : (deviceData?.Ta === 2 ? '过高' : '--') }}
                  <el-icon v-if="deviceData?.Ta === 2">
                    <Warning />
                  </el-icon>
                </span>
              </el-descriptions-item>
              <el-descriptions-item label="摆渡车功率件温度">
                <span :class="{ 'high-temp': deviceData?.T0a === 2 }">
                  {{ deviceData?.T0a === 0 ? '正常' : (deviceData?.T0a === 2 ? '过高' : '--') }}
                  <el-icon v-if="deviceData?.T0a === 2">
                    <Warning />
                  </el-icon>
                </span>
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card title="GPS定位">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="定位状态">
                <el-tag :type="deviceData?.status === 'A' ? 'success' : 'warning'">
                  <el-icon style="margin-right: 4px;">
                    <Location v-if="deviceData?.status === 'A'" />
                    <LocationInformation v-else />
                  </el-icon>
                  {{ deviceData?.status === 'A' ? '已定位' : '未定位' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="纬度">
                {{ deviceData?.lat || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="经度">
                {{ deviceData?.lon || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="速度">
                {{ deviceData?.spd || '--' }} km/h
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
      </el-row>

      <!-- 系统信息 -->
      <el-row :gutter="20" class="info-row">
        <el-col :span="24">
          <el-card title="系统信息">
            <template #header>
              <span>系统信息</span>
              <div style="float: right;">
                <el-button
                  type="primary"
                  size="small"
                  @click="querySystemSettings"
                  :disabled="!deviceInfo?.online"
                >
                  查询设置
                </el-button>
                <el-button
                  type="success"
                  size="small"
                  @click="querySystemTime"
                  :disabled="!deviceInfo?.online"
                  style="margin-left: 10px;"
                >
                  查询时间
                </el-button>
              </div>
            </template>

            <el-descriptions :column="3" border>
              <el-descriptions-item label="通道">
                {{ deviceData?.channel || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="MAC1">
                {{ deviceData?.mac1 || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="MAC2">
                {{ deviceData?.mac2 || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="距离">
                {{ deviceData?.distance || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="命令">
                {{ deviceData?.CMD || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="类别">
                {{ deviceData?.class || '--' }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
      </el-row>

      <!-- 操作按钮 -->
      <el-row class="action-row">
        <el-col :span="24">
          <el-card>
            <template #header>
              <span>设备操作</span>
            </template>

            <div class="action-buttons">
              <el-button
                type="primary"
                @click="$router.push({ path: '/control', query: { deviceId } })"
                :disabled="!deviceInfo?.online"
              >
                <el-icon><Operation /></el-icon>
                设备控制
              </el-button>
              <el-button
                type="success"
                @click="$router.push({ path: '/config', query: { deviceId } })"
                :disabled="!deviceInfo?.online"
              >
                <el-icon><Setting /></el-icon>
                设备配置
              </el-button>
              <el-button
                type="warning"
                @click="refreshData"
              >
                <el-icon><Refresh /></el-icon>
                刷新数据
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDeviceStore } from '@/stores/device'
import { deviceApi } from '@/services/api'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ElMessage } from 'element-plus'
import type { DeviceData, DeviceInfo } from '@/types'

const props = defineProps<{
  id: string
}>()

const route = useRoute()
const deviceStore = useDeviceStore()

//const deviceId = computed(() => props.id || route.params.id as string)
const deviceId = computed(() => route.params.deviceId as string)
const loading = ref(false)
const deviceData = ref<DeviceData | null>(null)

// 从store中获取设备基本信息
const deviceInfo = computed(() =>
  deviceStore.devices.find(d => d.deviceId === deviceId.value)
)

// 电机数据
const motorData = computed(() => {
  if (!deviceData.value) return []

  return [
    {
      name: '摆渡车电机',
      status: deviceData.value.W0,
      direction: deviceData.value.D0,
      current: deviceData.value.C0,
      currentAlert: deviceData.value.C0a
    },
    {
      name: '清扫电机',
      status: deviceData.value.W1,
      direction: deviceData.value.D1,
      current: deviceData.value.C1,
      currentAlert: deviceData.value.C1a
    },
    {
      name: '行进电机',
      status: deviceData.value.W2,
      direction: deviceData.value.D2,
      current: deviceData.value.C2,
      currentAlert: deviceData.value.C2a
    }
  ]
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

const getModeTagType = (mode: number | undefined) => {
  const typeMap: Record<number, string> = {
    0: 'success',
    1: 'warning',
    2: 'info'
  }
  return mode !== undefined ? typeMap[mode] || '' : ''
}

const getMotorStatusText = (status: number | undefined) => {
  const statusMap: Record<number, string> = {
    0: '停止',
    1: '运行中',
    2: '故障'
  }
  return status !== undefined ? statusMap[status] || '未知' : '--'
}

const getMotorStatusType = (status: number | undefined) => {
  const typeMap: Record<number, string> = {
    0: 'info',
    1: 'success',
    2: 'danger'
  }
  return status !== undefined ? typeMap[status] || '' : ''
}

const getCurrentAlertText = (alert: number | undefined) => {
  const alertMap: Record<number, string> = {
    0: '正常',
    1: '堵转',
    2: '空转'
  }
  return alert !== undefined ? alertMap[alert] || '未知' : '--'
}

const getCurrentAlertType = (alert: number | undefined) => {
  const typeMap: Record<number, string> = {
    0: 'success',
    1: 'danger',
    2: 'warning'
  }
  return alert !== undefined ? typeMap[alert] || '' : ''
}

const getVoltageAlertText = () => {
  const lowV = deviceData.value?.V && deviceData.value.V < 20
  const lowV0 = deviceData.value?.V0 && deviceData.value.V0 < 20

  if (lowV && lowV0) return '双路电压过低'
  if (lowV) return '小车电压过低'
  if (lowV0) return '摆渡车电压过低'
  return '电压正常'
}

const getVoltageAlertType = () => {
  const lowV = deviceData.value?.V && deviceData.value.V < 20
  const lowV0 = deviceData.value?.V0 && deviceData.value.V0 < 20

  if (lowV || lowV0) return 'danger'
  return 'success'
}

const formatTime = (timestamp: number | undefined) => {
  if (!timestamp) return '--'
  return formatDistanceToNow(new Date(timestamp), {
    addSuffix: true,
    locale: zhCN
  })
}

// API调用方法
const fetchDeviceData = async () => {
  if (!deviceId.value) return

  try {
    loading.value = true
    const response = await deviceApi.getDeviceInfo(deviceId.value)
    if (response.success) {
      deviceData.value = response.data
    } else {
      ElMessage.error('获取设备详情失败: ' + response.message)
    }
  } catch (error) {
    console.error('获取设备详情失败:', error)
    ElMessage.error('获取设备详情失败')
  } finally {
    loading.value = false
  }
}

const querySystemStatus = async () => {
  try {
    const response = await deviceApi.querySystemStatus(deviceId.value)
    if (response.success) {
      ElMessage.success('查询指令已发送')
      // 延迟刷新数据
      setTimeout(() => {
        fetchDeviceData()
      }, 1000)
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('查询系统状态失败:', error)
    ElMessage.error('查询系统状态失败')
  }
}

const querySystemSettings = async () => {
  try {
    const response = await deviceApi.querySystemSettings(deviceId.value)
    if (response.success) {
      ElMessage.success('查询指令已发送')
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('查询系统设置失败:', error)
    ElMessage.error('查询系统设置失败')
  }
}

const querySystemTime = async () => {
  try {
    const response = await deviceApi.querySystemTime(deviceId.value)
    if (response.success) {
      ElMessage.success('查询指令已发送')
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('查询系统时间失败:', error)
    ElMessage.error('查询系统时间失败')
  }
}

const refreshData = () => {
  fetchDeviceData()
  deviceStore.refreshData()
  ElMessage.success('数据已刷新')
}

// 监听设备ID变化
watch(() => deviceId.value, (newId) => {
  console.log("new id="+deviceId.value)
  if (newId) {
    fetchDeviceData()
  }
}, { immediate: true })

onMounted(() => {
  console.log(deviceId.value)
  if (!deviceStore.devices.length) {
    deviceStore.refreshData()
  }
})
</script>

<style scoped>
.device-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-content {
  flex: 1;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-row {
  margin-bottom: 0;
}

.action-row {
  margin-bottom: 0;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.low-voltage {
  color: #f56c6c;
  font-weight: bold;
}

.high-temp {
  color: #f56c6c;
  font-weight: bold;
}

:deep(.el-page-header__content) {
  display: flex;
  align-items: center;
}

:deep(.el-descriptions__body) {
  background-color: #fafafa;
}

:deep(.el-card__header) {
  background-color: #f5f7fa;
  font-weight: bold;
}
</style>