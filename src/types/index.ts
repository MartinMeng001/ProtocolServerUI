// ==================== API 通用类型 ====================

// API响应基础接口
export interface ApiResponse<T = any> {
  success: boolean              // 请求是否成功
  message: string               // 响应消息
  data: T                       // 响应数据
  timestamp?: number            // 时间戳
  code?: string                 // 响应码
}

// ==================== 设备相关类型 ====================

// 设备数据模型 - 来自硬件协议的完整数据结构
export interface DeviceData {
  ID?: string                   // 设备ID
  MODE?: string                 // 工作模式
  Mode?: number                 // 工作模式数值
  VER?: string                  // 版本号
  GPS?: string                  // GPS数据
  V?: number                    // 电池电压
  A?: number                    // 电流
  status?: string               // GPS状态
  lat?: string                  // 纬度
  lon?: string                  // 经度
  Temp?: number                 // 温度
  TempAlarm?: number            // 温度报警
  CurrentAlarm?: number         // 电流报警
  MotorStatus?: number          // 电机状态
  MotorDirection?: number       // 电机方向
  MotorSpeed?: number           // 电机转速
  MotorCurrent?: number         // 电机电流

  // 电机参数
  Vcall?: number                // 报警电压
  Cnone?: number                // 空转电流
  Cover?: number                // 过载电流
  enable?: number               // 是否启用
  Ccoef?: number                // C系数
  LoraChannel?: number          // Lora通道
  Dcoef?: number                // D系数
  VCguard?: number              // VC保护
  count?: number                // 计数
  TCPIP?: string                // TCP/IP地址
  LoraADDR?: number             // Lora地址
  NETmode?: number              // 网络模式
  Cmin?: number                 // 最小电流
  Cmax?: number                 // 最大电流
  FastIO?: number               // 快速IO
  PWMwitdh?: number             // PWM宽度
  B?: number                    // B值
  Vcoef?: number                // V系数
  Vmin?: number                 // 最小电压
  port?: string                 // 端口
  Tb?: number                   // Tb值

  // 时间信息
  year?: number                 // 年
  mon?: number                  // 月
  day?: number                  // 日
  hous?: number                 // 时
  minu?: number                 // 分
  sec?: number                  // 秒
  week?: number                 // 星期

  // 工作时间段配置
  H?: string                    // 第一时段小时
  M?: string                    // 第一时段分钟
  dolly?: string                // 第一时段是否启动
  H1?: string                   // 第二时段小时
  M1?: string                   // 第二时段分钟
  dolly1?: string               // 第二时段是否启动
  H2?: string                   // 第三时段小时
  M2?: string                   // 第三时段分钟
  dolly2?: string               // 第三时段是否启动

  // 其他字段
  [key: string]: any            // 允许其他动态字段
}

// 设备信息模型 - 用于列表显示
export interface DeviceInfo {
  deviceId: string              // 设备ID
  connectionId?: string         // 连接ID
  remoteAddress?: string        // 远程地址
  online: boolean               // 是否在线
  lastHeartbeat: number         // 最后心跳时间戳
  mode?: number                 // 工作模式
  batteryVoltage?: number       // 电池电压
  gpsStatus?: string            // GPS状态
  latitude?: string             // 纬度
  longitude?: string            // 经度
}

// 连接信息
export interface ConnectionInfo {
  connectionId: string          // 连接ID
  remoteAddress: string         // 远程地址
  localAddress?: string         // 本地地址
  active: boolean               // 是否活跃
  connectedTime: number         // 连接时间戳
  exists?: boolean              // 是否存在
  deviceId?: string             // 关联的设备ID
  deviceType?: string           // 设备类型
  lastActivity?: number         // 最后活动时间
  disconnectedTime?: number     // 断开连接时间
}

// 设备统计信息
export interface DeviceStatistics {
  totalDevices: number          // 设备总数
  onlineDevices: number         // 在线设备数
  offlineDevices: number        // 离线设备数
  modeStatistics: {             // 工作模式统计
    [key: number]: number       // 模式: 设备数量
  }
  lastUpdateTime: number        // 最后更新时间
}

// 设备告警信息
export interface DeviceAlerts {
  lowBatteryDevices: string[]   // 低电压设备列表
  gpsErrorDevices: string[]     // GPS异常设备列表
  alertTime: number             // 告警时间
}

// ==================== 请求类型 ====================

// 设备重启请求
export interface DeviceResetRequest {
  deviceId: string              // 设备ID
  flag: 'A' | 'C'               // 设备类型：A-清扫车，C-摆渡车
  code: string                  // 重启密码，固定为"111111"
}

// 设备控制请求
export interface DeviceControlRequest {
  deviceId: string              // 设备ID
  flag: 'A' | 'C'               // 设备类型：A-清扫车，C-摆渡车
  key: 1 | 2 | 3 | 4            // 控制指令：1-前进清扫，2-返回清扫，3-停止，4-急停
}

// 设备工作模式请求
export interface DeviceModeRequest {
  deviceId: string              // 设备ID
  mode: 0 | 1 | 2               // 工作模式：0-自主模式，1-本地模式，2-测试模式
}

// TCP/IP配置请求
export interface TcpIpConfigRequest {
  deviceId: string              // 设备ID
  tcpip: string                 // 服务器地址
  port: string                  // 端口号
}

