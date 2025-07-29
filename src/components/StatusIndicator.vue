<template>
  <div
    class="status-indicator"
    :class="statusClass"
    :title="tooltipText"
  >
    <!-- 状态指示点 -->
    <div class="status-indicator__dot">
      <div
        v-if="showPulse && (status === 'online' || status === 'connecting')"
        class="status-indicator__pulse"
      ></div>
    </div>

    <!-- 状态图标 -->
    <el-icon
      v-if="showIcon"
      class="status-indicator__icon"
    >
      <component :is="statusIcon" />
    </el-icon>

    <!-- 状态文本 -->
    <span
      v-if="text || $slots.default"
      class="status-indicator__text"
    >
      <slot>{{ text }}</slot>
    </span>

    <!-- 额外信息 -->
    <span
      v-if="extraInfo"
      class="status-indicator__extra"
    >
      {{ extraInfo }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  CircleCheck,
  CircleClose,
  Warning,
  Loading,
  Question,
  Connection,
  Disconnect,
  Clock
} from '@element-plus/icons-vue'

// 状态类型定义
export type StatusType =
  | 'online'      // 在线
  | 'offline'     // 离线
  | 'warning'     // 警告
  | 'error'       // 错误
  | 'connecting'  // 连接中
  | 'unknown'     // 未知
  | 'success'     // 成功
  | 'info'        // 信息

// 组件属性定义
interface Props {
  status: StatusType           // 状态类型
  text?: string               // 状态文本
  showIcon?: boolean          // 是否显示图标
  showPulse?: boolean         // 是否显示脉冲动画
  size?: 'small' | 'medium' | 'large'  // 尺寸大小
  extraInfo?: string          // 额外信息
  clickable?: boolean         // 是否可点击
}

// 组件事件定义
interface Emits {
  (e: 'click', status: StatusType): void
}

const props = withDefaults(defineProps<Props>(), {
  showIcon: false,
  showPulse: true,
  size: 'medium',
  clickable: false
})

const emit = defineEmits<Emits>()

// 计算属性
const statusClass = computed(() => ({
  [`status-indicator--${props.status}`]: true,
  [`status-indicator--${props.size}`]: true,
  'status-indicator--clickable': props.clickable
}))

const statusIcon = computed(() => {
  const iconMap = {
    online: CircleCheck,
    offline: CircleClose,
    warning: Warning,
    error: CircleClose,
    connecting: Loading,
    unknown: Question,
    success: CircleCheck,
    info: Connection
  }
  return iconMap[props.status] || Question
})

const tooltipText = computed(() => {
  if (props.text) return props.text

  const statusTextMap = {
    online: '设备在线',
    offline: '设备离线',
    warning: '设备告警',
    error: '设备错误',
    connecting: '连接中',
    unknown: '状态未知',
    success: '操作成功',
    info: '信息状态'
  }

  return statusTextMap[props.status] || '未知状态'
})

// 事件处理
const handleClick = () => {
  if (props.clickable) {
    emit('click', props.status)
  }
}
</script>

<style scoped>
.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-small);
  transition: all var(--transition-duration-fast);
}

.status-indicator--clickable {
  cursor: pointer;
  padding: var(--spacing-xs);
  border-radius: var(--border-radius-base);
}

.status-indicator--clickable:hover {
  background-color: var(--fill-color-light);
}

/* 尺寸变体 */
.status-indicator--small {
  font-size: var(--font-size-extra-small);
}

.status-indicator--small .status-indicator__dot {
  width: 6px;
  height: 6px;
}

.status-indicator--medium {
  font-size: var(--font-size-small);
}

.status-indicator--medium .status-indicator__dot {
  width: 8px;
  height: 8px;
}

.status-indicator--large {
  font-size: var(--font-size-base);
}

.status-indicator--large .status-indicator__dot {
  width: 10px;
  height: 10px;
}

/* 状态指示点 */
.status-indicator__dot {
  width: var(--status-indicator-size);
  height: var(--status-indicator-size);
  border-radius: var(--border-radius-circle);
  border: var(--status-indicator-border-width) solid var(--background-color-white);
  box-shadow: 0 0 0 1px var(--border-color-base);
  flex-shrink: 0;
  position: relative;
  transition: all var(--transition-duration-fast);
}

