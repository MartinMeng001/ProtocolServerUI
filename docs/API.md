# API 接口文档

## 基础信息

- 基础URL: http://localhost:8081/api
- WebSocket: ws://localhost:8081/ws/device

## 设备管理接口

### 获取设备列表
- **URL**: `GET /device/list`
- **描述**: 获取所有设备列表

### 获取设备详情
- **URL**: `GET /device/{deviceId}`
- **描述**: 获取指定设备详情

## 设备控制接口

### 设备重启
- **URL**: `POST /device/control/reset`
- **描述**: 重启指定设备

### 设备控制
- **URL**: `POST /device/control/command`
- **描述**: 发送控制指令

## 设备配置接口

### TCP/IP配置
- **URL**: `POST /device/config/tcpip`
- **描述**: 配置设备网络参数

### 工作时间表配置
- **URL**: `POST /device/config/schedule`
- **描述**: 配置设备工作时间表

## 监控统计接口

### 设备统计
- **URL**: `GET /monitor/statistics`
- **描述**: 获取设备统计信息

### 设备告警
- **URL**: `GET /monitor/alerts`
- **描述**: 获取设备告警信息