// 工作时间表配置请求
export interface ScheduleConfigRequest {
  deviceId: string              // 设备ID
  week: 1 | 2 | 3 | 4 | 5 | 6 | 7  // 星期：1-7（星期一到星期天）
  h: number                     // 第一时段小时
  m: number                     // 第一时段分钟
  dolly: 0 | 1                  // 第一时段是否启动：0-禁止，1-启动
  h1: number                    // 第二时段小时
  m1: number                    // 第二时段分钟
  dolly1: 0 | 1                 // 第二时段是否启动
  h2: number                    // 第三时段小时
  m2: number                    // 第三时段分钟
  dolly2: 0 | 1                 // 第三时段是否启动
}

// 电机参数配置请求
export interface MotorConfigRequest {
  deviceId: string              // 设备ID
  flag: 'A' | 'C'               // 设备类型：A-清扫车，C-摆渡车
  vcall: number                 // 报警电压（0.0-30.0V）
  cnone: number                 // 空转电流（0.0-20.0A）
  cover: number                 // 过载电流（0.0-50.0A）
}

// 消息发送请求
export interface MessageRequest {
  connectionId: string          // 连接ID
  message: string               // 消息内容
}

// 广播消息请求
export interface BroadcastRequest {
  message: string               // 广播消息内容
}

// ==================== 系统相关类型 ====================

// 健康检查响应
export interface HealthCheckResponse {
  status: 'UP' | 'DOWN'         // 服务状态
  timestamp: number             // 时间戳
  activeConnections: number     // 活跃连接数
  activeDevices: number         // 活跃设备数
  jvm: {                        // JVM信息
    totalMemory: number         // 总内存
    freeMemory: number          // 空闲内存
    usedMemory: number          // 已用内存
    maxMemory: number           // 最大内存
  }
}

// API文档信息
export interface ApiDocInfo {
  name: string                  // API名称
  version: string               // 版本
  description: string           // 描述
  endpoints: {                  // 端点信息
    [category: string]: string[]
  }
  models: {                     // 数据模型
    [modelName: string]: {
      [key: string]: string
    }
  }
}

// 协议信息
export interface ProtocolInfo {
  name: string                  // 协议名称
  version: string               // 版本
  description: string           // 描述
  layers: {                     // 协议层次
    [layer: string]: string
  }
  frameFormat: {                // 帧格式
    [field: string]: string
  }
  escapeRules: {                // 转义规则
    [original: string]: string
  }
}

// ==================== 枚举类型 ====================

// 工作模式枚举
export enum WorkMode {
  AUTO = 0,                     // 自主模式
  MANUAL = 1,                   // 本地手动模式
  TEST = 2                      // 测试模式
}

// 设备类型枚举
export enum DeviceType {
  CLEANER = 'A',                // 清扫车
  CARRIER = 'C'                 // 摆渡车
}

// 控制命令枚举
export enum ControlCommand {
  FORWARD_CLEAN = 1,            // 前进清扫
  BACKWARD_CLEAN = 2,           // 返回清扫
  STOP = 3,                     // 停止
  EMERGENCY_STOP = 4            // 急停
}

// 电机状态枚举
export enum MotorStatus {
  STOPPED = 0,                  // 停止
  RUNNING = 1,                  // 运行中
  FAULT = 2                     // 故障
}

// 电机方向枚举
export enum MotorDirection {
  CLOCKWISE = 0,                // 顺时针
  COUNTERCLOCKWISE = 1          // 逆时针
}

// 电流告警状态枚举
export enum CurrentAlarmStatus {
  NORMAL = 0,                   // 正常
  BLOCKED = 1,                  // 堵转
  IDLE = 2                      // 空转
}

// 温度告警状态枚举
export enum TemperatureAlarmStatus {
  NORMAL = 0,                   // 正常
  OVERHEATED = 2                // 过高
}

// GPS状态枚举
export enum GpsStatus {
  LOCATED = 'A',                // 已定位
  NOT_LOCATED = 'V'             // 未定位
}

// 启动状态枚举
export enum EnableStatus {
  DISABLED = 0,                 // 禁止
  ENABLED = 1                   // 启动
}

// ==================== 工具类型 ====================

// 系统命令类型
export type SystemCommand = 'updat' | 'setsys' | 'setlora' | 'uptime'

// 协议命令类型
export type ProtocolCommand =
  | 'system'          // 系统命令
  | 'Heart'           // 心跳
  | 'Reset'           // 重启
  | 'TCPIP'           // TCP/IP配置
  | 'Week'            // 时间表配置
  | 'Mode'            // 工作模式配置
  | 'Control'         // 控制命令
  | 'Mon'             // 电机参数配置

// 日志级别类型
export type LogLevel = 'info' | 'warning' | 'error' | 'debug'

// 日志条目接口
export interface LogEntry {
  id: number                    // 日志ID
  timestamp: number             // 时间戳
  level: LogLevel               // 日志级别
  source: string                // 来源
  deviceId?: string             // 设备ID
  message: string               // 消息内容
  stack?: string                // 堆栈信息（错误日志）
}

// 分页参数
export interface PaginationParams {
  page: number                  // 页码
  size: number                  // 每页大小
}

// 分页响应
export interface PaginatedResponse<T> {
  content: T[]                  // 数据内容
  totalElements: number         // 总元素数
  totalPages: number            // 总页数
  page: number                  // 当前页
  size: number                  // 每页大小
  first: boolean                // 是否第一页
  last: boolean                 // 是否最后一页
}