import axios from 'axios'
import type {
  ApiResponse,
  DeviceInfo,
  DeviceData,
  ConnectionInfo,
  DeviceControlRequest,
  DeviceResetRequest,
  DeviceModeRequest,
  TcpIpConfigRequest,
  ScheduleConfigRequest,
  MotorConfigRequest,
  DeviceStatistics,
  DeviceAlerts,
  MessageRequest,
  BroadcastRequest
} from '@/types'

// 创建axios实例
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

// 协议管理API
export const protocolApi = {
  // 发送消息到指定连接
  sendMessage: (data: MessageRequest): Promise<ApiResponse> =>
    apiClient.post('/protocol/send', data),

  // 广播消息
  broadcastMessage: (data: BroadcastRequest): Promise<ApiResponse> =>
    apiClient.post('/protocol/broadcast', data),

  // 获取所有连接
  getConnections: (): Promise<ApiResponse<ConnectionInfo[]>> =>
    apiClient.get('/protocol/connections'),

  // 获取连接数
  getConnectionCount: (): Promise<ApiResponse<{ count: number }>> =>
    apiClient.get('/protocol/connections/count'),

  // 获取连接状态
  getConnectionStatus: (connectionId: string): Promise<ApiResponse> =>
    apiClient.get(`/protocol/connections/${connectionId}/status`),

  // 关闭连接
  closeConnection: (connectionId: string): Promise<ApiResponse> =>
    apiClient.delete(`/protocol/connections/${connectionId}`),
}

// 设备管理API
export const deviceApi = {
  // 获取设备列表
  getDeviceList: (): Promise<ApiResponse<DeviceInfo[]>> =>
    apiClient.get('/device/list'),

  // 获取设备详情
  getDeviceInfo: (deviceId: string): Promise<ApiResponse<DeviceData>> =>
    apiClient.get(`/device/${deviceId}`),

  // 查询系统状态
  querySystemStatus: (deviceId: string): Promise<ApiResponse> =>
    apiClient.post(`/device/${deviceId}/system/status`),

  // 查询系统设置
  querySystemSettings: (deviceId: string): Promise<ApiResponse> =>
    apiClient.post(`/device/${deviceId}/system/settings`),

  // 查询系统时间
  querySystemTime: (deviceId: string): Promise<ApiResponse> =>
    apiClient.post(`/device/${deviceId}/system/time`),
}

// 设备控制API
export const deviceControlApi = {
  // 设备重启
  resetDevice: (data: DeviceResetRequest): Promise<ApiResponse> =>
    apiClient.post('/device/control/reset', data),

  // 设备控制
  controlDevice: (data: DeviceControlRequest): Promise<ApiResponse> =>
    apiClient.post('/device/control/command', data),

  // 设置工作模式
  setWorkMode: (data: DeviceModeRequest): Promise<ApiResponse> =>
    apiClient.post('/device/control/mode', data),
}

// 设备配置API
export const deviceConfigApi = {
  // 配置TCP/IP
  configureTcpIp: (data: TcpIpConfigRequest): Promise<ApiResponse> =>
    apiClient.post('/device/config/tcpip', data),

  // 配置工作时间表
  configureSchedule: (data: ScheduleConfigRequest): Promise<ApiResponse> =>
    apiClient.post('/device/config/schedule', data),

  // 查询工作时间表
  querySchedule: (deviceId: string, week: number): Promise<ApiResponse> =>
    apiClient.get(`/device/config/${deviceId}/schedule/${week}`),

  // 配置电机参数
  configureMotor: (data: MotorConfigRequest): Promise<ApiResponse> =>
    apiClient.post('/device/config/motor', data),
}

// 监控统计API
export const monitorApi = {
  // 获取设备统计
  getDeviceStatistics: (): Promise<ApiResponse<DeviceStatistics>> =>
    apiClient.get('/monitor/statistics'),

  // 获取设备告警
  getDeviceAlerts: (): Promise<ApiResponse<DeviceAlerts>> =>
    apiClient.get('/monitor/alerts'),

  // 触发心跳检查
  checkHeartbeat: (): Promise<ApiResponse> =>
    apiClient.get('/monitor/heartbeat/check'),
}

// 健康检查API
export const healthApi = {
  // 健康检查
  getHealthStatus: (): Promise<ApiResponse> =>
    apiClient.get('/health'),
}

// API文档API
export const docApi = {
  // 获取API信息
  getApiInfo: (): Promise<ApiResponse> =>
    apiClient.get('/doc/info'),

  // 获取协议信息
  getProtocolInfo: (): Promise<ApiResponse> =>
    apiClient.get('/doc/protocol'),
}