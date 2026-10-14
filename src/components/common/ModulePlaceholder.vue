<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description?: string
  }>(),
  {
    description: '该功能模块已完成路由搭建，业务内容将在后续开发中呈现',
  },
)
</script>

<template>
  <section class="display-stage" :aria-label="`${title}展示区域`">
    <div class="corner corner-tl"></div>
    <div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div>
    <div class="corner corner-br"></div>
    <div class="stage-beam"></div>

    <div class="radar" aria-hidden="true">
      <span class="radar-ring ring-one"></span>
      <span class="radar-ring ring-two"></span>
      <span class="radar-ring ring-three"></span>
      <span class="radar-axis axis-x"></span>
      <span class="radar-axis axis-y"></span>
      <span class="radar-pulse"></span>
    </div>

    <div class="empty-state">
      <div class="locator"><i></i><span></span></div>
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
      <div class="data-stream">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
    </div>

    <div class="stage-coordinate coordinate-left">等待真实业务数据</div>
    <div class="stage-coordinate coordinate-right">未启用模拟数据</div>
  </section>
</template>
