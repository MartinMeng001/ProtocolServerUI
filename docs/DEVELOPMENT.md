# 开发指南

## 开发环境搭建

1. 安装 Node.js (>=16.0.0)
2. 克隆项目代码
3. 安装依赖: `npm install`
4. 启动开发服务器: `npm run dev`

## 代码规范

### Vue 组件
- 使用 Composition API
- 使用 `<script setup>` 语法
- 组件名使用 PascalCase

### TypeScript
- 所有 API 接口定义类型
- 组件 Props 使用类型定义
- 避免使用 `any` 类型

### 样式
- 使用 Element Plus 组件库
- 自定义样式使用 scoped
- 颜色变量统一定义

## 项目架构

### 状态管理
使用 Pinia 进行状态管理，按功能模块划分 Store

### 路由管理
使用 Vue Router 4，支持嵌套路由和路由守卫

### API 服务
统一封装 axios，支持请求拦截和响应拦截

### 类型定义
TypeScript 类型定义按模块组织，提供完整的类型支持
