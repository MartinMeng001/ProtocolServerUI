<template>
  <div class="config-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>设备配置</span>
          <el-select
            v-model="selectedDeviceId"
            placeholder="选择设备"
            style="width: 200px;"
            filterable
          >
            <el-option
              v-for="device in onlineDevices"
              :key="device.deviceId"
              :label="device.deviceId"
              :value="device.deviceId"
            />
          </el-select>
        </div>
      </template>

      <div v-if="!selectedDeviceId" class="no-device">
        <el-empty description="请选择要配置的设备" />
      </div>

      <div v-else class="config-content">
        <el-tabs v-model="activeTab" type="border-card">
          <!-- TCP/IP配置 -->
          <el-tab-pane label="TCP/IP配置" name="tcpip">
            <el-form
              :model="tcpipForm"
              label-width="120px"
              :rules="tcpipRules"
              ref="tcpipFormRef"
            >
              <el-form-item label="设备ID">
                <el-input v-model="tcpipForm.deviceId" readonly />
              </el-form-item>
              <el-form-item label="服务器地址" prop="tcpip">
                <el-input
                  v-model="tcpipForm.tcpip"
                  placeholder="请输入服务器IP地址或域名"
                />
              </el-form-item>
              <el-form-item label="端口号" prop="port">
                <el-input
                  v-model="tcpipForm.port"
                  placeholder="请输入端口号"
                  maxlength="5"
                />
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  @click="submitTcpipConfig"
                  :loading="tcpipLoading"
                  :disabled="!selectedDevice?.online"
                >
                  保存配置
                </el-button>
                <el-button @click="resetTcpipForm">重置</el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <!-- 工作时间表配置 -->
          <el-tab-pane label="工作时间表" name="schedule">
            <div class="schedule-config">
              <el-form label-width="120px">
                <el-form-item label="选择星期">
                  <el-radio-group v-model="scheduleForm.week">
                    <el-radio :label="1">星期一</el-radio>
                    <el-radio :label="2">星期二</el-radio>
                    <el-radio :label="3">星期三</el-radio>
                    <el-radio :label="4">星期四</el-radio>
                    <el-radio :label="5">星期五</el-radio>
                    <el-radio :label="6">星期六</el-radio>
                    <el-radio :label="7">星期日</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-form>

              <!-- 时间段配置 -->
              <el-row :gutter="20">
                <el-col :span="8">
                  <el-card class="time-slot-card">
                    <template #header>
                      <span>第一时间段</span>
                    </template>
                    <el-form label-width="80px">
                      <el-form-item label="时间">
                        <el-time-picker
                          v-model="timeSlot1"
                          format="HH:mm"
                          placeholder="选择时间"
                          style="width: 100%;"
                        />
                      </el-form-item>
                      <el-form-item label="启动">
                        <el-switch
                          v-model="scheduleForm.dolly"
                          :active-value="1"
                          :inactive-value="0"
                        />
                      </el-form-item>
                    </el-form>
                  </el-card>
                </el-col>

                <el-col :span="8">
                  <el-card class="time-slot-card">
                    <template #header>
                      <span>第二时间段</span>
                    </template>
                    <el-form label-width="80px">
                      <el-form-item label="时间">
                        <el-time-picker
                          v-model="timeSlot2"
                          format="HH:mm"
                          placeholder="选择时间"
                          style="width: 100%;"
                        />
                      </el-form-item>
                      <el-form-item label="启动">
                        <el-switch
                          v-model="scheduleForm.dolly1"
                          :active-value="1"
                          :inactive-value="0"
                        />
                      </el-form-item>
                    </el-form>
                  </el-card>
                </el-col>

                <el-col :span="8">
                  <el-card class="time-slot-card">
                    <template #header>
                      <span>第三时间段</span>
                    </template>
                    <el-form label-width="80px">
                      <el-form-item label="时间">
                        <el-time-picker
                          v-model="timeSlot3"
                          format="HH:mm"
                          placeholder="选择时间"
                          style="width: 100%;"
                        />
                      </el-form-item>
                      <el-form-item label="启动">
                        <el-switch
                          v-model="scheduleForm.dolly2"
                          :active-value="1"
                          :inactive-value="0"
                        />
                      </el-form-item>
                    </el-form>
                  </el-card>
                </el-col>
              </el-row>

              <div class="schedule-actions">
                <el-button
                  type="primary"
                  @click="submitScheduleConfig"
                  :loading="scheduleLoading"
                  :disabled="!selectedDevice?.online"
                >
                  保存配置
                </el-button>
                <el-button
                  type="success"
                  @click="queryScheduleConfig"
                  :disabled="!selectedDevice?.online"
                >
                  查询配置
                </el-button>
                <el-button @click="resetScheduleForm">重置</el-button>
              </div>
            </div>
          </el-tab-pane>

          <!-- 电机参数配置 -->
          <el-tab-pane label="电机参数" name="motor">
            <el-form
              :model="motorForm"
              label-width="120px"
              :rules="motorRules"
              ref="motorFormRef"
            >
              <el-form-item label="设备ID">
                <el-input v-model="motorForm.deviceId" readonly />
              </el-form-item>
              <el-form-item label="设备类型">
                <el-radio-group v-model="motorForm.flag">
                  <el-radio label="A">清扫车</el-radio>
                  <el-radio label="C">摆渡车</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="报警电压(V)" prop="vcall">
                <el-input-number
                  v-model="motorForm.vcall"
                  :min="0"
                  :max="30"
                  :precision="1"
                  :step="0.1"
                  style="width: 200px;"
                />
                <el-text type="info" style="margin-left: 10px;">
                  当电压低于此值时触发报警
                </el-text>
              </el-form-item>
              <el-form-item label="空转电流(A)" prop="cnone">
                <el-input-number
                  v-model="motorForm.cnone"
                  :min="0"
                  :max="20"
                  :precision="1"
                  :step="0.1"
                  style="width: 200px;"
                />
                <el-text type="info" style="margin-left: 10px;">
                  当电流低于此值时判定为空转
                </el-text>
              </el-form-item>
              <el-form-item label="过载电流(A)" prop="cover">
                <el-input-number
                  v-model="motorForm.cover"
                  :min="0"
                  :max="50"
                  :precision="1"
                  :step="0.1"
                  style="width: 200px;"
                />
                <el-text type="info" style="margin-left: 10px;">
                  当电流高于此值时判定为过载
                </el-text>
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  @click="submitMotorConfig"
                  :loading="motorLoading"
                  :disabled="!selectedDevice?.online"
                >
                  保存配置
                </el-button>
                <el-button @click="resetMotorForm">重置</el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <!-- 配置历史 -->
          <el-tab-pane label="配置历史" name="history">
            <div class="config-history">
              <div class="history-header">
                <el-button size="small" @click="clearConfigHistory">清空历史</el-button>
              </div>

              <el-table :data="configHistory" style="width: 100%" max-height="400">
                <el-table-column prop="timestamp" label="时间" width="180">
                  <template #default="{ row }">
                    {{ formatDateTime(row.timestamp) }}
                  </template>
                </el-table-column>
                <el-table-column prop="deviceId" label="设备ID" width="200" />
                <el-table-column prop="configType" label="配置类型" width="120" />
                <el-table-column prop="parameters" label="配置参数" />
                <el-table-column prop="result" label="结果" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.success ? 'success' : 'danger'">
                      {{ row.success ? '成功' : '失败' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="message" label="消息" />
              </el-table>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDeviceStore } from '@/stores/device'
import { deviceConfigApi } from '@/services/api'
import { ElMessage } from 'element-plus'
import type {
  TcpIpConfigRequest,
  ScheduleConfigRequest,
  MotorConfigRequest
} from '@/types'

const route = useRoute()
const deviceStore = useDeviceStore()

// 当前选中的设备和标签页
const selectedDeviceId = ref('')
const activeTab = ref('tcpip')

// 表单引用
const tcpipFormRef = ref()
const motorFormRef = ref()

// 表单数据
const tcpipForm = ref<TcpIpConfigRequest>({
  deviceId: '',
  tcpip: '',
  port: ''
})

const scheduleForm = ref<ScheduleConfigRequest>({
  deviceId: '',
  week: 1,
  h: 8,
  m: 0,
  dolly: 1,
  h1: 12,
  m1: 0,
  dolly1: 1,
  h2: 16,
  m2: 0,
  dolly2: 1
})

const motorForm = ref<MotorConfigRequest>({
  deviceId: '',
  flag: 'A',
  vcall: 20.0,
  cnone: 2.0,
  cover: 8.0
})

// 时间选择器绑定值
const timeSlot1 = ref<Date>()
const timeSlot2 = ref<Date>()
const timeSlot3 = ref<Date>()

// 加载状态
const tcpipLoading = ref(false)
const scheduleLoading = ref(false)
const motorLoading = ref(false)

// 配置历史
const configHistory = ref<Array<{
  timestamp: number
  deviceId: string
  configType: string
  parameters: string
  success: boolean
  message: string
}>>([])

// 表单验证规则
const tcpipRules = {
  tcpip: [
    { required: true, message: '请输入服务器地址', trigger: 'blur' }
  ],
  port: [
    { required: true, message: '请输入端口号', trigger: 'blur' },
    { pattern: /^\d{1,5}$/, message: '端口号格式不正确', trigger: 'blur' }
  ]
}

const motorRules = {
  vcall: [
    { required: true, message: '请输入报警电压', trigger: 'blur' }
  ],
  cnone: [
    { required: true, message: '请输入空转电流', trigger: 'blur' }
  ],
  cover: [
    { required: true, message: '请输入过载电流', trigger: 'blur' }
  ]
}

// 计算属性
const onlineDevices = computed(() => deviceStore.onlineDevices)

const selectedDevice = computed(() =>
  deviceStore.devices.find(d => d.deviceId === selectedDeviceId.value)
)

// 工具函数
const formatDateTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const addToHistory = (
  configType: string,
  parameters: string,
  success: boolean,
  message: string
) => {
  configHistory.value.unshift({
    timestamp: Date.now(),
    deviceId: selectedDeviceId.value,
    configType,
    parameters,
    success,
    message
  })

  // 限制历史记录数量
  if (configHistory.value.length > 100) {
    configHistory.value = configHistory.value.slice(0, 100)
  }
}

// 时间处理函数
const updateTimeSlots = () => {
  if (scheduleForm.value.h !== undefined && scheduleForm.value.m !== undefined) {
    const date1 = new Date()
    date1.setHours(scheduleForm.value.h, scheduleForm.value.m, 0, 0)
    timeSlot1.value = date1
  }

  if (scheduleForm.value.h1 !== undefined && scheduleForm.value.m1 !== undefined) {
    const date2 = new Date()
    date2.setHours(scheduleForm.value.h1, scheduleForm.value.m1, 0, 0)
    timeSlot2.value = date2
  }

  if (scheduleForm.value.h2 !== undefined && scheduleForm.value.m2 !== undefined) {
    const date3 = new Date()
    date3.setHours(scheduleForm.value.h2, scheduleForm.value.m2, 0, 0)
    timeSlot3.value = date3
  }
}

const syncTimeSlots = () => {
  if (timeSlot1.value) {
    scheduleForm.value.h = timeSlot1.value.getHours()
    scheduleForm.value.m = timeSlot1.value.getMinutes()
  }

  if (timeSlot2.value) {
    scheduleForm.value.h1 = timeSlot2.value.getHours()
    scheduleForm.value.m1 = timeSlot2.value.getMinutes()
  }

  if (timeSlot3.value) {
    scheduleForm.value.h2 = timeSlot3.value.getHours()
    scheduleForm.value.m2 = timeSlot3.value.getMinutes()
  }
}

// 提交配置方法
const submitTcpipConfig = async () => {
  try {
    await tcpipFormRef.value.validate()

    tcpipLoading.value = true
    const response = await deviceConfigApi.configureTcpIp(tcpipForm.value)

    if (response.success) {
      ElMessage.success(response.message)
      addToHistory(
        'TCP/IP配置',
        `地址: ${tcpipForm.value.tcpip}, 端口: ${tcpipForm.value.port}`,
        true,
        response.message
      )
    } else {
      ElMessage.error(response.message)
      addToHistory(
        'TCP/IP配置',
        `地址: ${tcpipForm.value.tcpip}, 端口: ${tcpipForm.value.port}`,
        false,
        response.message
      )
    }
  } catch (error) {
    console.error('TCP/IP配置失败:', error)
    ElMessage.error('TCP/IP配置失败')
    addToHistory('TCP/IP配置', '', false, '配置失败')
  } finally {
    tcpipLoading.value = false
  }
}

const submitScheduleConfig = async () => {
  try {
    syncTimeSlots()

    scheduleLoading.value = true
    const response = await deviceConfigApi.configureSchedule(scheduleForm.value)

    if (response.success) {
      ElMessage.success(response.message)
      addToHistory(
        '工作时间表配置',
        `星期${scheduleForm.value.week}, 时段: ${scheduleForm.value.h}:${scheduleForm.value.m}`,
        true,
        response.message
      )
    } else {
      ElMessage.error(response.message)
      addToHistory(
        '工作时间表配置',
        `星期${scheduleForm.value.week}`,
        false,
        response.message
      )
    }
  } catch (error) {
    console.error('工作时间表配置失败:', error)
    ElMessage.error('工作时间表配置失败')
    addToHistory('工作时间表配置', '', false, '配置失败')
  } finally {
    scheduleLoading.value = false
  }
}

const queryScheduleConfig = async () => {
  try {
    const response = await deviceConfigApi.querySchedule(
      selectedDeviceId.value,
      scheduleForm.value.week
    )

    if (response.success) {
      ElMessage.success('查询指令已发送')
      addToHistory(
        '查询工作时间表',
        `星期${scheduleForm.value.week}`,
        true,
        '查询指令已发送'
      )
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('查询工作时间表失败:', error)
    ElMessage.error('查询工作时间表失败')
  }
}

const submitMotorConfig = async () => {
  try {
    await motorFormRef.value.validate()

    motorLoading.value = true
    const response = await deviceConfigApi.configureMotor(motorForm.value)

    if (response.success) {
      ElMessage.success(response.message)
      addToHistory(
        '电机参数配置',
        `类型: ${motorForm.value.flag === 'A' ? '清扫车' : '摆渡车'}, 电压: ${motorForm.value.vcall}V, 空转: ${motorForm.value.cnone}A, 过载: ${motorForm.value.cover}A`,
        true,
        response.message
      )
    } else {
      ElMessage.error(response.message)
      addToHistory(
        '电机参数配置',
        `类型: ${motorForm.value.flag === 'A' ? '清扫车' : '摆渡车'}`,
        false,
        response.message
      )
    }
  } catch (error) {
    console.error('电机参数配置失败:', error)
    ElMessage.error('电机参数配置失败')
    addToHistory('电机参数配置', '', false, '配置失败')
  } finally {
    motorLoading.value = false
  }
}

// 重置表单方法
const resetTcpipForm = () => {
  tcpipForm.value = {
    deviceId: selectedDeviceId.value,
    tcpip: '',
    port: ''
  }
  tcpipFormRef.value?.clearValidate()
}

const resetScheduleForm = () => {
  scheduleForm.value = {
    deviceId: selectedDeviceId.value,
    week: 1,
    h: 8,
    m: 0,
    dolly: 1,
    h1: 12,
    m1: 0,
    dolly1: 1,
    h2: 16,
    m2: 0,
    dolly2: 1
  }
  updateTimeSlots()
}

const resetMotorForm = () => {
  motorForm.value = {
    deviceId: selectedDeviceId.value,
    flag: 'A',
    vcall: 20.0,
    cnone: 2.0,
    cover: 8.0
  }
  motorFormRef.value?.clearValidate()
}

const clearConfigHistory = () => {
  configHistory.value = []
  ElMessage.success('配置历史已清空')
}

// 监听选中设备变化
watch(() => selectedDeviceId.value, (newDeviceId) => {
  if (newDeviceId) {
    tcpipForm.value.deviceId = newDeviceId
    scheduleForm.value.deviceId = newDeviceId
    motorForm.value.deviceId = newDeviceId
  }
})

// 监听时间选择器变化
watch([timeSlot1, timeSlot2, timeSlot3], () => {
  syncTimeSlots()
})

onMounted(() => {
  // 从路由参数获取设备ID
  const deviceIdFromQuery = route.query.deviceId as string
  if (deviceIdFromQuery) {
    selectedDeviceId.value = deviceIdFromQuery
  }

  // 确保设备数据已加载
  if (!deviceStore.devices.length) {
    deviceStore.refreshData()
  }

  // 初始化时间选择器
  updateTimeSlots()
})
</script>

<style scoped>
.config-page {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.no-device {
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.config-content {
  height: calc(100vh - 200px);
}

.schedule-config {
  padding: 20px 0;
}

.time-slot-card {
  height: 200px;
}

.schedule-actions {
  margin-top: 20px;
  text-align: center;
}

.config-history {
  padding: 20px 0;
}

.history-header {
  margin-bottom: 20px;
  text-align: right;
}

:deep(.el-tabs__content) {
  padding: 20px;
  height: calc(100% - 60px);
  overflow-y: auto;
}

:deep(.el-form-item__content) {
  display: flex;
  align-items: center;
}

:deep(.el-input-number) {
  width: 200px;
}

:deep(.el-time-picker) {
  width: 100%;
}

.schedule-actions .el-button {
  margin: 0 10px;
}

.time-slot-card :deep(.el-card__body) {
  height: calc(100% - 57px);
}
</style>