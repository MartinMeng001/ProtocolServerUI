import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
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
  BroadcastRequest,
  HealthCheckResponse,
  ApiDocInfo,
  ProtocolInfo
} from '@/types'

// API配置接口
interface ApiConfig {
  baseURL: string
  timeout: number
  withCredentials: boolean
  headers?: Record<string, string>
}

// 请求拦截器配置
interface RequestInterceptorConfig {
  onRequest?: (config: AxiosRequestConfig) => AxiosRequestConfig
  onRequestError?: (error: any) => Promise<any>
}

// 响应拦截器配置
interface ResponseInterceptorConfig {
  onResponse?: (response: AxiosResponse) => any
  onResponseError?: (error: AxiosError) => Promise<any>
}

// 创建API配置
const createApiConfig = (): ApiConfig => ({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// 创建axios实例
const createApiClient = (config: ApiConfig): AxiosInstance => {
  const client = axios.create(config)

  // 设置请求拦截器
  setupRequestInterceptor(client)

  // 设置响应拦截器
  setupResponseInterceptor(client)

  return client
}

// 设置请求拦截器
const setupRequestInterceptor = (client: AxiosInstance): void => {
  client.interceptors.request.use(
    (config) => {
      // 添加时间戳防止缓存
      if (config.method === 'get') {
        config.params = {
          ...config.params,
          _t: Date.now()
        }
      }

      // 添加认证token（如果需要）
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`
        }
      }

      // 记录请求日志
      if (import.meta.env.VITE_DEBUG === 'true') {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data
        })
      }

      return config
    },
    (error) => {
      console.error('[API Request Error]', error)
      return Promise.reject(error)
    }
  )
}

// 设置响应拦截器
const setupResponseInterceptor = (client: AxiosInstance): void => {
  client.interceptors.response.use(
    (response) => {
      // 记录响应日志
      if (import.meta.env.VITE_DEBUG === 'true') {
        console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)
      }

      // 统一处理响应数据
      const data = response.data

      // 如果是标准的ApiResponse格式
      if (typeof data === 'object' && data !== null && 'success' in data) {
        return data
      }

      // 如果不是标准格式，包装成标准格式
      return {
        success: true,
        message: 'success',
        data: data
      } as ApiResponse
    },
    async (error: AxiosError) => {
      console.error('[API Response Error]', error)

      // 处理网络错误
      if (!error.response) {
        ElMessage.error('网络连接失败，请检查网络设置')
        return Promise.reject(new Error('网络连接失败'))
      }

      const { status, data } = error.response

      // 处理不同的HTTP状态码
      switch (status) {
        case 400:
          ElMessage.error(data?.message || '请求参数错误')
          break
        case 401:
          ElMessage.error('认证失败，请重新登录')
          // 清除认证信息并跳转到登录页
          localStorage.removeItem('auth_token')
          window.location.href = '/login'
          break
        case 403:
          ElMessage.error('权限不足，无法访问该资源')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 408:
          ElMessage.error('请求超时，请稍后重试')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        case 502:
          ElMessage.error('网关错误')
          break
        case 503:
          ElMessage.error('服务暂时不可用')
          break
        case 504:
          ElMessage.error('网关超时')
          break
        default:
          ElMessage.error(data?.message || `请求失败 (${status})`)
      }

      // 返回标准错误格式
      const errorResponse: ApiResponse = {
        success: false,
        message: data?.message || `HTTP ${status} Error`,
        data: null
      }

      return Promise.reject(errorResponse)
    }
  )
}

// 创建API客户端实例
const apiClient = createApiClient(createApiConfig())

// 通用请求方法
const request = async <T = any>(config: AxiosRequestConfig): Promise<ApiResponse<T>> => {
  try {
    const response = await apiClient.request<ApiResponse<T>>(config)
    return response
  } catch (error) {
    throw error
  }
}

// GET请求
const get = <T = any>(url: string, params?: any): Promise<ApiResponse<T>> => {
  return request<T>({ method: 'GET', url, params })
}

// POST请求
const post = <T = any>(url: string, data?: any): Promise<ApiResponse<T>> => {
  return request<T>({ method: 'POST', url, data })
}

// PUT请求
const put = <T = any>(url: string, data?: any): Promise<ApiResponse<T>> => {
  return request<T>({ method: 'PUT', url, data })
}

// DELETE请求
const del = <T = any>(url: string, params?: any): Promise<ApiResponse<T>> => {
  return request<T>({ method: 'DELETE', url, params })
}

// 协议管理API
export const protocolApi = {
  // 发送消息到指定连接
  sendMessage(data: MessageRequest): Promise<ApiResponse> {
    return post('/protocol/send', data)
  },

  // 广播消息
  broadcastMessage(data: BroadcastRequest): Promise<ApiResponse> {
    return post('/protocol/broadcast', data)
  },

  // 获取所有连接
  getConnections(): Promise<ApiResponse<ConnectionInfo[]>> {
    return get('/protocol/connections')
  },

  // 获取连接数
  getConnectionCount(): Promise<ApiResponse<{ count: number }>> {
    return get('/protocol/connections/count')
  },

  // 获取连接状态
  getConnectionStatus(connectionId: string): Promise<ApiResponse> {
    return get(`/protocol/connections/${connectionId}/status`)
  },

  // 关闭连接
  closeConnection(connectionId: string): Promise<ApiResponse> {
    return del(`/protocol/connections/${connectionId}`)
  }
}

// 设备管理API
export const deviceApi = {
  // 获取设备列表
  getDeviceList(): Promise<ApiResponse<DeviceInfo[]>> {
    return get('/device/list')
  },

  // 获取设备详情
  getDeviceInfo(deviceId: string): Promise<ApiResponse<DeviceData>> {
    return get(`/device/${deviceId}`)
  },

  // 查询系统状态
  querySystemStatus(deviceId: string): Promise<ApiResponse> {
    return post(`/device/${deviceId}/system/status`)
  },

  // 查询系统设置
  querySystemSettings(deviceId: string): Promise<ApiResponse> {
    return post(`/device/${deviceId}/system/settings`)
  },

  // 查询系统时间
  querySystemTime(deviceId: string): Promise<ApiResponse> {
    return post(`/device/${deviceId}/system/time`)
  }
}

// 设备控制API
export const deviceControlApi = {
  // 设备重启
  resetDevice(data: DeviceResetRequest): Promise<ApiResponse> {
    return post('/device/control/reset', data)
  },

  // 设备控制
  controlDevice(data: DeviceControlRequest): Promise<ApiResponse> {
    return post('/device/control/command', data)
  },

  // 设置工作模式
  setWorkMode(data: DeviceModeRequest): Promise<ApiResponse> {
    return post('/device/control/mode', data)
  }
}

// 设备配置API
export const deviceConfigApi = {
  // 配置TCP/IP
  configureTcpIp(data: TcpIpConfigRequest): Promise<ApiResponse> {
    return post('/device/config/tcpip', data)
  },

  // 配置工作时间表
  configureSchedule(data: ScheduleConfigRequest): Promise<ApiResponse> {
    return post('/device/config/schedule', data)
  },

  // 查询工作时间表
  querySchedule(deviceId: string, week: number): Promise<ApiResponse> {
    return get(`/device/config/${deviceId}/schedule/${week}`)
  },

  // 配置电机参数
  configureMotor(data: MotorConfigRequest): Promise<ApiResponse> {
    return post('/device/config/motor', data)
  }
}

// 监控统计API
export const monitorApi = {
  // 获取设备统计
  getDeviceStatistics(): Promise<ApiResponse<DeviceStatistics>> {
    return get('/monitor/statistics')
  },

  // 获取设备告警
  getDeviceAlerts(): Promise<ApiResponse<DeviceAlerts>> {
    return get('/monitor/alerts')
  },

  // 触发心跳检查
  checkHeartbeat(): Promise<ApiResponse> {
    return get('/monitor/heartbeat/check')
  }
}

// 健康检查API
export const healthApi = {
  // 健康检查
  getHealthStatus(): Promise<ApiResponse<HealthCheckResponse>> {
    return get('/health')
  }
}

// API文档API
export const docApi = {
  // 获取API信息
  getApiInfo(): Promise<ApiResponse<ApiDocInfo>> {
    return get('/doc/info')
  },

  // 获取协议信息
  getProtocolInfo(): Promise<ApiResponse<ProtocolInfo>> {
    return get('/doc/protocol')
  }
}

// 文件上传API
export const uploadApi = {
  // 上传文件
  uploadFile(file: File, onProgress?: (progressEvent: any) => void): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData()
    formData.append('file', file)

    return request({
      method: 'POST',
      url: '/upload',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: onProgress
    })
  },

  // 上传设备配置文件
  uploadDeviceConfig(deviceId: string, file: File): Promise<ApiResponse> {
    const formData = new FormData()
    formData.append('config', file)

    return request({
      method: 'POST',
      url: `/device/${deviceId}/upload-config`,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}

// 导出API
export const exportApi = {
  // 导出设备数据
  exportDeviceData(deviceIds?: string[], format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    return apiClient.request({
      method: 'POST',
      url: '/export/devices',
      data: { deviceIds, format },
      responseType: 'blob'
    }).then(response => response.data)
  },

  // 导出设备日志
  exportDeviceLogs(deviceId: string, startTime?: string, endTime?: string): Promise<Blob> {
    return apiClient.request({
      method: 'GET',
      url: `/export/logs/${deviceId}`,
      params: { startTime, endTime },
      responseType: 'blob'
    }).then(response => response.data)
  },

  // 导出系统报告
  exportSystemReport(reportType: string): Promise<Blob> {
    return apiClient.request({
      method: 'GET',
      url: `/export/report/${reportType}`,
      responseType: 'blob'
    }).then(response => response.data)
  }
}

// 批量操作API
export const batchApi = {
  // 批量控制设备
  batchControlDevices(deviceIds: string[], command: DeviceControlRequest): Promise<ApiResponse> {
    return post('/batch/control', {
      deviceIds,
      command
    })
  },

  // 批量配置设备
  batchConfigureDevices(deviceIds: string[], config: any): Promise<ApiResponse> {
    return post('/batch/configure', {
      deviceIds,
      config
    })
  },

  // 批量重启设备
  batchResetDevices(deviceIds: string[], resetData: Omit<DeviceResetRequest, 'deviceId'>): Promise<ApiResponse> {
    return post('/batch/reset', {
      deviceIds,
      resetData
    })
  }
}

// 实时数据API
export const realtimeApi = {
  // 获取设备实时状态
  getDeviceRealtimeStatus(deviceId: string): Promise<ApiResponse<DeviceData>> {
    return get(`/realtime/device/${deviceId}/status`)
  },

  // 获取系统实时统计
  getSystemRealtimeStats(): Promise<ApiResponse<DeviceStatistics>> {
    return get('/realtime/system/stats')
  },

  // 获取实时告警
  getRealtimeAlerts(): Promise<ApiResponse<DeviceAlerts>> {
    return get('/realtime/alerts')
  }
}

// API工具函数
export const apiUtils = {
  // 检查API连接状态
  async checkConnection(): Promise<boolean> {
    try {
      await healthApi.getHealthStatus()
      return true
    } catch {
      return false
    }
  },

  // 重试请求
  async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await requestFn()
      } catch (error) {
        lastError = error
        if (i < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
        }
      }
    }

    throw lastError
  },

  // 并发请求控制
  async concurrentRequests<T>(
    requests: (() => Promise<T>)[],
    maxConcurrent: number = 5
  ): Promise<T[]> {
    const results: T[] = []
    const executing: Promise<void>[] = []

    for (const request of requests) {
      const promise = request().then(result => {
        results.push(result)
      })

      executing.push(promise)

      if (executing.length >= maxConcurrent) {
        await Promise.race(executing)
        executing.splice(executing.findIndex(p => p === promise), 1)
      }
    }

    await Promise.all(executing)
    return results
  },

  // 下载文件
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },

  // 格式化文件大小
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// 默认导出API客户端实例
export default apiClient

// 导出请求方法
export { get, post, put, del, request }