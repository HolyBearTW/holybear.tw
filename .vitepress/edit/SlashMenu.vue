<template>
  <div v-if="isVisible" class="slash-menu" :style="{ top: menuPosition.top + 'px', left: menuPosition.left + 'px' }">
    <div class="menu-search">
      <input
        ref="searchInput"
        v-model="searchQuery"
        type="text"
        placeholder="搜尋功能..."
        class="search-input"
        @keydown="handleKeyDown"
      />
    </div>
    <div class="menu-items">
      <div
        v-for="(item, index) in filteredItems"
        :key="item.id"
        :class="['menu-item', { active: index === selectedIndex }]"
        @click="selectItem(item)"
        @mouseenter="selectedIndex = index"
      >
        <div class="item-icon">{{ item.icon }}</div>
        <div class="item-content">
          <div class="item-title">{{ item.title }}</div>
          <div class="item-description">{{ item.description }}</div>
        </div>
      </div>
      <div v-if="filteredItems.length === 0" class="no-results">
        沒有找到匹配的功能
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

interface MenuItem {
  id: string
  title: string
  description: string
  icon: string
  action: () => void
}

const props = defineProps<{
  editor: any
  isVisible: boolean
  menuPosition: { top: number; left: number }
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', item: MenuItem): void
}>()

const searchQuery = ref('')
const selectedIndex = ref(0)
const searchInput = ref<HTMLInputElement>()

