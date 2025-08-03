import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import type { ApiResponse } from '@/types'
import { monitorApi } from '@/services/api'
import {
  getDeviceWebSocketService,
  WebSocketEventType,
  type SystemAlertMessage,
  type WebSocketMessage
} from '@/services/websocket'

// 系统信息接口
export interface SystemInfo {
  version: string
  buildTime: string
  uptime: number
  serverTime: number
  timezone: string
  environment: 'development' | 'production' | 'testing'
  nodeVersion: string
  platform: string
  architecture: string
  totalMemory: number
  freeMemory: number
  usedMemory: number
  cpuUsage: number
  loadAverage: number[]
  diskUsage: {
    total: number
    used: number
    free: number
    percentage: number
  }
  networkInterfaces: Array<{
    name: string
    address: string
    family: string
    internal: boolean
  }>
}

// 系统性能指标
export interface SystemMetrics {
  timestamp: number
  cpu: {
    usage: number
    loadAverage: number[]
  }
  memory: {
    total: number
    used: number
    free: number
    percentage: number
  }
  disk: {
    total: number
    used: number
    free: number
    percentage: number
  }
  network: {
    bytesReceived: number
    bytesSent: number
    packetsReceived: number
    packetsSent: number
  }
  processes: {
    total: number
    running: number
    sleeping: number
    zombie: number
  }
}

// 系统告警接口
export interface SystemAlert {
  id: string
  level: 'info' | 'warning' | 'error' | 'critical'
  type: 'system' | 'application' | 'network' | 'security'
  title: string
  message: string
  timestamp: number
  acknowledged: boolean
  resolved: boolean
  source?: string
  metadata?: Record<string, any>
}

// 系统配置接口
export interface SystemConfig {
  server: {
    port: number
    host: string
    enableHttps: boolean
    maxConnections: number
    timeout: number
  }
  database: {
    type: string
    host: string
    port: number
    name: string
    maxConnections: number
  }
  websocket: {
    enabled: boolean
    port: number
    heartbeatInterval: number
    maxConnections: number
  }
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error'
    fileEnabled: boolean
    maxFileSize: number
    maxFiles: number
  }
  security: {
    enableAuth: boolean
    sessionTimeout: number
    passwordMinLength: number
    enableRateLimit: boolean
  }
  monitoring: {
    enabled: boolean
    metricsInterval: number
    alertThresholds: {
      cpuUsage: number
      memoryUsage: number
      diskUsage: number
      connectionCount: number
    }
  }
}

// 系统日志接口
export interface SystemLog {
  id: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  timestamp: number
  source: string
  metadata?: Record<string, any>
  stack?: string
}

// 系统状态枚举
export enum SystemStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
  MAINTENANCE = 'maintenance'
}

// 系统统计信息
export interface SystemStatistics {
  uptime: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  peakCpuUsage: number
  peakMemoryUsage: number
  totalConnections: number
  activeConnections: number
  totalDataTransferred: number
  errorCount: number
  warningCount: number
}

