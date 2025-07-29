<template>
  <div
    class="device-card"
    :class="deviceCardClass"
    @click="handleCardClick"
  >
    <!-- 卡片头部 -->
    <div class="device-card__header">
      <div class="device-card__title">
        <span>{{ device.deviceId }}</span>
        <StatusIndicator
          :status="deviceStatus"
          :text="statusText"
        />
      </div>
    </div>

    <!-- 卡片内容 -->
    <div class="device-card__body">
      <div class="device-card__info">
        <!-- 工作模式 -->
        <div class="device-card__info-item">
          <span class="device-card__info-label">工作模式</span>
          <span class="device-card__info-value">
            <el-tag
              :type="getModeTagType(device.mode)"
              size="small"
            >
              {{ getModeText(device.mode) }}
            </el-tag>
          </span>
        </div>

        <!-- 电池电压 -->
        <div class="device-card__info-item">
          <span class="device-card__info-label">电池电压</span>
          <span
            class="device-card__info-value"
            :class="getBatteryClass(device.batteryVoltage)"
          >
            {{ formatVoltage(device.batteryVoltage) }}
          </span>
        </div>

        <!-- GPS状态 -->
        <div class="device-card__info-item">
          <span class="device-card__info-label">GPS状态</span>
          <span class="device-card__info-value">
            <el-tag
              :type="getGpsTagType(device.gpsStatus)"
              size="small"
            >
              <el-icon style="margin-right: 4px;">
                <Location v-if="device.gpsStatus === 'A'" />
                <LocationInformation v-else />
              </el-icon>
              {{ getGpsText(device.gpsStatus) }}
            </el-tag>
          </span>
        </div>

        <!-- 远程地址 -->
        <div class="device-card__info-item">
          <span class="device-card__info-label">远程地址</span>
          <span class="device-card__info-value">
            {{ formatAddress(device.remoteAddress) }}
          </span>
        </div>

        <!-- 最后心跳 -->
        <div class="device-card__info-item">
          <span class="device-card__info-label">最后心跳</span>
          <span
            class="device-card__info-value"
            :class="getHeartbeatClass(device.lastHeartbeat)"
          >
            {{ formatHeartbeat(device.lastHeartbeat) }}
          </span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="device-card__actions" v-if="showActions">
        <el-button
          type="primary"
          size="small"
          :disabled="!device.online"
          @click.stop="handleControl"
        >
          <el-icon><Operation /></el-icon>
          控制
        </el-button>

        <el-button
          type="success"
          size="small"
          :disabled="!device.online"
          @click.stop="handleConfig"
        >
          <el-icon><Setting /></el-icon>
          配置
        </el-button>

        <el-dropdown
          @command="handleCommand"
          @click.stop
        >
          <el-button size="small">
            <el-icon><More /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                command="detail"
                :icon="View"
              >
                查看详情
              </el-dropdown-item>
              <el-dropdown-item
                command="logs"
                :icon="Document"
              >
                查看日志
              </el-dropdown-item>
              <el-dropdown-item
                command="monitor"
                :icon="Monitor"
              >
                实时监控
              </el-dropdown-item>
              <el-dropdown-item
                command="reset"
                :icon="RefreshRight"
                :disabled="!device.online"
                divided
              >
                重启设备
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 连接状态指示灯 -->
    <div
      class="device-card__connection-indicator"
      :class="`device-card__connection-indicator--${deviceStatus}`"
    >
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import StatusIndicator from './StatusIndicator.vue'
import type { DeviceInfo } from '@/types'

// 组件属性定义
interface Props {
  device: DeviceInfo           // 设备信息
  showActions?: boolean        // 是否显示操作按钮
  clickable?: boolean          // 是否可点击
}

// 组件事件定义
interface Emits {
  (e: 'click', device: DeviceInfo): void
  (e: 'control', device: DeviceInfo): void
  (e: 'config', device: DeviceInfo): void
  (e: 'reset', device: DeviceInfo): void
}

const props = withDefaults(defineProps<Props>(), {
  showActions: true,
  clickable: true
})

const emit = defineEmits<Emits>()
const router = useRouter()

// 设备状态计算
const deviceStatus = computed(() => {
  if (!props.device.online) return 'offline'

  // 检查心跳超时
  const now = Date.now()
  const heartbeatDiff = now - props.device.lastHeartbeat
  if (heartbeatDiff > 5 * 60 * 1000) return 'warning' // 5分钟无心跳

  // 检查电池电压
  if (props.device.batteryVoltage && props.device.batteryVoltage < 20) {
    return 'warning'
  }

  // 检查GPS状态
  if (props.device.gpsStatus !== 'A') return 'warning'

  return 'online'
})

const statusText = computed(() => {
  switch (deviceStatus.value) {
    case 'online': return '正常'
    case 'offline': return '离线'
    case 'warning': return '告警'
    default: return '未知'
  }
})

