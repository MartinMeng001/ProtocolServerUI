<template>
  <div class="control-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>设备控制</span>
          <el-select
            v-model="selectedDeviceId"
            placeholder="选择设备"
            style="width: 200px;"
            filterable
          >
            <el-option
              v-for="device in onlineDevices"
              :key="device.deviceId"
              :label="device.deviceId"
              :value="device.deviceId"
            />
          </el-select>
        </div>
      </template>

      <div v-if="!selectedDeviceId" class="no-device">
        <el-empty description="请选择要控制的设备" />
      </div>

      <div v-else class="control-content">
        <!-- 设备信息 -->
        <el-row :gutter="20" class="device-info-row">
          <el-col :span="24">
            <el-alert
              :title="`当前控制设备: ${selectedDeviceId}`"
              type="info"
              :closable="false"
              show-icon
            >
              <template #default>
                <div class="device-status">
                  <span>状态: </span>
                  <el-tag :type="selectedDevice?.online ? 'success' : 'danger'">
                    {{ selectedDevice?.online ? '在线' : '离线' }}
                  </el-tag>
                  <span style="margin-left: 20px;">工作模式: </span>
                  <el-tag :type="getModeTagType(selectedDevice?.mode)">
                    {{ getModeText(selectedDevice?.mode) }}
                  </el-tag>
                  <span style="margin-left: 20px;">电池电压: </span>
                  <span :class="{ 'low-battery': selectedDevice?.batteryVoltage && selectedDevice.batteryVoltage < 20 }">
                    {{ selectedDevice?.batteryVoltage?.toFixed(1) || '--' }} V
                  </span>
                </div>
              </template>
            </el-alert>
          </el-col>
        </el-row>

        <!-- 控制面板 -->
        <el-row :gutter="20" class="control-panels">
          <!-- 设备重启 -->
          <el-col :span="8">
            <el-card class="control-card">
              <template #header>
                <div class="card-title">
                  <el-icon><Refresh /></el-icon>
                  设备重启
                </div>
              </template>

              <el-form :model="resetForm" label-width="80px">
                <el-form-item label="设备类型">
                  <el-radio-group v-model="resetForm.flag">
                    <el-radio label="A">清扫车</el-radio>
                    <el-radio label="C">摆渡车</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="重启密码">
                  <el-input
                    v-model="resetForm.code"
                    type="password"
                    placeholder="请输入密码"
                    maxlength="6"
                    show-password
                  />
                </el-form-item>
              </el-form>

              <el-button
                type="danger"
                :loading="resetLoading"
                :disabled="!selectedDevice?.online"
                @click="handleReset"
                style="width: 100%;"
              >
                <el-icon><Refresh /></el-icon>
                重启设备
              </el-button>
            </el-card>
          </el-col>

          <!-- 工作模式设置 -->
          <el-col :span="8">
            <el-card class="control-card">
              <template #header>
                <div class="card-title">
                  <el-icon><Setting /></el-icon>
                  工作模式
                </div>
              </template>

              <el-form label-width="80px">
                <el-form-item label="选择模式">
                  <el-radio-group v-model="modeForm.mode" @change="handleModeChange">
                    <el-radio :label="0">自主模式</el-radio>
                    <el-radio :label="1">本地模式</el-radio>
                    <el-radio :label="2">测试模式</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-form>

              <div class="mode-description">
                <el-text type="info" size="small">
                  {{ getModeDescription(modeForm.mode) }}
                </el-text>
              </div>
            </el-card>
          </el-col>

          <!-- 设备控制 -->
          <el-col :span="8">
            <el-card class="control-card">
              <template #header>
                <div class="card-title">
                  <el-icon><Operation /></el-icon>
                  设备控制
                </div>
              </template>

              <el-form :model="controlForm" label-width="80px">
                <el-form-item label="设备类型">
                  <el-radio-group v-model="controlForm.flag">
                    <el-radio label="A">清扫车</el-radio>
                    <el-radio label="C">摆渡车</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-form>

              <div class="control-buttons">
                <el-button
                  type="success"
                  :loading="controlLoading"
                  :disabled="!selectedDevice?.online"
                  @click="handleControl(1)"
                  style="width: 48%; margin-bottom: 10px;"
                >
                  <el-icon><CaretRight /></el-icon>
                  前进清扫
                </el-button>
                <el-button
                  type="primary"
                  :loading="controlLoading"
                  :disabled="!selectedDevice?.online"
                  @click="handleControl(2)"
                  style="width: 48%; margin-bottom: 10px; margin-left: 4%;"
                >
                  <el-icon><Back /></el-icon>
                  返回清扫
                </el-button>
                <el-button
                  type="warning"
                  :loading="controlLoading"
                  :disabled="!selectedDevice?.online"
                  @click="handleControl(3)"
                  style="width: 48%;"
                >
                  <el-icon><VideoPause /></el-icon>
                  停止
                </el-button>
                <el-button
                  type="danger"
                  :loading="controlLoading"
                  :disabled="!selectedDevice?.online"
                  @click="handleControl(4)"
                  style="width: 48%; margin-left: 4%;"
                >
                  <el-icon><Close /></el-icon>
                  急停
                </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 操作历史 -->
        <el-row class="history-row">
          <el-col :span="24">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>操作历史</span>
                  <el-button size="small" @click="clearHistory">清空历史</el-button>
                </div>
              </template>

              <el-table :data="operationHistory" style="width: 100%" max-height="300">
                <el-table-column prop="timestamp" label="时间" width="180">
                  <template #default="{ row }">
                    {{ formatDateTime(row.timestamp) }}
                  </template>
                </el-table-column>
                <el-table-column prop="deviceId" label="设备ID" width="200" />
                <el-table-column prop="operation" label="操作类型" width="120" />
                <el-table-column prop="parameters" label="参数" />
                <el-table-column prop="result" label="结果" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.success ? 'success' : 'danger'">
                      {{ row.success ? '成功' : '失败' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="message" label="消息" />
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDeviceStore } from '@/stores/device'
import { deviceControlApi } from '@/services/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { DeviceResetRequest, DeviceModeRequest, DeviceControlRequest } from '@/types'

const route = useRoute()
const deviceStore = useDeviceStore()

// 选中的设备
const selectedDeviceId = ref('')

// 表单数据
const resetForm = ref<DeviceResetRequest>({
  deviceId: '',
  flag: 'A',
  code: '111111'
})

const modeForm = ref<DeviceModeRequest>({
  deviceId: '',
  mode: 0
})

const controlForm = ref<DeviceControlRequest>({
  deviceId: '',
  flag: 'A',
  key: 3
})

// 加载状态
const resetLoading = ref(false)
const controlLoading = ref(false)

// 操作历史
const operationHistory = ref<Array<{
  timestamp: number
  deviceId: string
  operation: string
  parameters: string
  success: boolean
  message: string
}>>([])

// 计算属性
const onlineDevices = computed(() => deviceStore.onlineDevices)

const selectedDevice = computed(() =>
  deviceStore.devices.find(d => d.deviceId === selectedDeviceId.value)
)

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

const getModeDescription = (mode: number) => {
  const descriptions: Record<number, string> = {
    0: '设备按预设程序自动运行，无需人工干预',
    1: '设备需要人工操作控制，可通过控制面板操作',
    2: '设备处于测试状态，用于调试和维护'
  }
  return descriptions[mode] || ''
}

const formatDateTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const addToHistory = (operation: string, parameters: string, success: boolean, message: string) => {
  operationHistory.value.unshift({
    timestamp: Date.now(),
    deviceId: selectedDeviceId.value,
    operation,
    parameters,
    success,
    message
  })

  // 限制历史记录数量
  if (operationHistory.value.length > 100) {
    operationHistory.value = operationHistory.value.slice(0, 100)
  }
}

// 操作方法
const handleReset = async () => {
  if (!resetForm.value.code) {
    ElMessage.warning('请输入重启密码')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要重启设备 ${selectedDeviceId.value} 吗？`,
      '确认重启',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    resetLoading.value = true
    resetForm.value.deviceId = selectedDeviceId.value

    const response = await deviceControlApi.resetDevice(resetForm.value)

    if (response.success) {
      ElMessage.success(response.message)
      addToHistory('设备重启', `类型: ${resetForm.value.flag === 'A' ? '清扫车' : '摆渡车'}`, true, response.message)
    } else {
      ElMessage.error(response.message)
      addToHistory('设备重启', `类型: ${resetForm.value.flag === 'A' ? '清扫车' : '摆渡车'}`, false, response.message)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('重启设备失败:', error)
      ElMessage.error('重启设备失败')
      addToHistory('设备重启', `类型: ${resetForm.value.flag === 'A' ? '清扫车' : '摆渡车'}`, false, '操作失败')
    }
  } finally {
    resetLoading.value = false
  }
}

const handleModeChange = async (mode: number) => {
  try {
    modeForm.value.deviceId = selectedDeviceId.value
    modeForm.value.mode = mode

    const response = await deviceControlApi.setWorkMode(modeForm.value)

    if (response.success) {
      ElMessage.success(response.message)
      addToHistory('工作模式设置', `模式: ${getModeText(mode)}`, true, response.message)
    } else {
      ElMessage.error(response.message)
      addToHistory('工作模式设置', `模式: ${getModeText(mode)}`, false, response.message)
    }
  } catch (error) {
    console.error('设置工作模式失败:', error)
    ElMessage.error('设置工作模式失败')
    addToHistory('工作模式设置', `模式: ${getModeText(mode)}`, false, '操作失败')
  }
}

const handleControl = async (key: 1 | 2 | 3 | 4) => {
  const operationNames: Record<number, string> = {
    1: '前进清扫',
    2: '返回清扫',
    3: '停止',
    4: '急停'
  }

  try {
    if (key === 4) {
      await ElMessageBox.confirm(
        `确定要对设备 ${selectedDeviceId.value} 执行急停操作吗？`,
        '确认急停',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'error',
        }
      )
    }

    controlLoading.value = true
    controlForm.value.deviceId = selectedDeviceId.value
    controlForm.value.key = key

    const response = await deviceControlApi.controlDevice(controlForm.value)

    if (response.success) {
      ElMessage.success(response.message)
      addToHistory(
        '设备控制',
        `操作: ${operationNames[key]}, 类型: ${controlForm.value.flag === 'A' ? '清扫车' : '摆渡车'}`,
        true,
        response.message
      )
    } else {
      ElMessage.error(response.message)
      addToHistory(
        '设备控制',
        `操作: ${operationNames[key]}, 类型: ${controlForm.value.flag === 'A' ? '清扫车' : '摆渡车'}`,
        false,
        response.message
      )
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('控制设备失败:', error)
      ElMessage.error('控制设备失败')
      addToHistory('设备控制', `操作: ${operationNames[key]}`, false, '操作失败')
    }
  } finally {
    controlLoading.value = false
  }
}

const clearHistory = () => {
  operationHistory.value = []
  ElMessage.success('操作历史已清空')
}

// 监听选中设备变化
watch(() => selectedDeviceId.value, (newDeviceId) => {
  if (newDeviceId) {
    resetForm.value.deviceId = newDeviceId
    modeForm.value.deviceId = newDeviceId
    controlForm.value.deviceId = newDeviceId

    // 同步当前设备的工作模式
    const device = selectedDevice.value
    if (device && device.mode !== undefined) {
      modeForm.value.mode = device.mode
    }
  }
})

onMounted(() => {
  // 从路由参数获取设备ID
  const deviceIdFromQuery = route.query.deviceId as string
  if (deviceIdFromQuery) {
    selectedDeviceId.value = deviceIdFromQuery
  }

  // 确保设备数据已加载
  if (!deviceStore.devices.length) {
    deviceStore.refreshData()
  }
})
</script>

<style scoped>
.control-page {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.no-device {
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.device-info-row {
  margin-bottom: 0;
}

.device-status {
  display: flex;
  align-items: center;
}

.control-panels {
  margin-bottom: 0;
}

.control-card {
  height: 300px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
}

.control-buttons {
  margin-top: 20px;
}

.mode-description {
  margin-top: 15px;
  padding: 10px;
  background-color: #f0f2f5;
  border-radius: 4px;
}

.history-row {
  margin-bottom: 0;
}

.low-battery {
  color: #f56c6c;
  font-weight: bold;
}

:deep(.el-card__body) {
  height: calc(100% - 57px);
  display: flex;
  flex-direction: column;
}

:deep(.el-form) {
  flex: 1;
}

:deep(.el-alert__content) {
  width: 100%;
}

.control-buttons .el-button {
  font-size: 14px;
}

.control-buttons .el-button .el-icon {
  margin-right: 4px;
}
</style>