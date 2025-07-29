import { ElMessage } from 'element-plus'
import type { DeviceData } from '@/types'

// WebSocket连接状态枚举
export enum WebSocketState {
  CONNECTING = 0,  // 正在连接
  OPEN = 1,        // 已连接
  CLOSING = 2,     // 正在关闭
  CLOSED = 3       // 已关闭
}

// WebSocket事件类型
export enum WebSocketEventType {
  OPEN = 'open',
  CLOSE = 'close',
  ERROR = 'error',
  MESSAGE = 'message',
  DEVICE_UPDATE = 'device-update',
  DEVICE_OFFLINE = 'device-offline',
  DEVICE_ONLINE = 'device-online',
  SYSTEM_ALERT = 'system-alert',
  CONNECTION_CHANGE = 'connection-change'
}

// WebSocket消息类型
export interface WebSocketMessage {
  type: string
  data: any
  timestamp: number
}

// 设备更新消息
export interface DeviceUpdateMessage extends WebSocketMessage {
  type: 'device-update'
  data: DeviceData
}

// 系统告警消息
export interface SystemAlertMessage extends WebSocketMessage {
  type: 'system-alert'
  data: {
    level: 'info' | 'warning' | 'error'
    title: string
    message: string
    deviceId?: string
  }
}

// 连接变化消息
export interface ConnectionChangeMessage extends WebSocketMessage {
  type: 'connection-change'
  data: {
    connectionId: string
    action: 'connected' | 'disconnected'
    deviceId?: string
    remoteAddress?: string
  }
}

// WebSocket配置接口
export interface WebSocketConfig {
  url: string
  protocols?: string | string[]
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
  heartbeatTimeout?: number
  enableAutoReconnect?: boolean
  enableHeartbeat?: boolean
  debug?: boolean
}

// 事件监听器类型
export type WebSocketEventListener<T = any> = (data: T) => void

// WebSocket服务类
export class WebSocketService {
  private ws: WebSocket | null = null
  private config: Required<WebSocketConfig>
  private reconnectAttempts = 0
  private heartbeatTimer: number | null = null
  private heartbeatTimeoutTimer: number | null = null
  private reconnectTimer: number | null = null
  private isManualClose = false
  private eventListeners: Map<string, Set<WebSocketEventListener>> = new Map()

  constructor(config: WebSocketConfig) {
    this.config = {
      protocols: [],
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      heartbeatTimeout: 5000,
      enableAutoReconnect: true,
      enableHeartbeat: true,
      debug: false,
      ...config
    }

    this.initEventListeners()
  }

  // 初始化事件监听器
  private initEventListeners(): void {
    // 为每种事件类型初始化监听器集合
    Object.values(WebSocketEventType).forEach(eventType => {
      this.eventListeners.set(eventType, new Set())
    })
  }

