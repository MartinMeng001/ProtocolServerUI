import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DeviceInfo, DeviceData, ConnectionInfo, DeviceStatistics, DeviceAlerts } from '@/types'
import { deviceApi, protocolApi, monitorApi } from '@/services/api'
import { ElMessage } from 'element-plus'

export const useDeviceStore = defineStore('device', () => {
  // 状态
  const devices = ref<DeviceInfo[]>([])
  const connections = ref<ConnectionInfo[]>([])
  const statistics = ref<DeviceStatistics | null>(null)
  const alerts = ref<DeviceAlerts | null>(null)
  const loading = ref(false)
  const websocket = ref<WebSocket | null>(null)
  const isConnected = ref(false)

  // 计算属性
  const onlineDevices = computed(() => devices.value.filter(d => d.online))
  const offlineDevices = computed(() => devices.value.filter(d => !d.online))
  const deviceCount = computed(() => devices.value.length)
  const connectionCount = computed(() => connections.value.length)

  // WebSocket连接
  const initWebSocket = () => {
    try {
      const wsUrl = `ws://${window.location.host}/ws/device`
      websocket.value = new WebSocket(wsUrl)

      websocket.value.onopen = () => {
        isConnected.value = true
        console.log('WebSocket连接已建立')
      }

      websocket.value.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleWebSocketMessage(data)
        } catch (error) {
          console.error('解析WebSocket消息失败:', error)
        }
      }

      websocket.value.onclose = () => {
        isConnected.value = false
        console.log('WebSocket连接已关闭')
        // 5秒后重连
        setTimeout(() => {
          if (!isConnected.value) {
            initWebSocket()
          }
        }, 5000)
      }

      websocket.value.onerror = (error) => {
        console.error('WebSocket错误:', error)
        isConnected.value = false
      }
    } catch (error) {
      console.error('初始化WebSocket失败:', error)
    }
  }

  // 处理WebSocket消息
  const handleWebSocketMessage = (data: any) => {
    if (Array.isArray(data)) {
      // 如果是设备列表数据
      updateDevicesFromData(data)
    } else if (data.ID) {
      // 如果是单个设备数据更新
      updateSingleDevice(data)
    }
  }

  // 更新设备列表
  const updateDevicesFromData = (deviceDataList: DeviceData[]) => {
    // 这里可以根据实际需要转换数据格式
    console.log('收到设备列表更新:', deviceDataList)
  }

  // 更新单个设备
  const updateSingleDevice = (deviceData: DeviceData) => {
    const index = devices.value.findIndex(d => d.deviceId === deviceData.ID)
    if (index !== -1) {
      // 更新现有设备
      devices.value[index] = {
        ...devices.value[index],
        mode: deviceData.Mode,
        batteryVoltage: deviceData.V,
        gpsStatus: deviceData.status,
        latitude: deviceData.lat,
        longitude: deviceData.lon,
        lastHeartbeat: Date.now(),
      }
    }
  }

  // 获取设备列表
  const fetchDevices = async () => {
    try {
      loading.value = true
      const response = await deviceApi.getDeviceList()
      if (response.success) {
        devices.value = response.data
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

  // 获取连接列表
  const fetchConnections = async () => {
    try {
      const response = await protocolApi.getConnections()
      if (response.success) {
        connections.value = response.data
      }
    } catch (error) {
      console.error('获取连接列表失败:', error)
    }
  }

  // 获取统计信息
  const fetchStatistics = async () => {
    try {
      const response = await monitorApi.getDeviceStatistics()
      if (response.success) {
        statistics.value = response.data
      }
    } catch (error) {
      console.error('获取统计信息失败:', error)
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
      fetchConnections(),
      fetchStatistics(),
      fetchAlerts(),
    ])
  }

  // 销毁WebSocket连接
  const closeWebSocket = () => {
    if (websocket.value) {
      websocket.value.close()
      websocket.value = null
      isConnected.value = false
    }
  }

  return {
    // 状态
    devices,
    connections,
    statistics,
    alerts,
    loading,
    isConnected,

    // 计算属性
    onlineDevices,
    offlineDevices,
    deviceCount,
    connectionCount,

    // 方法
    initWebSocket,
    closeWebSocket,
    fetchDevices,
    fetchConnections,
    fetchStatistics,
    fetchAlerts,
    refreshData,
  }
})