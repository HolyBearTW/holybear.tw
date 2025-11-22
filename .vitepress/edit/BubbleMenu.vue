<template>
  <div
    v-if="shouldShow"
    ref="menuRef"
    class="bubble-menu"
    :style="menuStyle"
  >
    <div class="menu-container">
      <!-- 文字樣式按鈕 -->
      <div class="button-group">
        <button
          @click="editor.chain().focus().toggleBold().run()"
          :class="{ 'is-active': editor.isActive('bold') }"
          class="menu-btn"
          title="粗體 (Ctrl+B)"
        >
          <i class="fas fa-bold"></i>
        </button>
        
        <button
          @click="editor.chain().focus().toggleItalic().run()"
          :class="{ 'is-active': editor.isActive('italic') }"
          class="menu-btn"
          title="斜體 (Ctrl+I)"
        >
          <i class="fas fa-italic"></i>
        </button>
        
        <button
          @click="editor.chain().focus().toggleStrike().run()"
          :class="{ 'is-active': editor.isActive('strike') }"
          class="menu-btn"
          title="刪除線"
        >
          <i class="fas fa-strikethrough"></i>
        </button>
        
        <button
          @click="editor.chain().focus().toggleCode().run()"
          :class="{ 'is-active': editor.isActive('code') }"
          class="menu-btn"
          title="行內程式碼"
        >
          <i class="fas fa-code"></i>
        </button>
      </div>

      <div class="divider"></div>

      <!-- 標題選擇器 -->
      <div class="button-group">
        <select
          @change="setHeading"
          :value="currentHeading"
          class="heading-select"
        >
          <option value="paragraph">段落</option>
          <option value="1">標題 1</option>
          <option value="2">標題 2</option>
          <option value="3">標題 3</option>
          <option value="4">標題 4</option>
          <option value="5">標題 5</option>
          <option value="6">標題 6</option>
        </select>
      </div>

      <div class="divider"></div>

      <!-- 對齊方式 -->
      <div class="button-group">
        <button
          @click="editor.chain().focus().setTextAlign('left').run()"
          :class="{ 'is-active': editor.isActive({ textAlign: 'left' }) }"
          class="menu-btn"
          title="靠左對齊"
        >
          <i class="fas fa-align-left"></i>
        </button>
        
        <button
          @click="editor.chain().focus().setTextAlign('center').run()"
          :class="{ 'is-active': editor.isActive({ textAlign: 'center' }) }"
          class="menu-btn"
          title="置中對齊"
        >
          <i class="fas fa-align-center"></i>
        </button>
        
        <button
          @click="editor.chain().focus().setTextAlign('right').run()"
          :class="{ 'is-active': editor.isActive({ textAlign: 'right' }) }"
          class="menu-btn"
          title="靠右對齊"
        >
          <i class="fas fa-align-right"></i>
        </button>
      </div>

      <div class="divider"></div>

      <!-- 列表功能 -->
      <div class="button-group">
        <button
          @click="editor.chain().focus().toggleBulletList().run()"
          :class="{ 'is-active': editor.isActive('bulletList') }"
          class="menu-btn"
          title="項目列表"
        >
          <i class="fas fa-list-ul"></i>
        </button>
        
        <button
          @click="editor.chain().focus().toggleOrderedList().run()"
          :class="{ 'is-active': editor.isActive('orderedList') }"
          class="menu-btn"
          title="編號列表"
        >
          <i class="fas fa-list-ol"></i>
        </button>
        
        <button
          @click="() => {
            if (editor?.isActive('bulletList') || editor?.isActive('orderedList') || editor?.isActive('taskList')) {
              // 如果在列表內，先清除當前節點的格式 (轉為段落)，然後應用引用
              editor?.chain().focus().clearNodes().toggleBlockquote().run();
            } else {
              // 否則，直接切換引用塊
              editor?.chain().focus().toggleBlockquote().run();
            }
          }"
          :class="{ 'is-active': editor?.isActive('blockquote') }"
          class="menu-btn"
          title="引用區塊"
        >
          <i class="fas fa-quote-right"></i>
        </button>
      </div>

      <div class="divider"></div>

      <!-- 其他功能 -->
      <div class="button-group">
        <button
          @click="editor.chain().focus().toggleHighlight().run()"
          :class="{ 'is-active': editor.isActive('highlight') }"
          class="menu-btn"
          title="螢光標記"
        >
          <i class="fas fa-highlighter"></i>
        </button>
        
        <button
          @click="setLink"
          :class="{ 'is-active': editor.isActive('link') }"
          class="menu-btn"
          title="插入連結"
        >
          <i class="fas fa-link"></i>
        </button>

        <button
          @click="editor.chain().focus().toggleTaskList().run()"
          :class="{ 'is-active': editor.isActive('taskList') }"
          class="menu-btn"
          title="轉換為待辦清單"
        >
          <i class="fas fa-tasks"></i>
        </button>
      </div>

      <div class="divider"></div>

      <!-- 進階功能 -->
      <div class="button-group">
        <button
          @click="editor.chain().focus().setHorizontalRule().run()"
          class="menu-btn"
          title="插入分隔線"
        >
          <i class="fas fa-minus"></i>
        </button>
        
        <button
          @click="clearFormatting"
          class="menu-btn"
          title="清除格式"
        >
          <i class="fas fa-eraser"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { CSSProperties } from 'vue'