  // 连接WebSocket
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocketState.OPEN) {
        resolve()
        return
      }

      this.isManualClose = false
      this.log('正在连接WebSocket...', this.config.url)

      try {
        this.ws = new WebSocket(this.config.url, this.config.protocols)

        this.ws.onopen = (event) => {
          this.log('WebSocket连接已建立')
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.emit(WebSocketEventType.OPEN, event)
          resolve()
        }

        this.ws.onclose = (event) => {
          this.log('WebSocket连接已关闭', { code: event.code, reason: event.reason })
          this.cleanup()
          this.emit(WebSocketEventType.CLOSE, event)

          if (!this.isManualClose && this.config.enableAutoReconnect) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = (event) => {
          this.log('WebSocket连接错误', event)
          this.emit(WebSocketEventType.ERROR, event)
          reject(new Error('WebSocket连接失败'))
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event)
        }

      } catch (error) {
        this.log('创建WebSocket连接失败', error)
        reject(error)
      }
    })
  }

  // 断开连接
  public disconnect(): void {
    this.log('手动断开WebSocket连接')
    this.isManualClose = true
    this.cleanup()

    if (this.ws) {
      this.ws.close(1000, '正常关闭')
      this.ws = null
    }
  }

  // 发送消息
  public send(data: any): boolean {
    if (!this.isConnected()) {
      this.log('WebSocket未连接，无法发送消息', data)
      return false
    }

    try {
      const message: WebSocketMessage = {
        type: 'client-message',
        data,
        timestamp: Date.now()
      }

      this.ws!.send(JSON.stringify(message))
      this.log('发送消息', message)
      return true
    } catch (error) {
      this.log('发送消息失败', error)
      return false
    }
  }

  // 发送心跳
  private sendHeartbeat(): void {
    if (this.isConnected()) {
      this.send({ type: 'heartbeat' })
      this.log('发送心跳')

      // 设置心跳超时定时器
      this.heartbeatTimeoutTimer = window.setTimeout(() => {
        this.log('心跳超时，重新连接')
        this.reconnect()
      }, this.config.heartbeatTimeout)
    }
  }

  // 开始心跳
  private startHeartbeat(): void {
    if (!this.config.enableHeartbeat) return

    this.stopHeartbeat()
    this.heartbeatTimer = window.setInterval(() => {
      this.sendHeartbeat()
    }, this.config.heartbeatInterval)
  }

  // 停止心跳
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
  }

  // 处理接收到的消息
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      this.log('接收到消息', message)

      // 处理心跳响应
      if (message.type === 'heartbeat-response') {
        if (this.heartbeatTimeoutTimer) {
          clearTimeout(this.heartbeatTimeoutTimer)
          this.heartbeatTimeoutTimer = null
        }
        return
      }

      // 触发通用消息事件
      this.emit(WebSocketEventType.MESSAGE, message)

      // 根据消息类型触发特定事件
      switch (message.type) {
        case 'device-update':
          this.handleDeviceUpdate(message as DeviceUpdateMessage)
          break
        case 'device-online':
          this.emit(WebSocketEventType.DEVICE_ONLINE, message.data)
          break
        case 'device-offline':
          this.emit(WebSocketEventType.DEVICE_OFFLINE, message.data)
          break
        case 'system-alert':
          this.handleSystemAlert(message as SystemAlertMessage)
          break
        case 'connection-change':
          this.emit(WebSocketEventType.CONNECTION_CHANGE, message.data)
          break
        default:
          this.log('未知消息类型', message.type)
      }

    } catch (error) {
      this.log('解析消息失败', error)
    }
  }

  // 处理设备更新消息
  private handleDeviceUpdate(message: DeviceUpdateMessage): void {
    this.emit(WebSocketEventType.DEVICE_UPDATE, message.data)
  }

  // 处理系统告警消息
  private handleSystemAlert(message: SystemAlertMessage): void {
    const { level, title, message: alertMessage } = message.data

    // 显示用户通知
    switch (level) {
      case 'error':
        ElMessage.error(`${title}: ${alertMessage}`)
        break
      case 'warning':
        ElMessage.warning(`${title}: ${alertMessage}`)
        break
      case 'info':
        ElMessage.info(`${title}: ${alertMessage}`)
        break
    }

    this.emit(WebSocketEventType.SYSTEM_ALERT, message.data)
  }

  // 计划重连
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log('超过最大重连次数，停止重连')
      ElMessage.error('WebSocket连接失败，请检查网络状态')
      return
    }

    this.reconnectAttempts++
    const delay = this.config.reconnectInterval * Math.pow(2, Math.min(this.reconnectAttempts - 1, 5))

    this.log(`第${this.reconnectAttempts}次重连，${delay}ms后重试`)

    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch(error => {
        this.log('重连失败', error)
      })
    }, delay)
  }

  // 重新连接
  public reconnect(): void {
    this.disconnect()
    this.connect().catch(error => {
      this.log('重连失败', error)
    })
  }

  // 清理资源
  private cleanup(): void {
    this.stopHeartbeat()

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  // 检查连接状态
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocketState.OPEN
  }

  // 获取连接状态
  public getState(): WebSocketState {
    return this.ws ? this.ws.readyState : WebSocketState.CLOSED
  }

  // 获取连接URL
  public getUrl(): string {
    return this.config.url
  }

  // 添加事件监听器
  public on<T = any>(event: WebSocketEventType, listener: WebSocketEventListener<T>): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.add(listener)
    }
  }

  // 移除事件监听器
  public off<T = any>(event: WebSocketEventType, listener: WebSocketEventListener<T>): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  // 移除所有事件监听器
  public removeAllListeners(event?: WebSocketEventType): void {
    if (event) {
      const listeners = this.eventListeners.get(event)
      if (listeners) {
        listeners.clear()
      }
    } else {
      this.eventListeners.forEach(listeners => listeners.clear())
    }
  }

  // 触发事件
  private emit(event: WebSocketEventType, data?: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          this.log('事件监听器执行错误', error)
        }
      })
    }
  }

  // 日志输出
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      const timestamp = new Date().toLocaleTimeString()
      console.log(`[WebSocket ${timestamp}] ${message}`, data || '')
    }
  }

  // 获取连接统计信息
  public getStats(): {
    state: WebSocketState
    reconnectAttempts: number
    isManualClose: boolean
    hasHeartbeat: boolean
  } {
    return {
      state: this.getState(),
      reconnectAttempts: this.reconnectAttempts,
      isManualClose: this.isManualClose,
      hasHeartbeat: this.heartbeatTimer !== null
    }
  }
}