const menuItems = computed<MenuItem[]>(() => [
  {
    id: 'heading1',
    title: '大標題',
    description: '一級標題 (H1)',
    icon: 'H1',
    action: () => {
      props.editor.chain().focus().toggleHeading({ level: 1 }).run()
    }
  },
  {
    id: 'heading2',
    title: '中標題',
    description: '二級標題 (H2)',
    icon: 'H2',
    action: () => {
      props.editor.chain().focus().toggleHeading({ level: 2 }).run()
    }
  },
  {
    id: 'heading3',
    title: '小標題',
    description: '三級標題 (H3)',
    icon: 'H3',
    action: () => {
      props.editor.chain().focus().toggleHeading({ level: 3 }).run()
    }
  },
  {
    id: 'bulletList',
    title: '項目列表',
    description: '建立無序列表',
    icon: '●',
    action: () => {
      props.editor.chain().focus().toggleBulletList().run()
    }
  },
  {
    id: 'orderedList',
    title: '編號列表',
    description: '建立有序列表',
    icon: '1.',
    action: () => {
      props.editor.chain().focus().toggleOrderedList().run()
    }
  },
  {
    id: 'taskList',
    title: '待辦清單',
    description: '建立可勾選的任務列表',
    icon: '☐',
    action: () => {
      props.editor.chain().focus().toggleTaskList().run()
    }
  },
  {
    id: 'codeBlock',
    title: '程式碼區塊',
    description: '插入程式碼區塊',
    icon: '</>',
    action: () => {
      props.editor.chain().focus().toggleCodeBlock().run()
    }
  },
  {
    id: 'blockquote',
    title: '引用區塊',
    description: '插入引用文字',
    icon: '❝',
    action: () => {
      props.editor.chain().focus().toggleBlockquote().run()
    }
  },
  {
    id: 'horizontalRule',
    title: '分隔線',
    description: '插入水平分隔線',
    icon: '—',
    action: () => {
      props.editor.chain().focus().setHorizontalRule().run()
    }
  },
  {
    id: 'image',
    title: '圖片',
    description: '插入圖片 (URL)',
    icon: '🖼️',
    action: () => {
      const url = prompt('請輸入圖片 URL:')
      if (url) {
        props.editor.chain().focus().setImage({ src: url }).run()
      }
    }
  },
  {
    id: 'youtube',
    title: 'YouTube 影片',
    description: '嵌入 YouTube 影片',
    icon: '▶️',
    action: () => {
      const url = prompt('請輸入 YouTube 影片 URL 或 ID:')
      if (url) {
        props.editor.chain().focus().setYoutubeVideo({ src: url }).run()
      }
    }
  },
  // 版面佈局節點
  {
    id: 'center',
    title: '置中容器',
    description: '建立置中對齊的容器',
    icon: '⊡',
    action: () => {
      props.editor.chain().focus().setCenter().run()
      emit('close')
    }
  },
  {
    id: 'twoColumns',
    title: '兩欄佈局 (50% + 50%)',
    description: '一次插入兩個並排的欄位',
    icon: '▯▯',
    action: () => {
      props.editor.chain().focus().insertTwoColumns().run()
      emit('close')
    }
  },
  {
    id: 'threeColumns',
    title: '三欄佈局 (33% × 3)',
    description: '一次插入三個並排的欄位',
    icon: '▯▯▯',
    action: () => {
      props.editor.chain().focus().insertThreeColumns().run()
      emit('close')
    }
  },
  {
    id: 'highlight',
    title: '高亮區塊',
    description: '建立高亮提示區塊 (💡 燈泡圖示)',
    icon: '💡',
    action: () => {
      props.editor.chain().focus().setHighlightBlock().run()
      emit('close')
    }
  },
  {
    id: 'boxRed',
    title: '紅色提示框',
    description: 'IMPORTANT - 重要提示',
    icon: '🔴',
    action: () => {
      props.editor.chain().focus().setBox('red').run()
      emit('close')
    }
  },
  {
    id: 'boxYellow',
    title: '黃色提示框',
    description: 'WARNING - 警告訊息',
    icon: '🟡',
    action: () => {
      props.editor.chain().focus().setBox('yellow').run()
      emit('close')
    }
  },
  {
    id: 'boxGreen',
    title: '綠色提示框',
    description: 'SUCCESS - 成功訊息',
    icon: '🟢',
    action: () => {
      props.editor.chain().focus().setBox('green').run()
      emit('close')
    }
  },
  {
    id: 'boxBlue',
    title: '藍色提示框',
    description: 'INFO - 資訊提示',
    icon: '🔵',
    action: () => {
      props.editor.chain().focus().setBox('blue').run()
      emit('close')
    }
  },
  {
    id: 'boxBrand',
    title: '品牌色提示框',
    description: 'NOTE - 注意事項',
    icon: '⭐',
    action: () => {
      props.editor.chain().focus().setBox('brand').run()
      emit('close')
    }
  },
  {
    id: 'card',
    title: '卡片容器',
    description: '建立帶標題的卡片',
    icon: '🃏',
    action: () => {
      const title = prompt('請輸入卡片標題:', 'Card Title')
      if (title !== null) {
        props.editor.chain().focus().setCard(title).run()
        emit('close')
      }
    }
  },
  {
    id: 'tabs',
    title: '標籤頁 (預設)',
    description: '建立可切換的標籤頁容器',
    icon: '📑',
    action: () => {
      const count = prompt('請輸入標籤頁數量 (2-8):', '2')
      const tabCount = parseInt(count || '2')
      if (tabCount >= 2 && tabCount <= 8) {
        props.editor.chain().focus().setTabs('default', tabCount).run()
        emit('close')
      } else {
        alert('標籤頁數量必須在 2-8 之間')
      }
    }
  },
  {
    id: 'tabsBox',
    title: '標籤頁 (Box 樣式)',
    description: '帶陰影的標籤頁容器',
    icon: '📋',
    action: () => {
      const count = prompt('請輸入標籤頁數量 (2-8):', '3')
      const tabCount = parseInt(count || '3')
      if (tabCount >= 2 && tabCount <= 8) {
        props.editor.chain().focus().setTabs('box', tabCount).run()
        emit('close')
      }
    }
  },
  {
    id: 'tabsColored',
    title: '標籤頁 (彩色樣式)',
    description: '選擇顏色主題的標籤頁',
    icon: '🎨',
    action: () => {
      const colors = ['red', 'yellow', 'green', 'blue', 'brand']
      const colorNames = ['紅色', '黃色', '綠色', '藍色', '品牌色']
      const colorChoice = prompt(
        `選擇顏色 (輸入數字):\n1. ${colorNames[0]}\n2. ${colorNames[1]}\n3. ${colorNames[2]}\n4. ${colorNames[3]}\n5. ${colorNames[4]}`,
        '1'
      )
      const colorIndex = parseInt(colorChoice || '1') - 1
      
      if (colorIndex >= 0 && colorIndex < colors.length) {
        const count = prompt('請輸入標籤頁數量 (2-8):', '2')
        const tabCount = parseInt(count || '2')
        
        if (tabCount >= 2 && tabCount <= 8) {
          props.editor.chain().focus().setTabs(`box-${colors[colorIndex]}`, tabCount).run()
          emit('close')
        }
      }
    }
  },
])

