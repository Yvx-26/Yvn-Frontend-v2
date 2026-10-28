<script setup lang="ts">
defineProps<{ title: string; description?: string; actionLabel?: string; busy?: boolean }>()
defineEmits<{ action: [] }>()
</script>

<template>
  <section class="module-state" role="status">
    <strong>{{ title }}</strong>
    <p v-if="description">{{ description }}</p>
    <button v-if="actionLabel" type="button" :disabled="busy" @click="$emit('action')">
      {{ busy ? '正在加载…' : actionLabel }}
    </button>
  </section>
</template>

<style scoped>
.module-state {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 160px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 24px;
  color: #b6d3e4;
  background: rgba(6, 26, 44, 0.75);
  border: 1px solid rgba(73, 164, 216, 0.2);
  border-radius: 6px;
  gap: 12px;
}
p {
  max-width: 680px;
  margin: 0;
  color: #8faabd;
  text-align: center;
  line-height: 1.8;
}
button {
  padding: 7px 16px;
  color: #51d9ef;
  cursor: pointer;
  background: #0b3048;
  border: 1px solid #1b697f;
  border-radius: 4px;
}
button:disabled {
  cursor: wait;
  opacity: 0.6;
}
</style>