// WebSocket管理器类 - 单例模式
export class WebSocketManager {
  private static instance: WebSocketManager | null = null
  private services: Map<string, WebSocketService> = new Map()

  private constructor() {}

  // 获取单例实例
  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager()
    }
    return WebSocketManager.instance
  }

  // 创建WebSocket服务
  public createService(name: string, config: WebSocketConfig): WebSocketService {
    if (this.services.has(name)) {
      throw new Error(`WebSocket服务 "${name}" 已存在`)
    }

    const service = new WebSocketService(config)
    this.services.set(name, service)
    return service
  }

  // 获取WebSocket服务
  public getService(name: string): WebSocketService | undefined {
    return this.services.get(name)
  }

  // 移除WebSocket服务
  public removeService(name: string): boolean {
    const service = this.services.get(name)
    if (service) {
      service.disconnect()
      return this.services.delete(name)
    }
    return false
  }

  // 获取所有服务
  public getAllServices(): Map<string, WebSocketService> {
    return new Map(this.services)
  }

  // 断开所有连接
  public disconnectAll(): void {
    this.services.forEach(service => {
      service.disconnect()
    })
  }

  // 重连所有连接
  public reconnectAll(): void {
    this.services.forEach(service => {
      if (!service.isConnected()) {
        service.reconnect()
      }
    })
  }

  // 获取所有服务状态
  public getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {}
    this.services.forEach((service, name) => {
      stats[name] = service.getStats()
    })
    return stats
  }
}

// 设备WebSocket服务工厂
export class DeviceWebSocketFactory {
  // 创建设备WebSocket服务
  public static createDeviceService(config?: Partial<WebSocketConfig>): WebSocketService {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8081/ws'
    const deviceWsUrl = `${wsUrl}/device`

    const defaultConfig: WebSocketConfig = {
      url: deviceWsUrl,
      protocols: ['device-protocol'],
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      heartbeatTimeout: 5000,
      enableAutoReconnect: true,
      enableHeartbeat: true,
      debug: import.meta.env.VITE_DEBUG === 'true',
      ...config
    }

    return new WebSocketService(defaultConfig)
  }

  // 创建监控WebSocket服务
  public static createMonitorService(config?: Partial<WebSocketConfig>): WebSocketService {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8081/ws'
    const monitorWsUrl = `${wsUrl}/monitor`

    const defaultConfig: WebSocketConfig = {
      url: monitorWsUrl,
      protocols: ['monitor-protocol'],
      reconnectInterval: 2000,
      maxReconnectAttempts: 15,
      heartbeatInterval: 20000,
      heartbeatTimeout: 3000,
      enableAutoReconnect: true,
      enableHeartbeat: true,
      debug: import.meta.env.VITE_DEBUG === 'true',
      ...config
    }

    return new WebSocketService(defaultConfig)
  }

