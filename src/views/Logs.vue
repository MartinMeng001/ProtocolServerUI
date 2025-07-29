<template>
  <div class="logs-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>日志管理</span>
          <div class="header-actions">
            <el-input
              v-model="searchText"
              placeholder="搜索日志内容"
              style="width: 200px; margin-right: 10px;"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select
              v-model="levelFilter"
              placeholder="日志级别"
              style="width: 120px; margin-right: 10px;"
              clearable
            >
              <el-option label="全部" value="" />
              <el-option label="信息" value="info" />
              <el-option label="警告" value="warning" />
              <el-option label="错误" value="error" />
              <el-option label="调试" value="debug" />
            </el-select>
            <el-date-picker
              v-model="dateRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              style="margin-right: 10px;"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
            />
            <el-button type="primary" @click="refreshLogs">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <el-button type="success" @click="exportLogs">
              <el-icon><Download /></el-icon>
              导出
            </el-button>
            <el-button type="danger" @click="clearLogs">
              <el-icon><Delete /></el-icon>
              清空
            </el-button>
          </div>
        </div>
      </template>

      <!-- 日志统计 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <el-statistic title="总日志数" :value="totalLogs" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="错误日志" :value="errorLogsCount">
            <template #default>
              <span style="color: #f56c6c; font-weight: bold;">
                {{ errorLogsCount }}
              </span>
            </template>
          </el-statistic>
        </el-col>
        <el-col :span="6">
          <el-statistic title="警告日志" :value="warningLogsCount">
            <template #default>
              <span style="color: #e6a23c; font-weight: bold;">
                {{ warningLogsCount }}
              </span>
            </template>
          </el-statistic>
        </el-col>
        <el-col :span="6">
          <el-statistic title="今日新增" :value="todayLogsCount" />
        </el-col>
      </el-row>

      <!-- 日志列表 -->
      <el-table
        :data="paginatedLogs"
        style="width: 100%; margin-top: 20px;"
        v-loading="loading"
        row-key="id"
        :default-sort="{ prop: 'timestamp', order: 'descending' }"
      >
        <el-table-column prop="timestamp" label="时间" width="180" sortable>
          <template #default="{ row }">
            {{ formatDateTime(row.timestamp) }}
          </template>
        </el-table-column>

        <el-table-column prop="level" label="级别" width="100" sortable>
          <template #default="{ row }">
            <el-tag :type="getLevelTagType(row.level)">
              <el-icon style="margin-right: 4px;">
                <InfoFilled v-if="row.level === 'info'" />
                <Warning v-else-if="row.level === 'warning'" />
                <CircleClose v-else-if="row.level === 'error'" />
                <Tools v-else />
              </el-icon>
              {{ getLevelText(row.level) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="source" label="来源" width="150" sortable />

        <el-table-column prop="deviceId" label="设备ID" width="200">
          <template #default="{ row }">
            <span v-if="row.deviceId">
              <el-link
                type="primary"
                @click="viewDevice(row.deviceId)"
              >
                {{ row.deviceId }}
              </el-link>
            </span>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>

        <el-table-column prop="message" label="消息内容" min-width="300">
          <template #default="{ row }">
            <div class="log-message" :class="`log-${row.level}`">
              {{ row.message }}
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="viewLogDetail(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[20, 50, 100, 200]"
          :total="filteredLogs.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </el-card>

    <!-- 日志详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="日志详情"
      width="70%"
    >
      <div v-if="selectedLog" class="log-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="时间">
            {{ formatDateTime(selectedLog.timestamp) }}
          </el-descriptions-item>
          <el-descriptions-item label="级别">
            <el-tag :type="getLevelTagType(selectedLog.level)">
              {{ getLevelText(selectedLog.level) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="来源">
            {{ selectedLog.source }}
          </el-descriptions-item>
          <el-descriptions-item label="设备ID">
            {{ selectedLog.deviceId || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="消息" :span="2">
            <div class="detail-message">
              {{ selectedLog.message }}
            </div>
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedLog.stack" label="堆栈信息" :span="2">
            <pre class="stack-trace">{{ selectedLog.stack }}</pre>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()

// 状态
const loading = ref(false)
const detailDialogVisible = ref(false)
const searchText = ref('')
const levelFilter = ref('')
const dateRange = ref<[string, string] | null>(null)
const currentPage = ref(1)
const pageSize = ref(50)

// 模拟日志数据
const logs = ref<Array<{
  id: number
  timestamp: number
  level: 'info' | 'warning' | 'error' | 'debug'
  source: string
  deviceId?: string
  message: string
  stack?: string
}>>([])

const selectedLog = ref<typeof logs.value[0] | null>(null)

// 计算属性
const filteredLogs = computed(() => {
  let filtered = logs.value

  // 搜索过滤
  if (searchText.value) {
    filtered = filtered.filter(log =>
      log.message.toLowerCase().includes(searchText.value.toLowerCase()) ||
      (log.deviceId && log.deviceId.toLowerCase().includes(searchText.value.toLowerCase()))
    )
  }

  // 级别过滤
  if (levelFilter.value) {
    filtered = filtered.filter(log => log.level === levelFilter.value)
  }

  // 时间范围过滤
  if (dateRange.value) {
    const [start, end] = dateRange.value
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    filtered = filtered.filter(log =>
      log.timestamp >= startTime && log.timestamp <= endTime
    )
  }

  return filtered.sort((a, b) => b.timestamp - a.timestamp)
})

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredLogs.value.slice(start, start + pageSize.value)
})

const totalLogs = computed(() => logs.value.length)

const errorLogsCount = computed(() =>
  logs.value.filter(log => log.level === 'error').length
)

const warningLogsCount = computed(() =>
  logs.value.filter(log => log.level === 'warning').length
)

const todayLogsCount = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTime = today.getTime()
  return logs.value.filter(log => log.timestamp >= todayTime).length
})

// 工具函数
const formatDateTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const getLevelText = (level: string) => {
  const levelMap: Record<string, string> = {
    info: '信息',
    warning: '警告',
    error: '错误',
    debug: '调试'
  }
  return levelMap[level] || level
}

const getLevelTagType = (level: string) => {
  const typeMap: Record<string, string> = {
    info: 'info',
    warning: 'warning',
    error: 'danger',
    debug: 'success'
  }
  return typeMap[level] || 'info'
}

// 操作方法
const refreshLogs = () => {
  generateMockLogs()
  ElMessage.success('日志已刷新')
}

const exportLogs = () => {
  const exportData = filteredLogs.value.map(log => ({
    时间: formatDateTime(log.timestamp),
    级别: getLevelText(log.level),
    来源: log.source,
    设备ID: log.deviceId || '--',
    消息: log.message
  }))

  const headers = Object.keys(exportData[0] || {})
  const csvContent = [
    headers.join(','),
    ...exportData.map(row =>
      headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `系统日志_${new Date().toISOString().slice(0, 10)}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  ElMessage.success('日志已导出')
}

const clearLogs = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有日志吗？此操作不可恢复。',
      '确认清空',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    logs.value = []
    ElMessage.success('日志已清空')
  } catch (error) {
    // 用户取消
  }
}

const viewLogDetail = (log: typeof logs.value[0]) => {
  selectedLog.value = log
  detailDialogVisible.value = true
}

const viewDevice = (deviceId: string) => {
  router.push(`/device/${deviceId}`)
}

// 生成模拟日志数据
const generateMockLogs = () => {
  const sources = ['TCP服务器', '协议解析器', '设备管理器', '消息处理器', '数据库']
  const levels: Array<'info' | 'warning' | 'error' | 'debug'> = ['info', 'warning', 'error', 'debug']
  const devices = ['865357065355578', '865357065355579', '865357065355580']

  const messages = {
    info: [
      '设备连接建立成功',
      '协议消息解析完成',
      '心跳检测正常',
      '设备状态更新',
      '配置保存成功'
    ],
    warning: [
      '设备心跳超时',
      '电池电压偏低',
      'GPS信号弱',
      '连接不稳定',
      '数据包丢失'
    ],
    error: [
      '设备连接断开',
      '协议解析失败',
      '数据库连接错误',
      'CRC校验失败',
      '设备响应超时'
    ],
    debug: [
      '接收数据包',
      '发送控制指令',
      '解析JSON数据',
      '更新设备缓存',
      '处理WebSocket消息'
    ]
  }

  const newLogs = []
  for (let i = 0; i < 200; i++) {
    const level = levels[Math.floor(Math.random() * levels.length)]
    const source = sources[Math.floor(Math.random() * sources.length)]
    const deviceId = Math.random() > 0.3 ? devices[Math.floor(Math.random() * devices.length)] : undefined
    const message = messages[level][Math.floor(Math.random() * messages[level].length)]

    newLogs.push({
      id: Date.now() + i,
      timestamp: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000), // 最近7天
      level,
      source,
      deviceId,
      message: deviceId ? `${message} (${deviceId})` : message,
      stack: level === 'error' && Math.random() > 0.5 ?
        `Error: ${message}\n    at Object.handler (/app/src/handlers/device.js:45:12)\n    at processMessage (/app/src/protocol/parser.js:123:8)\n    at MessageHandler.handle (/app/src/services/message.js:67:15)` :
        undefined
    })
  }

  logs.value = [...newLogs, ...logs.value].slice(0, 1000) // 保持最多1000条日志
}

onMounted(() => {
  generateMockLogs()
})
</script>

<style scoped>
.logs-page {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
}

.stats-row {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.log-message {
  word-break: break-all;
  line-height: 1.4;
}

.log-info {
  color: #606266;
}

.log-warning {
  color: #e6a23c;
}

.log-error {
  color: #f56c6c;
  font-weight: bold;
}

.log-debug {
  color: #909399;
  font-style: italic;
}

.text-muted {
  color: #909399;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.log-detail {
  margin: 20px 0;
}

.detail-message {
  word-break: break-all;
  line-height: 1.6;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.stack-trace {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  color: #e74c3c;
  white-space: pre-wrap;
  overflow-x: auto;
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
}

:deep(.el-descriptions__body) {
  background-color: #fafafa;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}
</style>