const props = defineProps<{
  editor: any
}>()

const menuRef = ref<HTMLElement | null>(null)
const shouldShow = ref(false)
const menuStyle = ref<CSSProperties>({
  position: 'fixed',
  top: '0px',
  left: '0px',
  transform: 'translateX(-50%)',
  zIndex: 1000,
  transition: 'top 0.2s ease, left 0.2s ease', // 添加過渡動畫
})

// 計算當前標題級別
const currentHeading = computed(() => {
  if (!props.editor) return 'paragraph'
  
  for (let level = 1; level <= 6; level++) {
    if (props.editor.isActive('heading', { level })) {
      return level.toString()
    }
  }
  
  return 'paragraph'
})

const setHeading = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  
  if (value === 'paragraph') {
    props.editor.chain().focus().setParagraph().run()
  } else {
    props.editor.chain().focus().setHeading({ level: parseInt(value) }).run()
  }
}

const setLink = () => {
  const previousUrl = props.editor.getAttributes('link').href
  const url = window.prompt('輸入連結 URL:', previousUrl)
  
  // 取消
  if (url === null) {
    return
  }
  
  // 清空連結
  if (url === '') {
    props.editor.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  
  // 設定連結
  props.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

// 清除所有格式
const clearFormatting = () => {
  props.editor
    .chain()
    .focus()
    .clearNodes() // 清除節點格式 (標題、列表等)
    .unsetAllMarks() // 清除所有標記 (粗體、斜體、連結等)
    .run()
}

// 更新選單位置和顯示狀態
const updateMenu = () => {
  if (!props.editor) return
  
  const { state } = props.editor
  const { selection } = state
  const { from, to } = selection
  
  // 判斷是否有文字選取
  const hasSelection = from !== to
  
  if (!hasSelection) {
    shouldShow.value = false
    return
  }
  
  // 檢查選取的節點類型 - 如果是圖片或影片,不顯示 BubbleMenu
  const { $from } = selection
  const node = $from.node()
  
  // 排除圖片、影片、YouTube 等媒體節點
  if (node && (
    node.type.name === 'image' ||
    node.type.name === 'youtube' ||
    props.editor.isActive('image') ||
    props.editor.isActive('youtube')
  )) {
    shouldShow.value = false
    return
  }
  
  // 檢查選取範圍內是否包含媒體節點
  let hasMediaNode = false
  state.doc.nodesBetween(from, to, (node: any) => {
    if (node.type.name === 'image' || node.type.name === 'youtube') {
      hasMediaNode = true
      return false // 停止遍歷
    }
  })
  
  if (hasMediaNode) {
    shouldShow.value = false
    return
  }
  
  // 獲取選取範圍的座標
  const start = props.editor.view.coordsAtPos(from)
  const end = props.editor.view.coordsAtPos(to)
  
  // 計算選單位置 (選取區域上方置中)
  const left = (start.left + end.right) / 2
  const top = start.top
  
  // 更新位置,保留 transition 屬性
  menuStyle.value = {
    ...menuStyle.value,
    top: `${top - 50}px`,
    left: `${left}px`,
  }
  
  shouldShow.value = true
}

// 監聽編輯器狀態變化
watch(
  () => props.editor?.state.selection,
  () => {
    updateMenu()
  },
  { deep: true }
)

onMounted(() => {
  if (props.editor) {
    props.editor.on('selectionUpdate', updateMenu)
    props.editor.on('update', updateMenu)
  }
})

onBeforeUnmount(() => {
  if (props.editor) {
    props.editor.off('selectionUpdate', updateMenu)
    props.editor.off('update', updateMenu)
  }
})
</script>

<style scoped>
.bubble-menu {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: var(--vp-shadow-3);
  padding: 0.5rem;
  display: flex;
  gap: 0.25rem;
  animation: fadeIn 0.2s ease;
  flex-wrap: wrap; /* Allow wrapping on smaller screens */
  justify-content: center; /* Center items when wrapped */
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.menu-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap; /* Allow groups to wrap */
  justify-content: center;
}

.button-group {
  display: flex;
  gap: 0.25rem;
}

.menu-btn {
  width: 38px; /* Slightly larger for touch */
  height: 38px; /* Slightly larger for touch */
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--vp-c-text-2);
  font-size: 1.1rem; /* Larger icons */
}

.menu-btn:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.menu-btn.is-active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.heading-select {
  height: 38px; /* Match button height */
  padding: 0 0.75rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  color: var(--vp-c-text-1);
  font-size: 0.95rem; /* Slightly larger font */
  cursor: pointer;
  outline: none;
  transition: all 0.2s;
  min-width: 100px; /* Ensure it's readable */
}

.heading-select:hover {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
}

.heading-select:focus {
  border-color: var(--vp-c-brand-1);
}

.divider {
  width: 1px;
  height: 24px;
  background: var(--vp-c-divider);
}
</style>
