
<template>
  <node-view-wrapper
    class="draggable-image-wrapper"
    :class="[
      `align-${node.attrs.align}`,
      { selected: selected, dragging: isDragging }
    ]"
    as="div"
  >
    <div class="image-container" @click="selectImage">
      <img
        :src="node.attrs.src"
        :alt="node.attrs.alt"
        :title="node.attrs.title"
        :style="imageStyle"
        draggable="false"
      />

      <!-- 對齊按鈕組 -->
      <div v-if="selected" class="align-controls">
        <button
          @click.stop="setAlign('left')"
          :class="{ active: node.attrs.align === 'left' }"
          title="靠左對齊"
        >
          <i class="fa-solid fa-align-left"></i>
        </button>
        <button
          @click.stop="setAlign('center')"
          :class="{ active: node.attrs.align === 'center' }"
          title="置中對齊"
        >
          <i class="fa-solid fa-align-center"></i>
        </button>
        <button
          @click.stop="setAlign('right')"
          :class="{ active: node.attrs.align === 'right' }"
          title="靠右對齊"
        >
          <i class="fa-solid fa-align-right"></i>
        </button>
      </div>

      <!-- 8 個調整大小的控制點 -->
      <div v-if="selected" class="resize-handles">
        <!-- 四個角 -->
        <div
          class="resize-handle nw"
          @mousedown="startResize($event, 'nw')"
          title="左上角調整"
        ></div>
        <div
          class="resize-handle ne"
          @mousedown="startResize($event, 'ne')"
          title="右上角調整"
        ></div>
        <div
          class="resize-handle sw"
          @mousedown="startResize($event, 'sw')"
          title="左下角調整"
        ></div>
        <div
          class="resize-handle se"
          @mousedown="startResize($event, 'se')"
          title="右下角調整"
        ></div>
        <!-- 四個邊 -->
        <div
          class="resize-handle n"
          @mousedown="startResize($event, 'n')"
          title="上邊調整"
        ></div>
        <div
          class="resize-handle s"
          @mousedown="startResize($event, 's')"
          title="下邊調整"
        ></div>
        <div
          class="resize-handle w"
          @mousedown="startResize($event, 'w')"
          title="左邊調整"
        ></div>
        <div
          class="resize-handle e"
          @mousedown="startResize($event, 'e')"
          title="右邊調整"
        ></div>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  node: {
    attrs: {
      src: string
      alt?: string
      title?: string
      width?: number
      height?: number
      align: 'left' | 'center' | 'right'
    }
  }
  updateAttributes: (attrs: Record<string, any>) => void
  selected: boolean
}

const props = defineProps<Props>()

const isDragging = ref(false)
const startX = ref(0)
const startY = ref(0)
const startWidth = ref(0)
const startHeight = ref(0)
const resizeDirection = ref<string>('')
const aspectRatio = ref<number>(1)

const MIN_WIDTH = 100
const MAX_WIDTH = 1200
const MIN_HEIGHT = 50

const imageStyle = computed(() => {
  const styles: Record<string, string> = {}
  if (props.node.attrs.width) {
    styles.width = `${props.node.attrs.width}px`
  }
  if (props.node.attrs.height) {
    styles.height = `${props.node.attrs.height}px`
  }
  return styles
})

const selectImage = () => {
  // 選中圖片時,TipTap 會自動設置 selected
}

const setAlign = (align: 'left' | 'center' | 'right') => {
  props.updateAttributes({ align })
}

