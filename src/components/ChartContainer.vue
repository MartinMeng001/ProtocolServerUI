<template>
  <div
    class="chart-container"
    :class="containerClass"
  >
    <!-- 图表头部 -->
    <div
      v-if="title || $slots.title || showActions || $slots.actions"
      class="chart-container__header"
    >
      <div class="chart-container__title-section">
        <!-- 标题 -->
        <h3 class="chart-container__title">
          <slot name="title">{{ title }}</slot>
        </h3>

        <!-- 副标题 -->
        <p
          v-if="subtitle || $slots.subtitle"
          class="chart-container__subtitle"
        >
          <slot name="subtitle">{{ subtitle }}</slot>
        </p>
      </div>

      <!-- 操作按钮 -->
      <div
        v-if="showActions || $slots.actions"
        class="chart-container__actions"
      >
        <slot name="actions">
          <el-button-group v-if="showRefresh || showExport || showFullscreen">
            <el-button
              v-if="showRefresh"
              size="small"
              :loading="refreshing"
              @click="handleRefresh"
            >
              <el-icon><Refresh /></el-icon>
            </el-button>

            <el-button
              v-if="showExport"
              size="small"
              @click="handleExport"
            >
              <el-icon><Download /></el-icon>
            </el-button>

            <el-button
              v-