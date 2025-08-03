<template>
  <div class="devices-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>设备管理</span>
          <div class="header-actions">
            <el-input
              v-model="searchText"
              placeholder="搜索设备ID"
              style="width: 200px; margin-right: 10px;"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select
              v-model="statusFilter"
              placeholder="状态筛选"
              style="width: 120px; margin-right: 10px;"
              clearable
            >
              <el-option label="全部" value="" />
              <el-option label="在线" value="online" />
              <el-option label="离线" value="offline" />
            </el-select>
            <el-select
              v-model="modeFilter"
              placeholder="模式筛选"
              style="width: 120px; margin-right: 10px;"
              clearable
            >
              <el-option label="全部" value="" />
              <el-option label="自主模式" :value="0" />
              <el-option label="本地模式" :value="1" />
              <el-option label="测试模式" :value="2" />
            </el-select>
            <el-button type="primary" @click="refreshData">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="filteredDevices"
        style="width: 100%"
        v-loading="deviceStore.loading"
        row-key="deviceId"
      >
        <el-table-column prop="deviceId" label="设备ID" width="200" fixed="left">
          <template #default="{ row }">
            <el-link
              type="primary"
              @click="$router.push(`/device/${row.deviceId}`)"
            >
              {{ row.deviceId }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.online ? 'success' : 'danger'">
              <el-icon style="margin-right: 4px;">
                <CircleCheck v-if="row.online" />
                <CircleClose v-else />
              </el-icon>
              {{ row.online ? '在线' : '离线' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="工作模式" width="120">
          <template #default="{ row }">
            <el-tag :type="getModeTagType(row.mode)">
              {{ getModeText(row.mode) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="batteryVoltage" label="电池电压(V)" width="120">
          <template #default="{ row }">
            <span
              :class="{
                'low-battery': row.batteryVoltage && row.batteryVoltage < 20,
                'normal-battery': row.batteryVoltage && row.batteryVoltage >= 20
              }"
            >
              <el-icon v-if="row.batteryVoltage && row.batteryVoltage < 20">
                <Warning />
              </el-icon>
              {{ row.batteryVoltage?.toFixed(1) || '--' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="GPS状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.gpsStatus === 'A' ? 'success' : 'warning'">
              <el-icon style="margin-right: 4px;">
                <Location v-if="row.gpsStatus === 'A'" />
                <LocationInformation v-else />
              </el-icon>
              {{ row.gpsStatus === 'A' ? '已定位' : '未定位' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="latitude" label="纬度" width="120">
          <template #default="{ row }">
            {{ row.latitude || '--' }}
          </template>
        </el-table-column>

        <el-table-column prop="longitude" label="经度" width="120">
          <template #default="{ row }">
            {{ row.longitude || '--' }}
          </template>
        </el-table-column>

        <el-table-column prop="remoteAddress" label="远程地址" width="150" />

        <el-table-column prop="connectionId" label="连接ID" width="120" />

        <el-table-column label="最后心跳" width="180">
          <template #default="{ row }">
            <span :class="{ 'overdue-heartbeat': isHeartbeatOverdue(row.lastHeartbeat) }">
              <el-icon v-if="isHeartbeatOverdue(row.lastHeartbeat)">
                <Clock />
              </el-icon>
              {{ formatTime(row.lastHeartbeat) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                type="primary"
                size="small"
                @click="viewDetail(row.deviceId)"
              >
                详情
              </el-button>
              <el-button
                type="success"
                size="small"
                :disabled="!row.online"
                @click="controlDevice(row.deviceId)"
              >
                控制
              </el-button>
              <el-button
                type="warning"
                size="small"
                :disabled="!row.online"
                @click="configDevice(row.deviceId)"
              >
                配置
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredDevices.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </el-card>

    <!-- 快速控制弹窗 -->
    <el-dialog
      v-model="controlDialogVisible"
      title="设备控制"
      width="400px"
    >
      <el-form :model="controlForm" label-width="100px">
        <el-form-item label="设备ID">
          <el-input v-model="controlForm.deviceId" readonly />
        </el-form-item>
        <el-form-item label="设备类型">
          <el-radio-group v-model="controlForm.flag">
            <el-radio label="A">清扫车</el-radio>
            <el-radio label="C">摆渡车</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="控制操作">
          <el-radio-group v-model="controlForm.key">
            <el-radio :label="1">前进清扫</el-radio>
            <el-radio :label="2">返回清扫</el-radio>
            <el-radio :label="3">停止</el-radio>
            <el-radio :label="4">急停</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="controlDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitControl">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDeviceStore } from '@/stores/device'
import { deviceControlApi } from '@/services/api'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ElMessage } from 'element-plus'
import type { DeviceControlRequest } from '@/types'

const router = useRouter()
const deviceStore = useDeviceStore()

// 搜索和筛选
const searchText = ref('')
const statusFilter = ref('')
const modeFilter = ref<number | ''>('')

// 分页
const currentPage = ref(1)
const pageSize = ref(20)

// 控制弹窗
const controlDialogVisible = ref(false)
const controlForm = ref<DeviceControlRequest>({
  deviceId: '',
  flag: 'A',
  key: 3
})

// 过滤后的设备列表
const filteredDevices = computed(() => {
  let devices = deviceStore.devices

  // 搜索过滤
  if (searchText.value) {
    devices = devices.filter(device =>
      device.deviceId.toLowerCase().includes(searchText.value.toLowerCase())
    )
  }

  // 状态过滤
  if (statusFilter.value) {
    devices = devices.filter(device => {
      if (statusFilter.value === 'online') return device.online
      if (statusFilter.value === 'offline') return !device.online
      return true
    })
  }

  // 模式过滤
  if (modeFilter.value !== '') {
    devices = devices.filter(device => device.mode === modeFilter.value)
  }

  // 分页
  const start = (currentPage.value - 1) * pageSize.value
  return devices.slice(start, start + pageSize.value)
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

const formatTime = (timestamp: number) => {
  if (!timestamp) return '--'
  return formatDistanceToNow(new Date(timestamp), {
    addSuffix: true,
    locale: zhCN
  })
}

const isHeartbeatOverdue = (timestamp: number) => {
  if (!timestamp) return false
  const now = Date.now()
  const diff = now - timestamp
  return diff > 5 * 60 * 1000 // 5分钟未心跳视为过期
}

// 操作方法
const refreshData = () => {
  deviceStore.refreshData()
  ElMessage.success('数据已刷新')
}

const viewDetail = (deviceId: string) => {
  router.push(`/device/${deviceId}`)
}

const controlDevice = (deviceId: string) => {
  controlForm.value.deviceId = deviceId
  controlDialogVisible.value = true
}

const configDevice = (deviceId: string) => {
  router.push({ path: '/config', query: { deviceId } })
}

const submitControl = async () => {
  try {
    const response = await deviceControlApi.controlDevice(controlForm.value)
    if (response.success) {
      ElMessage.success(response.message)
      controlDialogVisible.value = false
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('控制设备失败:', error)
    ElMessage.error('控制设备失败')
  }
}

onMounted(() => {
  deviceStore.refreshData()
})
</script>

<style scoped>
.devices-page {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
}

.low-battery {
  color: #f56c6c;
  font-weight: bold;
}

.normal-battery {
  color: #67c23a;
}

.overdue-heartbeat {
  color: #e6a23c;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-table) {
  background-color: transparent;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}

:deep(.el-link) {
  font-weight: bold;
}

.el-button-group {
  display: flex;
}

.el-button-group .el-button {
  margin: 0;
}

.el-button-group .el-button:not(:first-child) {
  margin-left: -1px;
}
</style>