const startResize = (event: MouseEvent, direction: string) => {
  event.preventDefault()
  event.stopPropagation()

  isDragging.value = true
  resizeDirection.value = direction
  startX.value = event.clientX
  startY.value = event.clientY

  // 獲取當前尺寸
  const img = (event.target as HTMLElement).closest('.image-container')?.querySelector('img')
  if (img) {
    startWidth.value = img.offsetWidth
    startHeight.value = img.offsetHeight
    aspectRatio.value = startWidth.value / startHeight.value
  }

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

const handleResize = (event: MouseEvent) => {
  if (!isDragging.value) return

  const deltaX = event.clientX - startX.value
  const deltaY = event.clientY - startY.value

  let newWidth = startWidth.value
  let newHeight = startHeight.value

  // 根據拖曳方向計算新尺寸
  switch (resizeDirection.value) {
    case 'e': // 右邊
      newWidth = startWidth.value + deltaX
      newHeight = newWidth / aspectRatio.value
      break
    case 'w': // 左邊
      newWidth = startWidth.value - deltaX
      newHeight = newWidth / aspectRatio.value
      break
    case 's': // 下邊
      newHeight = startHeight.value + deltaY
      newWidth = newHeight * aspectRatio.value
      break
    case 'n': // 上邊
      newHeight = startHeight.value - deltaY
      newWidth = newHeight * aspectRatio.value
      break
    case 'se': // 右下角
      newWidth = startWidth.value + deltaX
      newHeight = newWidth / aspectRatio.value
      break
    case 'sw': // 左下角
      newWidth = startWidth.value - deltaX
      newHeight = newWidth / aspectRatio.value
      break
    case 'ne': // 右上角
      newWidth = startWidth.value + deltaX
      newHeight = newWidth / aspectRatio.value
      break
    case 'nw': // 左上角
      newWidth = startWidth.value - deltaX
      newHeight = newWidth / aspectRatio.value
      break
  }

  // 限制最小和最大尺寸
  newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth))
  newHeight = Math.max(MIN_HEIGHT, newWidth / aspectRatio.value)

  props.updateAttributes({
    width: Math.round(newWidth),
    height: Math.round(newHeight),
  })
}

const stopResize = () => {
  isDragging.value = false
  resizeDirection.value = ''
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}
</script>

<style scoped>
.draggable-image-wrapper {
  margin: 1rem 0;
  transition: all 0.2s ease;
}

.draggable-image-wrapper.align-left {
  text-align: left;
}

.draggable-image-wrapper.align-center {
  text-align: center;
}

.draggable-image-wrapper.align-right {
  text-align: right;
}

.image-container {
  position: relative;
  display: inline-block;
  max-width: 100%;
  transition: transform 0.2s ease;
}

.image-container img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}

.selected .image-container img {
  box-shadow: 0 0 0 3px var(--vp-c-brand-1);
  outline: 2px solid var(--vp-c-brand-1);
}

.dragging .image-container img {
  user-select: none;
  pointer-events: none;
}

/* 對齊按鈕組 */
.align-controls {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.align-controls button {
  padding: 6px 10px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--vp-c-text-2);
  transition: all 0.2s ease;
  font-size: 14px;
}

.align-controls button:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand-1);
}

.align-controls button.active {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

/* 調整大小控制點 */
.resize-handles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  pointer-events: all;
  background: var(--vp-c-brand-1);
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

/* 角控制點 (8x8 正方形) */
.resize-handle.nw,
.resize-handle.ne,
.resize-handle.sw,
.resize-handle.se {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.resize-handle.nw {
  top: -5px;
  left: -5px;
  cursor: nw-resize;
}

.resize-handle.ne {
  top: -5px;
  right: -5px;
  cursor: ne-resize;
}

.resize-handle.sw {
  bottom: -5px;
  left: -5px;
  cursor: sw-resize;
}

.resize-handle.se {
  bottom: -5px;
  right: -5px;
  cursor: se-resize;
}

/* 邊控制點 */
.resize-handle.n,
.resize-handle.s {
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 6px;
  border-radius: 3px;
}

.resize-handle.w,
.resize-handle.e {
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 30px;
  border-radius: 3px;
}

.resize-handle.n {
  top: -3px;
  cursor: n-resize;
}

.resize-handle.s {
  bottom: -3px;
  cursor: s-resize;
}

.resize-handle.w {
  left: -3px;
  cursor: w-resize;
}

.resize-handle.e {
  right: -3px;
  cursor: e-resize;
}

/* Hover 效果 */
.resize-handle:hover {
  background: var(--vp-c-brand-2);
  transform: scale(1.2);
}

.resize-handle.n:hover,
.resize-handle.s:hover {
  transform: translateX(-50%) scale(1.2);
}

.resize-handle.w:hover,
.resize-handle.e:hover {
  transform: translateY(-50%) scale(1.2);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .align-controls {
    top: -45px;
    padding: 6px;
  }

  .align-controls button {
    padding: 8px 12px;
    font-size: 16px;
  }

  .resize-handle.nw,
  .resize-handle.ne,
  .resize-handle.sw,
  .resize-handle.se {
    width: 14px;
    height: 14px;
  }

  .resize-handle.n,
  .resize-handle.s {
    width: 40px;
    height: 8px;
  }

  .resize-handle.w,
  .resize-handle.e {
    width: 8px;
    height: 40px;
  }
}
</style>
