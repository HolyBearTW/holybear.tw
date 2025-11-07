<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  src?: string
  alt?: string
  reason?: string
}>()

const isRevealed = ref(false)

const reveal = () => {
  isRevealed.value = true
}
</script>

<template>
  <div class="spoiler-wrapper">
    <div class="spoiler-container" :class="{ revealed: isRevealed }" @click="reveal">
      <div class="spoiler-content">
        <slot>
          <img v-if="src" :src="src" :alt="alt || '劇透內容'" class="spoiler-image" />
        </slot>
      </div>
      <div v-if="!isRevealed" class="spoiler-overlay">
        <div class="spoiler-warning">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <!-- 眼睛外框 -->
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <!-- 眼球 -->
            <circle cx="12" cy="12" r="3"></circle>
            <!-- 禁止斜線 -->
            <line x1="3" y1="3" x2="21" y2="21"></line>
          </svg>
          <span>{{ reason || '劇透內容' }}</span>
          <span class="spoiler-hint">點擊顯示</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spoiler-wrapper {
  display: inline-block;
  max-width: 100%;
}

.spoiler-container {
  position: relative;
  display: inline-block;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  max-width: 100%;
}

.spoiler-content {
  display: block;
  max-width: 100%;
}

.spoiler-container:not(.revealed) .spoiler-content {
  filter: blur(50px);
  transform: scale(1.05);
}

.spoiler-container.revealed .spoiler-content {
  filter: none;
  transform: scale(1);
  transition: filter 0.3s ease, transform 0.3s ease;
}

.spoiler-image {
  display: block;
  max-width: 100%;
  height: auto;
}

.spoiler-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.3s ease;
  filter: blur(0) !important;
}

.spoiler-container.revealed .spoiler-overlay {
  opacity: 0;
  pointer-events: none;
}

.spoiler-warning {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: white;
  text-align: center;
  padding: 1rem;
  user-select: none;
}

.spoiler-warning svg {
  opacity: 0.9;
}

.spoiler-warning > span:first-of-type {
  font-weight: 600;
  font-size: 1rem;
}

.spoiler-hint {
  font-size: 0.875rem;
  opacity: 0.7;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 4px 12px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
}

.spoiler-container:hover .spoiler-hint {
  background: rgba(255, 255, 255, 0.2);
}
</style>