const filteredItems = computed(() => {
  if (!searchQuery.value) return menuItems.value
  
  const query = searchQuery.value.toLowerCase()
  return menuItems.value.filter(item =>
    item.title.toLowerCase().includes(query) ||
    item.description.toLowerCase().includes(query)
  )
})

const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      selectedIndex.value = Math.min(selectedIndex.value + 1, filteredItems.value.length - 1)
      break
    case 'ArrowUp':
      e.preventDefault()
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
      break
    case 'Enter':
      e.preventDefault()
      if (filteredItems.value[selectedIndex.value]) {
        selectItem(filteredItems.value[selectedIndex.value])
      }
      break
    case 'Escape':
      e.preventDefault()
      emit('close')
      break
  }
}

const selectItem = (item: MenuItem) => {
  item.action()
  emit('select', item)
  emit('close')
}

watch(() => props.isVisible, async (visible) => {
  if (visible) {
    searchQuery.value = ''
    selectedIndex.value = 0
    await nextTick()
    searchInput.value?.focus()
  }
})
</script>

<style scoped>
.slash-menu {
  position: fixed;
  z-index: 9999;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: var(--vp-shadow-3);
  width: 320px; /* Default desktop width */
  max-height: 400px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

@media (max-width: 767px) {
  .slash-menu {
    width: calc(100% - 2rem); /* Full width with some padding */
    left: 1rem !important; /* Center on screen, override inline style */
    transform: none !important; /* Remove horizontal transform if any */
    max-height: 50vh; /* Limit height to prevent being hidden by virtual keyboard */
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .menu-search {
    padding: 0.5rem;
  }

  .search-input {
    padding: 0.6rem;
    font-size: 1rem;
  }

  .menu-item {
    padding: 0.6rem 0.75rem; /* Larger padding for touch */
    gap: 0.5rem;
  }

  .item-icon {
    width: 2.2rem; /* Larger icon container */
    height: 2.2rem;
    font-size: 1.1rem;
  }

  .item-title {
    font-size: 1rem;
  }

  .item-description {
    font-size: 0.8rem;
    white-space: normal; /* Allow description to wrap */
    -webkit-line-clamp: 2; /* Limit to 2 lines */
    -webkit-box-orient: vertical;
    display: -webkit-box;
    overflow: hidden;
  }
}

@media (max-width: 767px) {
  .slash-menu {
    width: calc(100% - 2rem); /* Full width with some padding */
    left: 1rem !important; /* Center on screen, override inline style */
    transform: none !important; /* Remove horizontal transform if any */
    max-height: 50vh; /* Limit height to prevent being hidden by virtual keyboard */
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .menu-search {
    padding: 0.5rem;
  }

  .search-input {
    padding: 0.6rem;
    font-size: 1rem;
  }

  .menu-item {
    padding: 0.6rem 0.75rem; /* Larger padding for touch */
    gap: 0.5rem;
  }

  .item-icon {
    width: 2.2rem; /* Larger icon container */
    height: 2.2rem;
    font-size: 1.1rem;
  }

  .item-title {
    font-size: 1rem;
  }

  .item-description {
    font-size: 0.8rem;
    white-space: normal; /* Allow description to wrap */
    -webkit-line-clamp: 2; /* Limit to 2 lines */
    -webkit-box-orient: vertical;
    display: -webkit-box;
    overflow: hidden;
  }
}

.menu-search {
  padding: 0.75rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.search-input {
  width: 100%;
  padding: 0.5rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 0.9rem;
  color: var(--vp-c-text-1);
  outline: none;
}

.search-input:focus {
  border-color: var(--vp-c-brand-1);
}

.menu-items {
  overflow-y: auto;
  max-height: 340px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
}

.menu-item:hover,
.menu-item.active {
  background: var(--vp-c-bg-soft);
}

.item-icon {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-radius: 6px;
  font-weight: 600;
  font-size: 1rem;
  flex-shrink: 0;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-weight: 500;
  color: var(--vp-c-text-1);
  margin-bottom: 0.25rem;
}

.item-description {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-results {
  padding: 2rem;
  text-align: center;
  color: var(--vp-c-text-3);
  font-size: 0.9rem;
}
</style>
