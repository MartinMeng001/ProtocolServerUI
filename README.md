# 物联网设备管理系统前端

基于 Vue3 + Vite + TypeScript + Element Plus 构建的物联网设备管理系统前端界面。

## 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 代码检查
```bash
npm run lint
```

### 代码格式化
```bash
npm run format
```

## 技术栈

- Vue 3.4 + Vite 5.0
- TypeScript 5.2
- Element Plus 2.4
- Pinia 2.1 (状态管理)
- Vue Router 4.2
- ECharts 5.4 (图表)
- Axios 1.6 (HTTP客户端)

## 项目结构

```
src/
├── views/              # 页面组件
├── components/         # 通用组件
├── stores/            # Pinia状态管理
├── services/          # API服务
├── types/             # TypeScript类型
├── router/            # 路由配置
└── assets/            # 静态资源
```

## 开发规范

- 使用 TypeScript 进行类型检查
- 使用 ESLint 进行代码检查
- 使用 Prettier 进行代码格式化
- 遵循 Vue 3 Composition API 开发规范

## API接口

后端服务地址: http://localhost:8081
WebSocket地址: ws://localhost:8081/ws/device
