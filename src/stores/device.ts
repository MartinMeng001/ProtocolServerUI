import { defineStore } from 'pinia'
import { ref, computed, nextTick } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import type {
  DeviceInfo,
  DeviceData,
  DeviceStatistics,
  DeviceAlerts,
  DeviceControlRequest,
  DeviceResetRequest,
  DeviceModeRequest,
  TcpIpConfigRequest,
  ScheduleConfigRequest,
  MotorConfigRequest
} from '@/types'
import {
  deviceApi,
  deviceControlApi,
  deviceConfigApi,
  monitorApi
} from '@/services/api'
import {
  getDeviceWebSocketService,
  WebSocketEventType,
  type DeviceUpdateMessage,
  type SystemAlertMessage
} from '@/services/websocket'

// 设备筛选条件接口
interface DeviceFilter {
  status?: 'all' | 'online' | 'offline' | 'warning'
  mode?: number
  batteryLevel?: 'all' | 'high' | 'medium' | 'low' | 'critical'
  gpsStatus?: 'all' | 'located' | 'not-located'
  searchText?: string
}

// 设备排序选项
interface DeviceSortOption {
  field: 'deviceId' | 'lastHeartbeat' | 'batteryVoltage' | 'mode'
  order: 'asc' | 'desc'
}

export const useDeviceStore = defineStore('device', () => {
  // ==================== 状态定义 ====================
  const devices = ref<DeviceInfo[]>([])
  const deviceDetails = ref<Map<string, DeviceData>>(new Map())
  const statistics = ref<DeviceStatistics | null>(null)
  const alerts = ref<DeviceAlerts | null>(null)
  const loading = ref(false)
  const isWebSocketConnected = ref(false)
  const lastUpdateTime = ref<number>(0)

  // 筛选和排序状态
  const filter = ref<DeviceFilter>({
    status: 'all',
    batteryLevel: 'all',
    gpsStatus: 'all',
    searchText: ''
  })
  const sortOption = ref<DeviceSortOption>({
    field: 'lastHeartbeat',
    order: 'desc'
  })

  // WebSocket服务实例
  let wsService = getDeviceWebSocketService()

  // ==================== 计算属性 ====================

  // 在线设备
  const onlineDevices = computed(() =>
    devices.value.filter(device => device.online)
  )

  // 离线设备
  const offlineDevices = computed(() =>
    devices.value.filter(device => !device.online)
  )

  // 告警设备
  const warningDevices = computed(() =>
    devices.value.filter(device => {
      if (!device.online) return false
      // 检查电池电压
      if (device.batteryVoltage && device.batteryVoltage < 20) return true
      // 检查GPS状态
      if (device.gpsStatus !== 'A') return true
      // 检查心跳超时
      const now = Date.now()
      if (now - device.lastHeartbeat > 5 * 60 * 1000) return true
      return false
    })
  )

  // 设备总数
  const deviceCount = computed(() => devices.value.length)

  // 连接总数
  const connectionCount = computed(() =>
    devices.value.filter(device => device.connectionId).length
  )

  // 筛选后的设备列表
  const filteredDevices = computed(() => {
    let result = [...devices.value]

    // 按状态筛选
    if (filter.value.status !== 'all') {
      switch (filter.value.status) {
        case 'online':
          result = result.filter(device => device.online)
          break
        case 'offline':
          result = result.filter(device => !device.online)
          break
        case 'warning':
          result = warningDevices.value
          break
      }
    }

    // 按工作模式筛选
    if (filter.value.mode !== undefined) {
      result = result.filter(device => device.mode === filter.value.mode)
    }

    // 按电池电量筛选
    if (filter.value.batteryLevel !== 'all') {
      result = result.filter(device => {
        if (!device.batteryVoltage) return false
        const voltage = device.batteryVoltage
        switch (filter.value.batteryLevel) {
          case 'high': return voltage >= 24
          case 'medium': return voltage >= 22 && voltage < 24
          case 'low': return voltage >= 20 && voltage < 22
          case 'critical': return voltage < 20
          default: return true
        }
      })
    }

    // 按GPS状态筛选
    if (filter.value.gpsStatus !== 'all') {
      switch (filter.value.gpsStatus) {
        case 'located':
          result = result.filter(device => device.gpsStatus === 'A')
          break
        case 'not-located':
          result = result.filter(device => device.gpsStatus !== 'A')
          break
      }
    }

    // 按搜索文本筛选
    if (filter.value.searchText) {
      const searchText = filter.value.searchText.toLowerCase()
      result = result.filter(device =>
        device.deviceId.toLowerCase().includes(searchText) ||
        device.remoteAddress?.toLowerCase().includes(searchText)
      )
    }

    // 排序
    result.sort((a, b) => {
      const { field, order } = sortOption.value
      let aValue: any, bValue: any

      switch (field) {
        case 'deviceId':
          aValue = a.deviceId
          bValue = b.deviceId
          break
        case 'lastHeartbeat':
          aValue = a.lastHeartbeat
          bValue = b.lastHeartbeat
          break
        case 'batteryVoltage':
          aValue = a.batteryVoltage || 0
          bValue = b.batteryVoltage || 0
          break
        case 'mode':
          aValue = a.mode || 0
          bValue = b.mode || 0
          break
        default:
          return 0
      }

      if (order === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
    })

    return result
  })

  // 设备统计信息
  const deviceStatistics = computed(() => ({
    total: deviceCount.value,
    online: onlineDevices.value.length,
    offline: offlineDevices.value.length,
    warning: warningDevices.value.length,
    modeDistribution: {
      auto: devices.value.filter(d => d.mode === 0).length,
      manual: devices.value.filter(d => d.mode === 1).length,
      test: devices.value.filter(d => d.mode === 2).length
    },
    batteryDistribution: {
      high: devices.value.filter(d => d.batteryVoltage && d.batteryVoltage >= 24).length,
      medium: devices.value.filter(d => d.batteryVoltage && d.batteryVoltage >= 22 && d.batteryVoltage < 24).length,
      low: devices.value.filter(d => d.batteryVoltage && d.batteryVoltage >= 20 && d.batteryVoltage < 22).length,
      critical: devices.value.filter(d => d.batteryVoltage && d.batteryVoltage < 20).length
    }
  }))

  // ==================== WebSocket 事件处理 ====================

  // 初始化WebSocket连接
  const initWebSocket = async () => {
    try {
      // 连接WebSocket
      await wsService.connect()
      isWebSocketConnected.value = true

      // 监听连接状态变化
      wsService.on(WebSocketEventType.OPEN, () => {
        isWebSocketConnected.value = true
        console.log('设备WebSocket连接已建立')
      })

      wsService.on(WebSocketEventType.CLOSE, () => {
        isWebSocketConnected.value = false
        console.log('设备WebSocket连接已断开')
      })

      wsService.on(WebSocketEventType.ERROR, (error) => {
        isWebSocketConnected.value = false
        console.error('设备WebSocket连接错误:', error)
      })

      // 监听设备更新消息
      wsService.on(WebSocketEventType.DEVICE_UPDATE, (deviceData: DeviceData) => {
        handleDeviceUpdate(deviceData)
      })

      // 监听设备上线
      wsService.on(WebSocketEventType.DEVICE_ONLINE, (data: any) => {
        handleDeviceOnline(data)
      })

      // 监听设备离线
      wsService.on(WebSocketEventType.DEVICE_OFFLINE, (data: any) => {
        handleDeviceOffline(data)
      })

      // 监听系统告警
      wsService.on(WebSocketEventType.SYSTEM_ALERT, (alert: SystemAlertMessage['data']) => {
        handleSystemAlert(alert)
      })

    } catch (error) {
      console.error('WebSocket连接失败:', error)
      isWebSocketConnected.value = false
    }
  }

  // 处理设备更新
  const handleDeviceUpdate = (deviceData: DeviceData) => {
    const deviceIndex = devices.value.findIndex(d => d.deviceId === deviceData.ID)

    if (deviceIndex !== -1) {
      // 更新现有设备
      const device = devices.value[deviceIndex]
      devices.value[deviceIndex] = {
        ...device,
        mode: deviceData.Mode,
        batteryVoltage: deviceData.V,
        gpsStatus: deviceData.status,
        latitude: deviceData.lat,
        longitude: deviceData.lon,
        lastHeartbeat: Date.now(),
        online: true
      }
    } else {
      // 添加新设备
      devices.value.push({
        deviceId: deviceData.ID,
        online: true,
        mode: deviceData.Mode,
        batteryVoltage: deviceData.V,
        gpsStatus: deviceData.status,
        latitude: deviceData.lat,
        longitude: deviceData.lon,
        lastHeartbeat: Date.now()
      })
    }

    // 更新设备详情
    deviceDetails.value.set(deviceData.ID, deviceData)
    lastUpdateTime.value = Date.now()
  }

  // 处理设备上线
  const handleDeviceOnline = (data: { deviceId: string; connectionId?: string; remoteAddress?: string }) => {
    const deviceIndex = devices.value.findIndex(d => d.deviceId === data.deviceId)

    if (deviceIndex !== -1) {
      devices.value[deviceIndex].online = true
      devices.value[deviceIndex].connectionId = data.connectionId
      devices.value[deviceIndex].remoteAddress = data.remoteAddress
      devices.value[deviceIndex].lastHeartbeat = Date.now()
    }

    ElNotification({
      title: '设备上线',
      message: `设备 ${data.deviceId} 已上线`,
      type: 'success',
      duration: 3000
    })
  }

  // 处理设备离线
  const handleDeviceOffline = (data: { deviceId: string }) => {
    const deviceIndex = devices.value.findIndex(d => d.deviceId === data.deviceId)

    if (deviceIndex !== -1) {
      devices.value[deviceIndex].online = false
      devices.value[deviceIndex].connectionId = undefined
    }

    ElNotification({
      title: '设备离线',
      message: `设备 ${data.deviceId} 已离线`,
      type: 'warning',
      duration: 5000
    })
  }

  // 处理系统告警
  const handleSystemAlert = (alert: SystemAlertMessage['data']) => {
    ElNotification({
      title: alert.title,
      message: alert.message,
      type: alert.level === 'error' ? 'error' : alert.level === 'warning' ? 'warning' : 'info',
      duration: alert.level === 'error' ? 0 : 5000
    })
  }

  // 关闭WebSocket连接
  const closeWebSocket = () => {
    if (wsService && isWebSocketConnected.value) {
      wsService.disconnect()
      isWebSocketConnected.value = false
    }
  }

  // ==================== API 操作方法 ====================

  // 获取设备列表
  const fetchDevices = async () => {
    try {
      loading.value = true
      const response = await deviceApi.getDeviceList()

      if (response.success) {
        devices.value = response.data
        lastUpdateTime.value = Date.now()
      } else {
        ElMessage.error('获取设备列表失败: ' + response.message)
      }
    } catch (error) {
      console.error('获取设备列表失败:', error)
      ElMessage.error('获取设备列表失败')
    } finally {
      loading.value = false
    }
  }

  // 获取设备详情
  const fetchDeviceDetail = async (deviceId: string) => {
    try {
      const response = await deviceApi.getDeviceInfo(deviceId)

      if (response.success) {
        deviceDetails.value.set(deviceId, response.data)
        return response.data
      } else {
        ElMessage.error('获取设备详情失败: ' + response.message)
        return null
      }
    } catch (error) {
      console.error('获取设备详情失败:', error)
      ElMessage.error('获取设备详情失败')
      return null
    }
  }

  // 获取统计数据
  const fetchStatistics = async () => {
    try {
      const response = await monitorApi.getDeviceStatistics()

      if (response.success) {
        statistics.value = response.data
      }
    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
  }

  // 获取告警信息
  const fetchAlerts = async () => {
    try {
      const response = await monitorApi.getDeviceAlerts()

      if (response.success) {
        alerts.value = response.data
      }
    } catch (error) {
      console.error('获取告警信息失败:', error)
    }
  }

  // 刷新所有数据
  const refreshData = async () => {
    await Promise.all([
      fetchDevices(),
      fetchStatistics(),
      fetchAlerts()
    ])
  }

  // ==================== 设备控制方法 ====================

  // 控制设备
  const controlDevice = async (request: DeviceControlRequest) => {
    try {
      const response = await deviceControlApi.controlDevice(request)

      if (response.success) {
        ElMessage.success(response.message)
        // 延迟刷新设备状态
        setTimeout(() => {
          fetchDeviceDetail(request.deviceId)
        }, 1000)
      } else {
        ElMessage.error(response.message)
      }

      return response.success
    } catch (error) {
      console.error('设备控制失败:', error)
      ElMessage.error('设备控制失败')
      return false
    }
  }

  // 重启设备
  const resetDevice = async (request: DeviceResetRequest) => {
    try {
      const response = await deviceControlApi.resetDevice(request)

      if (response.success) {
        ElMessage.success(response.message)
        // 标记设备为离线状态，等待重新上线
        const deviceIndex = devices.value.findIndex(d => d.deviceId === request.deviceId)
        if (deviceIndex !== -1) {
          devices.value[deviceIndex].online = false
        }
      } else {
        ElMessage.error(response.message)
      }

      return response.success
    } catch (error) {
      console.error('设备重启失败:', error)
      ElMessage.error('设备重启失败')
      return false
    }
  }

  // 设置工作模式
  const setDeviceMode = async (request: DeviceModeRequest) => {
    try {
      const response = await deviceControlApi.setWorkMode(request)

      if (response.success) {
        ElMessage.success(response.message)
        // 更新本地设备模式
        const deviceIndex = devices.value.findIndex(d => d.deviceId === request.deviceId)
        if (deviceIndex !== -1) {
          devices.value[deviceIndex].mode = request.mode
        }
      } else {
        ElMessage.error(response.message)
      }

      return response.success
    } catch (error) {
      console.error('设备模式设置失败:', error)
      ElMessage.error('设备模式设置失败')
      return false
    }
  }

  // ==================== 设备配置方法 ====================

  // 配置TCP/IP
  const configureTcpIp = async (request: TcpIpConfigRequest) => {
    try {
      const response = await deviceConfigApi.configureTcpIp(request)

      if (response.success) {
        ElMessage.success(response.message)
      } else {
        ElMessage.error(response.message)
      }

      return response.success
    } catch (error) {
      console.error('TCP/IP配置失败:', error)
      ElMessage.error('TCP/IP配置失败')
      return false
    }
  }

  // 配置工作时间表
  const configureSchedule = async (request: ScheduleConfigRequest) => {
    try {
      const response = await deviceConfigApi.configureSchedule(request)

      if (response.success) {
        ElMessage.success(response.message)
      } else {
        ElMessage.error(response.message)
      }

      return response.success
    } catch (error) {
      console.error('工作时间表配置失败:', error)
      ElMessage.error('工作时间表配置失败')
      return false
    }
  }

  // 配置电机参数
  const configureMotor = async (request: MotorConfigRequest) => {
    try {
      const response = await deviceConfigApi.configureMotor(request)

      if (response.success) {
        ElMessage.success(response.message)
      } else {
        ElMessage.error(response.message)
      }

      return response.success
    } catch (error) {
      console.error('电机参数配置失败:', error)
      ElMessage.error('电机参数配置失败')
      return false
    }
  }

  // ==================== 工具方法 ====================

  // 根据设备ID获取设备信息
  const getDeviceById = (deviceId: string): DeviceInfo | undefined => {
    return devices.value.find(device => device.deviceId === deviceId)
  }

  // 根据设备ID获取设备详情
  const getDeviceDetailById = (deviceId: string): DeviceData | undefined => {
    return deviceDetails.value.get(deviceId)
  }

  // 检查设备是否在线
  const isDeviceOnline = (deviceId: string): boolean => {
    const device = getDeviceById(deviceId)
    return device?.online || false
  }

  // 获取设备状态描述
  const getDeviceStatus = (deviceId: string): string => {
    const device = getDeviceById(deviceId)
    if (!device) return '未知'

    if (!device.online) return '离线'

    // 检查告警条件
    if (device.batteryVoltage && device.batteryVoltage < 20) return '低电压告警'
    if (device.gpsStatus !== 'A') return 'GPS异常'

    const now = Date.now()
    if (now - device.lastHeartbeat > 5 * 60 * 1000) return '心跳超时'

    return '正常'
  }

  // 设置筛选条件
  const setFilter = (newFilter: Partial<DeviceFilter>) => {
    filter.value = { ...filter.value, ...newFilter }
  }

  // 设置排序选项
  const setSortOption = (newSortOption: DeviceSortOption) => {
    sortOption.value = newSortOption
  }

  // 清除筛选条件
  const clearFilter = () => {
    filter.value = {
      status: 'all',
      batteryLevel: 'all',
      gpsStatus: 'all',
      searchText: ''
    }
  }

  // 批量操作设备
  const batchOperation = async (deviceIds: string[], operation: 'online' | 'offline' | 'reset') => {
    const results = []

    for (const deviceId of deviceIds) {
      try {
        switch (operation) {
          case 'reset':
            const resetResult = await resetDevice({
              deviceId,
              flag: 'A', // 默认清扫车
              code: '111111'
            })
            results.push({ deviceId, success: resetResult })
            break
          default:
            results.push({ deviceId, success: false, message: '不支持的操作' })
        }
      } catch (error) {
        results.push({ deviceId, success: false, error })
      }
    }

    return results
  }

  // ==================== 返回状态和方法 ====================
  return {
    // 状态
    devices,
    deviceDetails,
    statistics,
    alerts,
    loading,
    isWebSocketConnected,
    lastUpdateTime,
    filter,
    sortOption,

    // 计算属性
    onlineDevices,
    offlineDevices,
    warningDevices,
    deviceCount,
    connectionCount,
    filteredDevices,
    deviceStatistics,

    // WebSocket 方法
    initWebSocket,
    closeWebSocket,

    // API 方法
    fetchDevices,
    fetchDeviceDetail,
    fetchStatistics,
    fetchAlerts,
    refreshData,

    // 设备控制方法
    controlDevice,
    resetDevice,
    setDeviceMode,

    // 设备配置方法
    configureTcpIp,
    configureSchedule,
    configureMotor,

    // 工具方法
    getDeviceById,
    getDeviceDetailById,
    isDeviceOnline,
    getDeviceStatus,
    setFilter,
    setSortOption,
    clearFilter,
    batchOperation
  }
})