const deviceCardClass = computed(() => ({
  'device-card--online': deviceStatus.value === 'online',
  'device-card--offline': deviceStatus.value === 'offline',
  'device-card--warning': deviceStatus.value === 'warning',
  'device-card--clickable': props.clickable
}))

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
    0: 'success',  // 自主模式 - 绿色
    1: 'warning',  // 本地模式 - 橙色
    2: 'info'      // 测试模式 - 灰色
  }
  return mode !== undefined ? typeMap[mode] || 'info' : 'info'
}

const getGpsText = (status: string | undefined) => {
  return status === 'A' ? '已定位' : '未定位'
}

const getGpsTagType = (status: string | undefined) => {
  return status === 'A' ? 'success' : 'warning'
}

const formatVoltage = (voltage: number | undefined) => {
  return voltage ? `${voltage.toFixed(1)}V` : '--'
}

const getBatteryClass = (voltage: number | undefined) => {
  if (!voltage) return ''
  if (voltage < 20) return 'battery-critical'
  if (voltage < 22) return 'battery-low'
  if (voltage < 24) return 'battery-medium'
  return 'battery-high'
}

const formatAddress = (address: string | undefined) => {
  if (!address) return '--'
  // 移除开头的斜杠
  return address.replace(/^\//, '')
}

const formatHeartbeat = (timestamp: number) => {
  if (!timestamp) return '--'
  return formatDistanceToNow(new Date(timestamp), {
    addSuffix: true,
    locale: zhCN
  })
}

const getHeartbeatClass = (timestamp: number) => {
  if (!timestamp) return 'text-placeholder'
  const now = Date.now()
  const diff = now - timestamp
  if (diff > 5 * 60 * 1000) return 'text-danger'  // 5分钟
  if (diff > 2 * 60 * 1000) return 'text-warning' // 2分钟
  return 'text-success'
}

// 事件处理
const handleCardClick = () => {
  if (props.clickable) {
    emit('click', props.device)
  }
}

const handleControl = () => {
  emit('control', props.device)
  router.push({
    path: '/control',
    query: { deviceId: props.device.deviceId }
  })
}

const handleConfig = () => {
  emit('config', props.device)
  router.push({
    path: '/config',
    query: { deviceId: props.device.deviceId }
  })
}

const handleCommand = async (command: string) => {
  switch (command) {
    case 'detail':
      router.push(`/device/${props.device.deviceId}`)
      break

    case 'logs':
      router.push({
        path: '/logs',
        query: { deviceId: props.device.deviceId }
      })
      break

    case 'monitor':
      router.push(`/monitor?deviceId=${props.device.deviceId}`)
      break

    case 'reset':
      try {
        await ElMessageBox.confirm(
          `确定要重启设备 ${props.device.deviceId} 吗？`,
          '确认重启',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        emit('reset', props.device)
        ElMessage.success('重启指令已发送')
      } catch {
        // 用户取消
      }
      break
  }
}
</script>

<style scoped>
.device-card {
  width: var(--device-card-width);
  height: var(--device-card-height);
  border-radius: var(--device-card-border-radius);
  box-shadow: var(--device-card-shadow);
  background: var(--background-color-white);
  border: 1px solid var(--border-color-lighter);
  transition: all var(--transition-duration-base) var(--transition-timing-function);
  overflow: hidden;
  position: relative;
}

.device-card--clickable {
  cursor: pointer;
}

.device-card:hover {
  box-shadow: var(--device-card-hover-shadow);
  transform: translateY(-2px);
}

.device-card--online {
  border-left: 4px solid var(--device-online-color);
}

.device-card--offline {
  border-left: 4px solid var(--device-offline-color);
  opacity: 0.8;
}

.device-card--warning {
  border-left: 4px solid var(--device-warning-color);
}

.device-card__header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color-lighter);
  background: var(--fill-color-lighter);
}

.device-card__title {
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-primary);
  color: var(--text-color-primary);
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.device-card__body {
  padding: var(--spacing-lg);
  height: calc(100% - 60px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.device-card__info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.device-card__info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-small);
}

.device-card__info-label {
  color: var(--text-color-secondary);
  flex-shrink: 0;
}

.device-card__info-value {
  color: var(--text-color-primary);
  font-weight: var(--font-weight-primary);
  text-align: right;
  flex-shrink: 0;
}

.device-card__actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

.device-card__connection-indicator {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  width: 8px;
  height: 8px;
  border-radius: var(--border-radius-circle);
  border: 2px solid var(--background-color-white);
}

.device-card__connection-indicator--online {
  background-color: var(--device-online-color);
  animation: pulse-online 2s infinite;
}

.device-card__connection-indicator--offline {
  background-color: var(--device-offline-color);
}

.device-card__connection-indicator--warning {
  background-color: var(--device-warning-color);
  animation: pulse-warning 1.5s infinite;
}

@keyframes pulse-online {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.2);
  }
}

@keyframes pulse-warning {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 响应式适配 */
@media (max-width: 768px) {
  .device-card {
    width: 100%;
    height: auto;
    min-height: 200px;
  }

  .device-card__actions {
    flex-wrap: wrap;
  }

  .device-card__info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }

  .device-card__info-value {
    text-align: left;
  }
}
</style>