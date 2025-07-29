<template>
  <div class="connections-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>连接管理</span>
          <div class="header-actions">
            <el-button type="primary" @click="refreshConnections">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <el-button type="success" @click="showBroadcastDialog">
              <el-icon><ChatDotRound /></el-icon>
              广播消息
            </el-button>
          </div>
        </div>
      </template>

      <!-- 连接统计 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="8">
          <el-statistic title="总连接数" :value="deviceStore.connectionCount" />
        </el-col>
        <el-col :span="8">
          <el-statistic title="活跃连接" :value="activeConnectionCount" />
        </el-col>
        <el-col :span="8">
          <el-statistic title="WebSocket状态">
            <template #default>
              <el-tag :type="deviceStore.isConnected ? 'success' : 'danger'">
                {{ deviceStore.isConnected ? '已连接' : '未连接' }}
              </el-tag>
            </template>
          </el-statistic>
        </el-col>
      </el-row>

      <!-- 连接列表 -->
      <el-table
        :data="deviceStore.connections"
        style="width: 100%; margin-top: 20px;"
        v-loading="loading"
        row-key="connectionId"
      >
        <el-table-column prop="connectionId" label="连接ID" width="150" />

        <el-table-column prop="remoteAddress" label="远程地址" width="200" />

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.active ? 'success' : 'danger'">
              <el-icon style="margin-right: 4px;">
                <CircleCheck v-if="row.active" />
                <CircleClose v-else />
              </el-icon>
              {{ row.active ? '活跃' : '非活跃' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="连接时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.connectedTime) }}
          </template>
        </el-table-column>

        <el-table-column label="持续时间" width="120">
          <template #default="{ row }">
            {{ formatDuration(row.connectedTime) }}
          </template>
        </el-table-column>

        <el-table-column label="关联设备" width="200">
          <template #default="{ row }">
            <span v-if="getDeviceByConnection(row.connectionId)">
              <el-link
                type="primary"
                @click="viewDevice(getDeviceByConnection(row.connectionId)!.deviceId)"
              >
                {{ getDeviceByConnection(row.connectionId)!.deviceId }}
              </el-link>
            </span>
            <span v-else class="text-muted">未关联</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                type="primary"
                size="small"
                @click="sendMessage(row.connectionId)"
              >
                发送消息
              </el-button>
              <el-button
                type="info"
                size="small"
                @click="viewConnectionDetail(row.connectionId)"
              >
                详情
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="closeConnection(row.connectionId)"
                :disabled="!row.active"
              >
                关闭
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 发送消息弹窗 -->
    <el-dialog
      v-model="messageDialogVisible"
      title="发送消息"
      width="500px"
    >
      <el-form :model="messageForm" label-width="100px">
        <el-form-item label="连接ID">
          <el-input v-model="messageForm.connectionId" readonly />
        </el-form-item>
        <el-form-item label="消息内容">
          <el-input
            v-model="messageForm.message"
            type="textarea"
            :rows="4"
            placeholder="请输入要发送的消息"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="messageDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="submitMessage"
          :loading="messageLoading"
        >
          发送
        </el-button>
      </template>
    </el-dialog>

    <!-- 广播消息弹窗 -->
    <el-dialog
      v-model="broadcastDialogVisible"
      title="广播消息"
      width="500px"
    >
      <el-form :model="broadcastForm" label-width="100px">
        <el-form-item label="广播内容">
          <el-input
            v-model="broadcastForm.message"
            type="textarea"
            :rows="4"
            placeholder="请输入要广播的消息"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
        <el-form-item>
          <el-alert
            title="广播消息将发送给所有活跃连接"
            type="warning"
            :closable="false"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="broadcastDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="submitBroadcast"
          :loading="broadcastLoading"
        >
          广播
        </el-button>
      </template>
    </el-dialog>

    <!-- 连接详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="连接详情"
      width="600px"
    >
      <el-descriptions
        v-if="selectedConnection"
        :column="1"
        border
      >
        <el-descriptions-item label="连接ID">
          {{ selectedConnection.connectionId }}
        </el-descriptions-item>
        <el-descriptions-item label="远程地址">
          {{ selectedConnection.remoteAddress }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="selectedConnection.active ? 'success' : 'danger'">
            {{ selectedConnection.active ? '活跃' : '非活跃' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="连接时间">
          {{ formatDateTime(selectedConnection.connectedTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="持续时间">
          {{ formatDuration(selectedConnection.connectedTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="关联设备">
          <span v-if="getDeviceByConnection(selectedConnection.connectionId)">
            {{ getDeviceByConnection(selectedConnection.connectionId)!.deviceId }}
          </span>
          <span v-else class="text-muted">未关联设备</span>
        </el-descriptions-item>
      </el-descriptions>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDeviceStore } from '@/stores/device'
import { protocolApi } from '@/services/api'
import { formatDistanceToNow, formatDuration as fnsFormatDuration } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ConnectionInfo, MessageRequest, BroadcastRequest } from '@/types'

const router = useRouter()
const deviceStore = useDeviceStore()

// 状态
const loading = ref(false)
const messageDialogVisible = ref(false)
const broadcastDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const messageLoading = ref(false)
const broadcastLoading = ref(false)

// 表单数据
const messageForm = ref<MessageRequest>({
  connectionId: '',
  message: ''
})

const broadcastForm = ref<BroadcastRequest>({
  message: ''
})

const selectedConnection = ref<ConnectionInfo | null>(null)

// 计算属性
const activeConnectionCount = computed(() =>
  deviceStore.connections.filter(conn => conn.active).length
)

// 工具函数
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const formatDateTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const formatDuration = (startTime: number) => {
  const now = Date.now()
  const duration = now - startTime

  return formatDistanceToNow(new Date(startTime), {
    locale: zhCN
  })
}

const getDeviceByConnection = (connectionId: string) => {
  return deviceStore.devices.find(d => d.connectionId === connectionId)
}

// 操作方法
const refreshConnections = async () => {
  loading.value = true
  try {
    await deviceStore.fetchConnections()
    ElMessage.success('连接数据已刷新')
  } catch (error) {
    console.error('刷新连接失败:', error)
    ElMessage.error('刷新连接失败')
  } finally {
    loading.value = false
  }
}

const sendMessage = (connectionId: string) => {
  messageForm.value.connectionId = connectionId
  messageForm.value.message = ''
  messageDialogVisible.value = true
}

const showBroadcastDialog = () => {
  broadcastForm.value.message = ''
  broadcastDialogVisible.value = true
}

const viewConnectionDetail = (connectionId: string) => {
  selectedConnection.value = deviceStore.connections.find(
    conn => conn.connectionId === connectionId
  ) || null
  detailDialogVisible.value = true
}

const viewDevice = (deviceId: string) => {
  router.push(`/device/${deviceId}`)
}

const closeConnection = async (connectionId: string) => {
  try {
    await ElMessageBox.confirm(
      `确定要关闭连接 ${connectionId} 吗？`,
      '确认关闭',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    const response = await protocolApi.closeConnection(connectionId)

    if (response.success) {
      ElMessage.success('连接已关闭')
      refreshConnections()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('关闭连接失败:', error)
      ElMessage.error('关闭连接失败')
    }
  }
}

const submitMessage = async () => {
  if (!messageForm.value.message.trim()) {
    ElMessage.warning('请输入消息内容')
    return
  }

  try {
    messageLoading.value = true
    const response = await protocolApi.sendMessage(messageForm.value)

    if (response.success) {
      ElMessage.success('消息发送成功')
      messageDialogVisible.value = false
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('发送消息失败:', error)
    ElMessage.error('发送消息失败')
  } finally {
    messageLoading.value = false
  }
}

const submitBroadcast = async () => {
  if (!broadcastForm.value.message.trim()) {
    ElMessage.warning('请输入广播内容')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要向所有活跃连接广播消息吗？`,
      '确认广播',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
      }
    )

    broadcastLoading.value = true
    const response = await protocolApi.broadcastMessage(broadcastForm.value)

    if (response.success) {
      ElMessage.success('消息广播成功')
      broadcastDialogVisible.value = false
    } else {
      ElMessage.error(response.message)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('广播消息失败:', error)
      ElMessage.error('广播消息失败')
    }
  } finally {
    broadcastLoading.value = false
  }
}

onMounted(() => {
  refreshConnections()
})
</script>

<style scoped>
.connections-page {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.stats-row {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.text-muted {
  color: #909399;
}

.el-button-group {
  display: flex;
}

.el-button-group .el-button {
  margin: 0;
}

.el-button-group .el-button:not(:first-child) {
  margin-left: -1px;
}

:deep(.el-table) {
  background-color: transparent;
}

:deep(.el-statistic__content) {
  text-align: center;
}

:deep(.el-statistic__number) {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
}

:deep(.el-descriptions__body) {
  background-color: #fafafa;
}
</style>