.status-indicator__pulse {
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: var(--border-radius-circle);
  animation: pulse 2s infinite;
}

/* 在线状态 */
.status-indicator--online .status-indicator__dot {
  background-color: var(--device-online-color);
  box-shadow: 0 0 0 1px var(--device-online-color);
}

.status-indicator--online .status-indicator__pulse {
  background-color: var(--device-online-color);
}

.status-indicator--online .status-indicator__text {
  color: var(--device-online-color);
}

.status-indicator--online .status-indicator__icon {
  color: var(--device-online-color);
}

/* 离线状态 */
.status-indicator--offline .status-indicator__dot {
  background-color: var(--device-offline-color);
  box-shadow: 0 0 0 1px var(--device-offline-color);
}

.status-indicator--offline .status-indicator__text {
  color: var(--device-offline-color);
}

.status-indicator--offline .status-indicator__icon {
  color: var(--device-offline-color);
}

/* 警告状态 */
.status-indicator--warning .status-indicator__dot {
  background-color: var(--device-warning-color);
  box-shadow: 0 0 0 1px var(--device-warning-color);
  animation: pulse-warning 1.5s infinite;
}

.status-indicator--warning .status-indicator__text {
  color: var(--device-warning-color);
}

.status-indicator--warning .status-indicator__icon {
  color: var(--device-warning-color);
}

/* 错误状态 */
.status-indicator--error .status-indicator__dot {
  background-color: var(--danger-color);
  box-shadow: 0 0 0 1px var(--danger-color);
  animation: pulse-error 1s infinite;
}

.status-indicator--error .status-indicator__text {
  color: var(--danger-color);
}

.status-indicator--error .status-indicator__icon {
  color: var(--danger-color);
}

/* 连接中状态 */
.status-indicator--connecting .status-indicator__dot {
  background-color: var(--warning-color);
  animation: pulse-connecting 1s infinite;
}

.status-indicator--connecting .status-indicator__pulse {
  background-color: var(--warning-color);
}

.status-indicator--connecting .status-indicator__text {
  color: var(--warning-color);
}

.status-indicator--connecting .status-indicator__icon {
  color: var(--warning-color);
  animation: spin 1s linear infinite;
}

/* 未知状态 */
.status-indicator--unknown .status-indicator__dot {
  background-color: var(--info-color);
  box-shadow: 0 0 0 1px var(--info-color);
}

.status-indicator--unknown .status-indicator__text {
  color: var(--info-color);
}

.status-indicator--unknown .status-indicator__icon {
  color: var(--info-color);
}

/* 成功状态 */
.status-indicator--success .status-indicator__dot {
  background-color: var(--success-color);
  box-shadow: 0 0 0 1px var(--success-color);
}

.status-indicator--success .status-indicator__text {
  color: var(--success-color);
}

.status-indicator--success .status-indicator__icon {
  color: var(--success-color);
}

/* 信息状态 */
.status-indicator--info .status-indicator__dot {
  background-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.status-indicator--info .status-indicator__text {
  color: var(--primary-color);
}

.status-indicator--info .status-indicator__icon {
  color: var(--primary-color);
}

/* 状态文本 */
.status-indicator__text {
  font-weight: var(--font-weight-primary);
  white-space: nowrap;
}

.status-indicator__icon {
  font-size: 1.2em;
  flex-shrink: 0;
}

.status-indicator__extra {
  font-size: 0.9em;
  color: var(--text-color-secondary);
  margin-left: var(--spacing-xs);
}

/* 动画效果 */
@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.3;
    transform: scale(1.5);
  }
  100% {
    opacity: 0;
    transform: scale(2);
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

@keyframes pulse-error {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

@keyframes pulse-connecting {
  0%, 100% {
    opacity: 0.5;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 响应式适配 */
@media (max-width: 768px) {
  .status-indicator {
    gap: var(--spacing-xs);
  }

  .status-indicator__text {
    font-size: var(--font-size-extra-small);
  }

  .status-indicator--large .status-indicator__dot {
    width: 8px;
    height: 8px;
  }
}

/* 减少动画偏好设置 */
@media (prefers-reduced-motion: reduce) {
  .status-indicator__dot,
  .status-indicator__pulse,
  .status-indicator__icon {
    animation: none !important;
  }
}
</style>