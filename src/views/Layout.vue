<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '200px'" class="sidebar">
      <div class="logo">
        <el-icon><Cpu /></el-icon>
        <span v-show="!isCollapse" class="logo-text">物联网设备管理</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :unique-opened="true"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <template v-for="route in menuRoutes" :key="route.path">
          <el-menu-item :index="route.path">
            <el-icon>
              <component :is="route.meta?.icon" />
            </el-icon>
            <template #title>{{ route.meta?.title }}</template>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部导航 -->
      <el-header class="header">
        <div class="header-left">
          <el-button
            type="text"
            @click="toggleCollapse"
            class="collapse-btn"
          >
            <el-icon><Fold v-if="!isCollapse" /><Expand v-else /></el-icon>
          </el-button>

          <el-breadcrumb separator="/">
            <el-breadcrumb-item>首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentRoute?.meta?.title">
              {{ currentRoute.meta.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <el-badge :value="deviceStore.alerts?.lowBatteryDevices?.length || 0" :hidden="!deviceStore.alerts?.lowBatteryDevices?.length">
            <el-button type="text" @click="showAlerts">
              <el-icon><Bell /></el-icon>
            </el-button>
          </el-badge>

          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><User /></el-icon>
              <span>管理员</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人设置</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <div class="connection-status" :class="{ connected: deviceStore.isConnected }">
            <el-icon><Connection /></el-icon>
            <span>{{ deviceStore.isConnected ? '已连接' : '未连接' }}</span>
          </div>
        </div>
      </el-header>

      <!-- 主内容 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>

    <!-- 告警弹窗 -->
    <el-dialog v-model="alertDialogVisible" title="设备告警" width="500px">
      <div v-if="deviceStore.alerts">
        <el-alert
          v-if="deviceStore.alerts.lowBatteryDevices.length > 0"
          title="低电压告警"
          type="warning"
          :closable="false"
        >
          <template #default>
            <div>以下设备电池电压过低：</div>
            <ul>
              <li v-for="deviceId in deviceStore.alerts.lowBatteryDevices" :key="deviceId">
                {{ deviceId }}
              </li>
            </ul>
          </template>
        </el-alert>

        <el-alert
          v-if="deviceStore.alerts.gpsErrorDevices.length > 0"
          title="GPS定位异常"
          type="error"
          :closable="false"
          style="margin-top: 10px;"
        >
          <template #default>
            <div>以下设备GPS未定位：</div>
            <ul>
              <li v-for="deviceId in deviceStore.alerts.gpsErrorDevices" :key="deviceId">
                {{ deviceId }}
              </li>
            </ul>
          </template>
        </el-alert>
      </div>

      <template #footer>
        <el-button @click="alertDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDeviceStore } from '@/stores/device'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const deviceStore = useDeviceStore()

const isCollapse = ref(false)
const alertDialogVisible = ref(false)

const currentRoute = computed(() => route)
const activeMenu = computed(() => route.path)

// 菜单路由
const menuRoutes = computed(() => {
  return router.getRoutes()
    .filter(route => route.meta?.title && route.path !== '/')
    .filter(route => !route.path.includes(':')) // 排除动态路由
})

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

const showAlerts = () => {
  alertDialogVisible.value = true
}

const handleCommand = (command: string) => {
  switch (command) {
    case 'profile':
      ElMessage.info('个人设置功能开发中...')
      break
    case 'logout':
      ElMessage.success('已退出登录')
      break
  }
}

onMounted(() => {
  // 初始化数据
  deviceStore.refreshData()

  // 定时刷新数据
  setInterval(() => {
    deviceStore.refreshData()
  }, 30000) // 30秒刷新一次
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.sidebar {
  background-color: #304156;
  transition: width 0.3s;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid #434a50;
}

.logo .el-icon {
  font-size: 24px;
  margin-right: 8px;
}

.logo-text {
  white-space: nowrap;
}

.header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
}

.collapse-btn {
  margin-right: 20px;
  font-size: 18px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #606266;
}

.user-info span {
  margin: 0 5px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #f56c6c;
  font-size: 12px;
}

.connection-status.connected {
  color: #67c23a;
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
}

:deep(.el-menu) {
  border-right: none;
}

:deep(.el-menu-item) {
  height: 50px;
  line-height: 50px;
}

:deep(.el-menu-item.is-active) {
  background-color: #263445 !important;
}

:deep(.el-menu-item:hover) {
  background-color: #263445 !important;
}
</style>