  // 创建系统WebSocket服务
  public static createSystemService(config?: Partial<WebSocketConfig>): WebSocketService {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8081/ws'
    const systemWsUrl = `${wsUrl}/system`

    const defaultConfig: WebSocketConfig = {
      url: systemWsUrl,
      protocols: ['system-protocol'],
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 60000,
      heartbeatTimeout: 10000,
      enableAutoReconnect: true,
      enableHeartbeat: true,
      debug: import.meta.env.VITE_DEBUG === 'true',
      ...config
    }

    return new WebSocketService(defaultConfig)
  }
}

// WebSocket工具函数
export const webSocketUtils = {
  // 检查WebSocket支持
  isWebSocketSupported(): boolean {
    return 'WebSocket' in window
  },

  // 获取WebSocket状态文本
  getStateText(state: WebSocketState): string {
    const stateMap = {
      [WebSocketState.CONNECTING]: '连接中',
      [WebSocketState.OPEN]: '已连接',
      [WebSocketState.CLOSING]: '关闭中',
      [WebSocketState.CLOSED]: '已关闭'
    }
    return stateMap[state] || '未知状态'
  },

  // 创建WebSocket URL
  createWebSocketUrl(path: string, protocol: 'ws' | 'wss' = 'ws'): string {
    const host = window.location.host
    return `${protocol}://${host}${path}`
  },

  // 验证WebSocket URL格式
  isValidWebSocketUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return urlObj.protocol === 'ws:' || urlObj.protocol === 'wss:'
    } catch {
      return false
    }
  },

  // 格式化连接时长
  formatConnectionDuration(startTime: number): string {
    const duration = Date.now() - startTime
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`
    } else {
      return `${seconds}秒`
    }
  },

  // 计算重连延迟（指数退避）
  calculateReconnectDelay(attempt: number, baseDelay: number = 1000): number {
    return Math.min(baseDelay * Math.pow(2, attempt), 30000) // 最大30秒
  }
}

// 预定义的WebSocket服务实例
let deviceWebSocketService: WebSocketService | null = null
let monitorWebSocketService: WebSocketService | null = null
let systemWebSocketService: WebSocketService | null = null

// 获取设备WebSocket服务实例
export const getDeviceWebSocketService = (): WebSocketService => {
  if (!deviceWebSocketService) {
    deviceWebSocketService = DeviceWebSocketFactory.createDeviceService()
  }
  return deviceWebSocketService
}

// 获取监控WebSocket服务实例
export const getMonitorWebSocketService = (): WebSocketService => {
  if (!monitorWebSocketService) {
    monitorWebSocketService = DeviceWebSocketFactory.createMonitorService()
  }
  return monitorWebSocketService
}

// 获取系统WebSocket服务实例
export const getSystemWebSocketService = (): WebSocketService => {
  if (!systemWebSocketService) {
    systemWebSocketService = DeviceWebSocketFactory.createSystemService()
  }
  return systemWebSocketService
}

// 初始化WebSocket服务
export const initWebSocketServices = async (): Promise<void> => {
  try {
    // 检查WebSocket支持
    if (!webSocketUtils.isWebSocketSupported()) {
      throw new Error('浏览器不支持WebSocket')
    }

    // 获取管理器实例
    const manager = WebSocketManager.getInstance()

    // 创建并连接设备服务
    const deviceService = DeviceWebSocketFactory.createDeviceService()
    manager.createService = (name: string) => deviceService // 简化注册
    await deviceService.connect()

    console.log('WebSocket服务初始化成功')
  } catch (error) {
    console.error('WebSocket服务初始化失败:', error)
    ElMessage.error('WebSocket连接失败，实时功能可能无法正常使用')
  }
}

// 清理WebSocket服务
export const cleanupWebSocketServices = (): void => {
  const manager = WebSocketManager.getInstance()
  manager.disconnectAll()

  // 清理全局实例
  deviceWebSocketService = null
  monitorWebSocketService = null
  systemWebSocketService = null

  console.log('WebSocket服务已清理')
}

// 默认导出WebSocket服务类
export default WebSocketService

// 导出类型
export type {
  WebSocketConfig,
  WebSocketMessage,
  DeviceUpdateMessage,
  SystemAlertMessage,
  ConnectionChangeMessage,
  WebSocketEventListener
}