export const useSystemStore = defineStore('system', () => {
  // ==================== 状态定义 ====================
  const systemInfo = ref<SystemInfo | null>(null)
  const systemMetrics = ref<SystemMetrics[]>([])
  const systemAlerts = ref<SystemAlert[]>([])
  const systemConfig = ref<SystemConfig | null>(null)
  const systemLogs = ref<SystemLog[]>([])
  const systemStatistics = ref<SystemStatistics | null>(null)
  const systemStatus = ref<SystemStatus>(SystemStatus.HEALTHY)

  const loading = ref(false)
  const isWebSocketConnected = ref(false)
  const lastUpdateTime = ref<number>(0)
  const metricsUpdateInterval = ref<number | null>(null)

  // 告警筛选和排序
  const alertFilter = ref({
    level: 'all' as 'all' | 'info' | 'warning' | 'error' | 'critical',
    type: 'all' as 'all' | 'system' | 'application' | 'network' | 'security',
    acknowledged: 'all' as 'all' | 'true' | 'false',
    resolved: 'all' as 'all' | 'true' | 'false',
    searchText: ''
  })

  // 日志筛选和排序
  const logFilter = ref({
    level: 'all' as 'all' | 'debug' | 'info' | 'warn' | 'error',
    source: '',
    searchText: '',
    timeRange: {
      start: 0,
      end: 0
    }
  })

  // WebSocket服务实例
  let wsService = getDeviceWebSocketService()

  // ==================== 计算属性 ====================

  // 系统健康状态
  const systemHealth = computed(() => {
    if (!systemMetrics.value.length) return 'unknown'

    const latestMetrics = systemMetrics.value[systemMetrics.value.length - 1]
    const criticalAlerts = systemAlerts.value.filter(
      alert => alert.level === 'critical' && !alert.resolved
    )

    if (criticalAlerts.length > 0) return SystemStatus.CRITICAL
    if (latestMetrics.cpu.usage > 90 || latestMetrics.memory.percentage > 95) {
      return SystemStatus.ERROR
    }
    if (latestMetrics.cpu.usage > 70 || latestMetrics.memory.percentage > 80) {
      return SystemStatus.WARNING
    }

    return SystemStatus.HEALTHY
  })

  // 未确认的告警
  const unacknowledgedAlerts = computed(() =>
    systemAlerts.value.filter(alert => !alert.acknowledged)
  )

  // 严重告警
  const criticalAlerts = computed(() =>
    systemAlerts.value.filter(alert => alert.level === 'critical' && !alert.resolved)
  )

  // 筛选后的告警
  const filteredAlerts = computed(() => {
    let result = [...systemAlerts.value]

    if (alertFilter.value.level !== 'all') {
      result = result.filter(alert => alert.level === alertFilter.value.level)
    }

    if (alertFilter.value.type !== 'all') {
      result = result.filter(alert => alert.type === alertFilter.value.type)
    }

    if (alertFilter.value.acknowledged !== 'all') {
      const isAcknowledged = alertFilter.value.acknowledged === 'true'
      result = result.filter(alert => alert.acknowledged === isAcknowledged)
    }

    if (alertFilter.value.resolved !== 'all') {
      const isResolved = alertFilter.value.resolved === 'true'
      result = result.filter(alert => alert.resolved === isResolved)
    }

    if (alertFilter.value.searchText) {
      const searchText = alertFilter.value.searchText.toLowerCase()
      result = result.filter(alert =>
        alert.title.toLowerCase().includes(searchText) ||
        alert.message.toLowerCase().includes(searchText)
      )
    }

    return result.sort((a, b) => b.timestamp - a.timestamp)
  })

  // 筛选后的日志
  const filteredLogs = computed(() => {
    let result = [...systemLogs.value]

    if (logFilter.value.level !== 'all') {
      result = result.filter(log => log.level === logFilter.value.level)
    }

    if (logFilter.value.source) {
      result = result.filter(log => log.source.includes(logFilter.value.source))
    }

    if (logFilter.value.searchText) {
      const searchText = logFilter.value.searchText.toLowerCase()
      result = result.filter(log =>
        log.message.toLowerCase().includes(searchText) ||
        log.source.toLowerCase().includes(searchText)
      )
    }

    if (logFilter.value.timeRange.start && logFilter.value.timeRange.end) {
      result = result.filter(log =>
        log.timestamp >= logFilter.value.timeRange.start &&
        log.timestamp <= logFilter.value.timeRange.end
      )
    }

    return result.sort((a, b) => b.timestamp - a.timestamp)
  })

  // 最新的系统指标
  const latestMetrics = computed(() => {
    return systemMetrics.value.length > 0
      ? systemMetrics.value[systemMetrics.value.length - 1]
      : null
  })

  // CPU使用率历史数据
  const cpuUsageHistory = computed(() =>
    systemMetrics.value.map(metrics => ({
      timestamp: metrics.timestamp,
      value: metrics.cpu.usage
    }))
  )

  // 内存使用率历史数据
  const memoryUsageHistory = computed(() =>
    systemMetrics.value.map(metrics => ({
      timestamp: metrics.timestamp,
      value: metrics.memory.percentage
    }))
  )

  // ==================== 动作方法 ====================

  // 初始化WebSocket连接
  const initWebSocket = async (): Promise<void> => {
    try {
      // 监听系统告警事件
      wsService.on(WebSocketEventType.SYSTEM_ALERT, handleSystemAlert)

      // 监听WebSocket连接状态
      wsService.on(WebSocketEventType.OPEN, () => {
        isWebSocketConnected.value = true
        console.log('系统管理 WebSocket 已连接')
      })

      wsService.on(WebSocketEventType.CLOSE, () => {
        isWebSocketConnected.value = false
        console.log('系统管理 WebSocket 已断开')
      })

      wsService.on(WebSocketEventType.ERROR, (error) => {
        console.error('系统管理 WebSocket 错误:', error)
        ElMessage.error('WebSocket连接错误')
      })

      // 建立连接
      await wsService.connect()

      // 开始定期更新系统指标
      startMetricsUpdate()
    } catch (error) {
      console.error('初始化WebSocket失败:', error)
      ElMessage.error('初始化WebSocket连接失败')
    }
  }

  // 处理系统告警消息
  const handleSystemAlert = (message: SystemAlertMessage): void => {
    const { level, title, message: alertMessage, deviceId } = message.data

    const alert: SystemAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level,
      type: 'system',
      title,
      message: alertMessage,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false,
      source: deviceId ? `设备 ${deviceId}` : '系统',
      metadata: message.data
    }

    systemAlerts.value.unshift(alert)

    // 显示通知
    const notificationType = level === 'critical' ? 'error' :
      level === 'error' ? 'error' :
        level === 'warning' ? 'warning' : 'info'

    ElNotification({
      title: `系统${level === 'critical' ? '严重' : level === 'error' ? '错误' : level === 'warning' ? '警告' : '信息'}`,
      message: `${title}: ${alertMessage}`,
      type: notificationType,
      duration: level === 'critical' ? 0 : 5000
    })

    lastUpdateTime.value = Date.now()
  }

  // 获取系统信息
  const fetchSystemInfo = async (): Promise<void> => {
    try {
      loading.value = true
      const response = await monitorApi.getSystemInfo()

      if (response.success && response.data) {
        systemInfo.value = response.data
        lastUpdateTime.value = Date.now()
      } else {
        throw new Error(response.message || '获取系统信息失败')
      }
    } catch (error) {
      console.error('获取系统信息失败:', error)
      ElMessage.error('获取系统信息失败')
    } finally {
      loading.value = false
    }
  }

  // 获取系统指标
  const fetchSystemMetrics = async (): Promise<void> => {
    try {
      const response = await monitorApi.getSystemMetrics()

      if (response.success && response.data) {
        const metrics = response.data as SystemMetrics
        systemMetrics.value.push(metrics)

        // 保持最近1000条记录
        if (systemMetrics.value.length > 1000) {
          systemMetrics.value = systemMetrics.value.slice(-1000)
        }

        // 更新系统状态
        systemStatus.value = systemHealth.value as SystemStatus
        lastUpdateTime.value = Date.now()
      }
    } catch (error) {
      console.error('获取系统指标失败:', error)
    }
  }

  // 获取系统告警
  const fetchSystemAlerts = async (): Promise<void> => {
    try {
      const response = await monitorApi.getSystemAlerts()

      if (response.success && response.data) {
        systemAlerts.value = response.data
        lastUpdateTime.value = Date.now()
      } else {
        throw new Error(response.message || '获取系统告警失败')
      }
    } catch (error) {
      console.error('获取系统告警失败:', error)
      ElMessage.error('获取系统告警失败')
    }
  }

  // 获取系统配置
  const fetchSystemConfig = async (): Promise<void> => {
    try {
      const response = await monitorApi.getSystemConfig()

      if (response.success && response.data) {
        systemConfig.value = response.data
        lastUpdateTime.value = Date.now()
      } else {
        throw new Error(response.message || '获取系统配置失败')
      }
    } catch (error) {
      console.error('获取系统配置失败:', error)
      ElMessage.error('获取系统配置失败')
    }
  }

  // 获取系统日志
  const fetchSystemLogs = async (params?: {
    level?: string
    limit?: number
    offset?: number
  }): Promise<void> => {
    try {
      const response = await monitorApi.getSystemLogs(params)

      if (response.success && response.data) {
        if (params?.offset && params.offset > 0) {
          systemLogs.value.push(...response.data)
        } else {
          systemLogs.value = response.data
        }
        lastUpdateTime.value = Date.now()
      } else {
        throw new Error(response.message || '获取系统日志失败')
      }
    } catch (error) {
      console.error('获取系统日志失败:', error)
      ElMessage.error('获取系统日志失败')
    }
  }

  // 获取系统统计信息
  const fetchSystemStatistics = async (): Promise<void> => {
    try {
      const response = await monitorApi.getSystemStatistics()

      if (response.success && response.data) {
        systemStatistics.value = response.data
        lastUpdateTime.value = Date.now()
      } else {
        throw new Error(response.message || '获取系统统计信息失败')
      }
    } catch (error) {
      console.error('获取系统统计信息失败:', error)
      ElMessage.error('获取系统统计信息失败')
    }
  }

  // 确认告警
  const acknowledgeAlert = async (alertId: string): Promise<boolean> => {
    try {
      const response = await monitorApi.acknowledgeAlert(alertId)

      if (response.success) {
        // 更新本地状态
        const alertIndex = systemAlerts.value.findIndex(alert => alert.id === alertId)
        if (alertIndex >= 0) {
          systemAlerts.value[alertIndex].acknowledged = true
        }

        ElMessage.success('告警已确认')
        return true
      } else {
        throw new Error(response.message || '确认告警失败')
      }
    } catch (error) {
      console.error('确认告警失败:', error)
      ElMessage.error('确认告警失败')
      return false
    }
  }

  // 解决告警
  const resolveAlert = async (alertId: string): Promise<boolean> => {
    try {
      const response = await monitorApi.resolveAlert(alertId)

      if (response.success) {
        // 更新本地状态
        const alertIndex = systemAlerts.value.findIndex(alert => alert.id === alertId)
        if (alertIndex >= 0) {
          systemAlerts.value[alertIndex].resolved = true
          systemAlerts.value[alertIndex].acknowledged = true
        }

        ElMessage.success('告警已解决')
        return true
      } else {
        throw new Error(response.message || '解决告警失败')
      }
    } catch (error) {
      console.error('解决告警失败:', error)
      ElMessage.error('解决告警失败')
      return false
    }
  }

  // 批量确认告警
  const acknowledgeAlerts = async (alertIds: string[]): Promise<boolean> => {
    try {
      const response = await monitorApi.acknowledgeAlerts(alertIds)

      if (response.success) {
        // 更新本地状态
        alertIds.forEach(alertId => {
          const alertIndex = systemAlerts.value.findIndex(alert => alert.id === alertId)
          if (alertIndex >= 0) {
            systemAlerts.value[alertIndex].acknowledged = true
          }
        })

        ElMessage.success(`已确认 ${alertIds.length} 个告警`)
        return true
      } else {
        throw new Error(response.message || '批量确认告警失败')
      }
    } catch (error) {
      console.error('批量确认告警失败:', error)
      ElMessage.error('批量确认告警失败')
      return false
    }
  }

  // 清除已解决的告警
  const clearResolvedAlerts = async (): Promise<boolean> => {
    try {
      const resolvedAlertIds = systemAlerts.value
        .filter(alert => alert.resolved)
        .map(alert => alert.id)

      if (resolvedAlertIds.length === 0) {
        ElMessage.info('没有已解决的告警需要清除')
        return true
      }

      const response = await monitorApi.clearAlerts(resolvedAlertIds)

      if (response.success) {
        // 从本地状态中移除已解决的告警
        systemAlerts.value = systemAlerts.value.filter(alert => !alert.resolved)

        ElMessage.success(`已清除 ${resolvedAlertIds.length} 个已解决的告警`)
        return true
      } else {
        throw new Error(response.message || '清除告警失败')
      }
    } catch (error) {
      console.error('清除告警失败:', error)
      ElMessage.error('清除告警失败')
      return false
    }
  }

  // 更新系统配置
  const updateSystemConfig = async (config: Partial<SystemConfig>): Promise<boolean> => {
    try {
      const response = await monitorApi.updateSystemConfig(config)

      if (response.success) {
        // 重新获取系统配置
        await fetchSystemConfig()
        ElMessage.success('系统配置已更新')
        return true
      } else {
        throw new Error(response.message || '更新系统配置失败')
      }
    } catch (error) {
      console.error('更新系统配置失败:', error)
      ElMessage.error('更新系统配置失败')
      return false
    }
  }

  // 重启系统
  const restartSystem = async (): Promise<boolean> => {
    try {
      const response = await monitorApi.restartSystem()

      if (response.success) {
        ElMessage.success('系统重启命令已发送')
        return true
      } else {
        throw new Error(response.message || '重启系统失败')
      }
    } catch (error) {
      console.error('重启系统失败:', error)
      ElMessage.error('重启系统失败')
      return false
    }
  }

  // 开始定期更新系统指标
  const startMetricsUpdate = (): void => {
    if (metricsUpdateInterval.value) {
      clearInterval(metricsUpdateInterval.value)
    }

    metricsUpdateInterval.value = window.setInterval(() => {
      fetchSystemMetrics()
    }, 30000) // 每30秒更新一次
  }

  // 停止定期更新系统指标
  const stopMetricsUpdate = (): void => {
    if (metricsUpdateInterval.value) {
      clearInterval(metricsUpdateInterval.value)
      metricsUpdateInterval.value = null
    }
  }

  // 设置告警筛选条件
  const setAlertFilter = (filter: Partial<typeof alertFilter.value>): void => {
    alertFilter.value = { ...alertFilter.value, ...filter }
  }

  // 设置日志筛选条件
  const setLogFilter = (filter: Partial<typeof logFilter.value>): void => {
    logFilter.value = { ...logFilter.value, ...filter }
  }

  // 清除告警筛选条件
  const clearAlertFilter = (): void => {
    alertFilter.value = {
      level: 'all',
      type: 'all',
      acknowledged: 'all',
      resolved: 'all',
      searchText: ''
    }
  }

  // 清除日志筛选条件
  const clearLogFilter = (): void => {
    logFilter.value = {
      level: 'all',
      source: '',
      searchText: '',
      timeRange: {
        start: 0,
        end: 0
      }
    }
  }

  // 获取系统健康检查
  const getSystemHealthCheck = async (): Promise<any> => {
    try {
      const response = await monitorApi.getHealthCheck()

      if (response.success) {
        return response.data
      } else {
        throw new Error(response.message || '健康检查失败')
      }
    } catch (error) {
      console.error('健康检查失败:', error)
      ElMessage.error('健康检查失败')
      return null
    }
  }

  // 导出系统日志
  const exportSystemLogs = async (params: {
    level?: string
    startTime?: number
    endTime?: number
    format?: 'json' | 'csv' | 'txt'
  }): Promise<boolean> => {
    try {
      const response = await monitorApi.exportLogs(params)

      if (response.success && response.data) {
        // 创建下载链接
        const blob = new Blob([response.data], {
          type: params.format === 'csv' ? 'text/csv' :
            params.format === 'json' ? 'application/json' : 'text/plain'
        })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `system_logs_${new Date().toISOString().split('T')[0]}.${params.format || 'txt'}`
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        ElMessage.success('日志导出成功')
        return true
      } else {
        throw new Error(response.message || '导出日志失败')
      }
    } catch (error) {
      console.error('导出日志失败:', error)
      ElMessage.error('导出日志失败')
      return false
    }
  }

  // 清理资源
  const cleanup = (): void => {
    if (wsService) {
      wsService.off(WebSocketEventType.SYSTEM_ALERT, handleSystemAlert)
      wsService.disconnect()
    }

    stopMetricsUpdate()

    systemInfo.value = null
    systemMetrics.value = []
    systemAlerts.value = []
    systemConfig.value = null
    systemLogs.value = []
    systemStatistics.value = null
    isWebSocketConnected.value = false
  }

  // 刷新所有系统数据
  const refreshSystemData = async (): Promise<void> => {
    try {
      loading.value = true
      await Promise.all([
        fetchSystemInfo(),
        fetchSystemMetrics(),
        fetchSystemAlerts(),
        fetchSystemStatistics()
      ])
    } catch (error) {
      console.error('刷新系统数据失败:', error)
      ElMessage.error('刷新系统数据失败')
    } finally {
      loading.value = false
    }
  }

  // 根据告警ID查找告警
  const findAlertById = (alertId: string): SystemAlert | undefined => {
    return systemAlerts.value.find(alert => alert.id === alertId)
  }

  // 添加自定义告警
  const addCustomAlert = (alert: Omit<SystemAlert, 'id' | 'timestamp'>): void => {
    const newAlert: SystemAlert = {
      ...alert,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }

    systemAlerts.value.unshift(newAlert)
    lastUpdateTime.value = Date.now()
  }

  return {
    // 状态
    systemInfo,
    systemMetrics,
    systemAlerts,
    systemConfig,
    systemLogs,
    systemStatistics,
    systemStatus,
    loading,
    isWebSocketConnected,
    lastUpdateTime,
    alertFilter,
    logFilter,

    // 计算属性
    systemHealth,
    unacknowledgedAlerts,
    criticalAlerts,
    filteredAlerts,
    filteredLogs,
    latestMetrics,
    cpuUsageHistory,
    memoryUsageHistory,

    // 方法
    initWebSocket,
    fetchSystemInfo,
    fetchSystemMetrics,
    fetchSystemAlerts,
    fetchSystemConfig,
    fetchSystemLogs,
    fetchSystemStatistics,
    acknowledgeAlert,
    resolveAlert,
    acknowledgeAlerts,
    clearResolvedAlerts,
    updateSystemConfig,
    restartSystem,
    startMetricsUpdate,
    stopMetricsUpdate,
    setAlertFilter,
    setLogFilter,
    clearAlertFilter,
    clearLogFilter,
    getSystemHealthCheck,
    exportSystemLogs,
    cleanup,
    refreshSystemData,
    findAlertById,
    addCustomAlert
  }
})