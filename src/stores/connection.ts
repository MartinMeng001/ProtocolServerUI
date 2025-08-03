import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import type {
  ConnectionInfo,
  MessageRequest,
  BroadcastRequest,
  ApiResponse
} from '@/types'
import { protocolApi } from '@/services/api'
import {
  getDeviceWebSocketService,
  WebSocketEventType,
  type ConnectionChangeMessage
} from '@/services/websocket'

// 连接统计信息接口
interface ConnectionStatistics {
  totalConnections: number
  activeConnections: number
  inactiveConnections: number
  todayNewConnections: number
  averageConnectionTime: number
  peakConnections: number
  connectionsByHour: number[]
}

// 连接筛选条件接口
interface ConnectionFilter {
  status?: 'all' | 'active' | 'inactive'
  deviceType?: string
  remoteAddress?: string
  searchText?: string
  timeRange?: {
    start: number
    end: number
  }
}

// 连接排序选项
interface ConnectionSortOption {
  field: 'connectionId' | 'remoteAddress' | 'connectedTime' | 'lastActivity'
  order: 'asc' | 'desc'
}

export const useConnectionStore = defineStore('connection', () => {
  // ==================== 状态定义 ====================
  const connections = ref<ConnectionInfo[]>([])
  const statistics = ref<ConnectionStatistics | null>(null)
  const loading = ref(false)
  const lastUpdateTime = ref<number>(0)
  const isWebSocketConnected = ref(false)

  // 筛选和排序状态
  const filter = ref<ConnectionFilter>({
    status: 'all',
    searchText: ''
  })
  const sortOption = ref<ConnectionSortOption>({
    field: 'connectedTime',
    order: 'desc'
  })

  // WebSocket服务实例
  let wsService = getDeviceWebSocketService()

  // ==================== 计算属性 ====================

  // 活跃连接
  const activeConnections = computed(() =>
    connections.value.filter(conn => conn.active)
  )

  // 非活跃连接
  const inactiveConnections = computed(() =>
    connections.value.filter(conn => !conn.active)
  )

  // 连接总数
  const connectionCount = computed(() => connections.value.length)

  // 活跃连接数
  const activeConnectionCount = computed(() => activeConnections.value.length)

  // 筛选后的连接列表
  const filteredConnections = computed(() => {
    let result = [...connections.value]

    // 按状态筛选
    if (filter.value.status !== 'all') {
      switch (filter.value.status) {
        case 'active':
          result = result.filter(conn => conn.active)
          break
        case 'inactive':
          result = result.filter(conn => !conn.active)
          break
      }
    }

    // 按设备类型筛选
    if (filter.value.deviceType) {
      result = result.filter(conn =>
        conn.deviceType === filter.value.deviceType
      )
    }

    // 按远程地址筛选
    if (filter.value.remoteAddress) {
      result = result.filter(conn =>
        conn.remoteAddress.includes(filter.value.remoteAddress!)
      )
    }

    // 按搜索文本筛选
    if (filter.value.searchText) {
      const searchText = filter.value.searchText.toLowerCase()
      result = result.filter(conn =>
        conn.connectionId.toLowerCase().includes(searchText) ||
        conn.remoteAddress.toLowerCase().includes(searchText) ||
        conn.localAddress?.toLowerCase().includes(searchText)
      )
    }

    // 按时间范围筛选
    if (filter.value.timeRange) {
      const { start, end } = filter.value.timeRange
      result = result.filter(conn =>
        conn.connectedTime >= start && conn.connectedTime <= end
      )
    }

    // 排序
    result.sort((a, b) => {
      const { field, order } = sortOption.value
      let aValue: any, bValue: any

      switch (field) {
        case 'connectionId':
          aValue = a.connectionId
          bValue = b.connectionId
          break
        case 'remoteAddress':
          aValue = a.remoteAddress
          bValue = b.remoteAddress
          break
        case 'connectedTime':
          aValue = a.connectedTime
          bValue = b.connectedTime
          break
        case 'lastActivity':
          aValue = a.lastActivity || 0
          bValue = b.lastActivity || 0
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

  // 按IP分组的连接统计
  const connectionsByIP = computed(() => {
    const ipMap = new Map<string, ConnectionInfo[]>()
    connections.value.forEach(conn => {
      const ip = conn.remoteAddress.split(':')[0]
      if (!ipMap.has(ip)) {
        ipMap.set(ip, [])
      }
      ipMap.get(ip)!.push(conn)
    })
    return Array.from(ipMap.entries()).map(([ip, conns]) => ({
      ip,
      count: conns.length,
      activeCount: conns.filter(c => c.active).length,
      connections: conns
    }))
  })

  // ==================== 动作方法 ====================

  // 初始化WebSocket连接
  const initWebSocket = async (): Promise<void> => {
    try {
      // 监听连接变化事件
      wsService.on(WebSocketEventType.CONNECTION_CHANGE, handleConnectionChange)

      // 监听WebSocket连接状态
      wsService.on(WebSocketEventType.OPEN, () => {
        isWebSocketConnected.value = true
        console.log('连接管理 WebSocket 已连接')
      })

      wsService.on(WebSocketEventType.CLOSE, () => {
        isWebSocketConnected.value = false
        console.log('连接管理 WebSocket 已断开')
      })

      wsService.on(WebSocketEventType.ERROR, (error) => {
        console.error('连接管理 WebSocket 错误:', error)
        ElMessage.error('WebSocket连接错误')
      })

      // 建立连接
      await wsService.connect()
    } catch (error) {
      console.error('初始化WebSocket失败:', error)
      ElMessage.error('初始化WebSocket连接失败')
    }
  }
// // 新增：获取连接列表
//   const fetchConnections = async (): Promise<void> => {
//     loading.value = true
//     try {
//       // 假设您的 API 接口是 /connections
//       const response = await protocolApi.getConnections()
//       connections.value = response.data.connections // 假设返回的数据结构如此
//       ElMessage.success('连接列表刷新成功')
//     } catch (error) {
//       console.error('获取连接列表失败:', error)
//       ElMessage.error('获取连接列表失败')
//     } finally {
//       loading.value = false
//     }
//   }
  // 处理连接变化消息
  const handleConnectionChange = (message: ConnectionChangeMessage): void => {
    const { connectionId, action, deviceId, remoteAddress } = message.data

    switch (action) {
      case 'connected':
        // 新连接建立
        const newConnection: ConnectionInfo = {
          connectionId,
          remoteAddress: remoteAddress || '',
          localAddress: '',
          active: true,
          connectedTime: Date.now(),
          exists: true,
          deviceId,
          lastActivity: Date.now()
        }

        // 检查是否已存在
        const existingIndex = connections.value.findIndex(
          conn => conn.connectionId === connectionId
        )

        if (existingIndex >= 0) {
          connections.value[existingIndex] = newConnection
        } else {
          connections.value.push(newConnection)
        }

        ElNotification({
          title: '新连接',
          message: `设备 ${deviceId || connectionId} 已连接`,
          type: 'success',
          duration: 3000
        })
        break

      case 'disconnected':
        // 连接断开
        const connIndex = connections.value.findIndex(
          conn => conn.connectionId === connectionId
        )

        if (connIndex >= 0) {
          connections.value[connIndex].active = false
          connections.value[connIndex].exists = false
          connections.value[connIndex].disconnectedTime = Date.now()
        }

        ElNotification({
          title: '连接断开',
          message: `设备 ${deviceId || connectionId} 连接已断开`,
          type: 'warning',
          duration: 3000
        })
        break
    }

    lastUpdateTime.value = Date.now()
  }

  // 获取所有连接
  const fetchConnections = async (): Promise<void> => {
    try {
      loading.value = true
      const response = await protocolApi.getConnections()

      if (response.success && response.data) {
        connections.value = response.data.map(conn => ({
          ...conn,
          lastActivity: conn.lastActivity || conn.connectedTime
        }))
        lastUpdateTime.value = Date.now()
      } else {
        throw new Error(response.message || '获取连接列表失败')
      }
    } catch (error) {
      console.error('获取连接列表失败:', error)
      ElMessage.error('获取连接列表失败')
    } finally {
      loading.value = false
    }
  }

  // 获取连接数量
  const fetchConnectionCount = async (): Promise<number> => {
    try {
      const response = await protocolApi.getConnectionCount()
      if (response.success && response.data) {
        return response.data.count
      }
      return 0
    } catch (error) {
      console.error('获取连接数量失败:', error)
      return 0
    }
  }

  // 获取连接状态
  const getConnectionStatus = async (connectionId: string): Promise<any> => {
    try {
      const response = await protocolApi.getConnectionStatus(connectionId)
      if (response.success) {
        return response.data
      }
      throw new Error(response.message || '获取连接状态失败')
    } catch (error) {
      console.error('获取连接状态失败:', error)
      ElMessage.error('获取连接状态失败')
      return null
    }
  }

  // 关闭连接
  const closeConnection = async (connectionId: string): Promise<boolean> => {
    try {
      const response = await protocolApi.closeConnection(connectionId)
      if (response.success) {
        // 更新本地状态
        const connIndex = connections.value.findIndex(
          conn => conn.connectionId === connectionId
        )
        if (connIndex >= 0) {
          connections.value[connIndex].active = false
          connections.value[connIndex].exists = false
          connections.value[connIndex].disconnectedTime = Date.now()
        }

        ElMessage.success('连接已关闭')
        return true
      } else {
        throw new Error(response.message || '关闭连接失败')
      }
    } catch (error) {
      console.error('关闭连接失败:', error)
      ElMessage.error('关闭连接失败')
      return false
    }
  }

  // 发送消息到指定连接
  const sendMessage = async (data: MessageRequest): Promise<boolean> => {
    try {
      const response = await protocolApi.sendMessage(data)
      if (response.success) {
        ElMessage.success('消息发送成功')

        // 更新连接的最后活动时间
        const connIndex = connections.value.findIndex(
          conn => conn.connectionId === data.connectionId
        )
        if (connIndex >= 0) {
          connections.value[connIndex].lastActivity = Date.now()
        }

        return true
      } else {
        throw new Error(response.message || '发送消息失败')
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      ElMessage.error('发送消息失败')
      return false
    }
  }

  // 广播消息
  const broadcastMessage = async (data: BroadcastRequest): Promise<boolean> => {
    try {
      const response = await protocolApi.broadcastMessage(data)
      if (response.success) {
        ElMessage.success('广播消息发送成功')

        // 更新所有活跃连接的最后活动时间
        const now = Date.now()
        connections.value.forEach(conn => {
          if (conn.active) {
            conn.lastActivity = now
          }
        })

        return true
      } else {
        throw new Error(response.message || '发送广播消息失败')
      }
    } catch (error) {
      console.error('发送广播消息失败:', error)
      ElMessage.error('发送广播消息失败')
      return false
    }
  }

  // 计算连接统计信息
  const calculateStatistics = (): void => {
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    const todayConnections = connections.value.filter(
      conn => conn.connectedTime >= oneDayAgo
    )

    const connectionTimes = connections.value
      .filter(conn => conn.disconnectedTime)
      .map(conn => (conn.disconnectedTime! - conn.connectedTime) / 1000)

    const averageConnectionTime = connectionTimes.length > 0
      ? connectionTimes.reduce((sum, time) => sum + time, 0) / connectionTimes.length
      : 0

    // 按小时统计连接数
    const connectionsByHour = Array(24).fill(0)
    connections.value.forEach(conn => {
      const hour = new Date(conn.connectedTime).getHours()
      connectionsByHour[hour]++
    })

    statistics.value = {
      totalConnections: connections.value.length,
      activeConnections: activeConnections.value.length,
      inactiveConnections: inactiveConnections.value.length,
      todayNewConnections: todayConnections.length,
      averageConnectionTime,
      peakConnections: Math.max(...connectionsByHour),
      connectionsByHour
    }
  }

  // 设置筛选条件
  const setFilter = (newFilter: Partial<ConnectionFilter>): void => {
    filter.value = { ...filter.value, ...newFilter }
  }

  // 设置排序选项
  const setSortOption = (newSortOption: ConnectionSortOption): void => {
    sortOption.value = newSortOption
  }

  // 清除筛选条件
  const clearFilter = (): void => {
    filter.value = {
      status: 'all',
      searchText: ''
    }
  }

  // 刷新连接列表
  const refreshConnections = async (): Promise<void> => {
    await fetchConnections()
    calculateStatistics()
  }

  // 清理资源
  const cleanup = (): void => {
    if (wsService) {
      wsService.off(WebSocketEventType.CONNECTION_CHANGE, handleConnectionChange)
      wsService.disconnect()
    }
    connections.value = []
    statistics.value = null
    isWebSocketConnected.value = false
  }

  // 根据连接ID查找连接
  const findConnectionById = (connectionId: string): ConnectionInfo | undefined => {
    return connections.value.find(conn => conn.connectionId === connectionId)
  }

  // 根据设备ID查找连接
  const findConnectionByDeviceId = (deviceId: string): ConnectionInfo | undefined => {
    return connections.value.find(conn => conn.deviceId === deviceId)
  }

  return {
    // 状态
    connections,
    statistics,
    loading,
    lastUpdateTime,
    isWebSocketConnected,
    filter,
    sortOption,

    // 计算属性
    activeConnections,
    inactiveConnections,
    connectionCount,
    activeConnectionCount,
    filteredConnections,
    connectionsByIP,

    // 方法
    initWebSocket,
    fetchConnections,
    fetchConnectionCount,
    getConnectionStatus,
    closeConnection,
    sendMessage,
    broadcastMessage,
    calculateStatistics,
    setFilter,
    setSortOption,
    clearFilter,
    refreshConnections,
    cleanup,
    findConnectionById,
    findConnectionByDeviceId
  }
})