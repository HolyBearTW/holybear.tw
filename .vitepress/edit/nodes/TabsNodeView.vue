
<template>
  <node-view-wrapper :class="tabsClass">
    <div class="tabs-header">
      <div class="tabs-nav">
        <button
          v-for="(tab, index) in tabs"
          :key="tab.id"
          :class="['tab-button', { active: activeTab === index }]"
          @click="activeTab = index"
        >
          <input
            v-model="tab.label"
            class="tab-label-input"
            @click.stop
            @keydown.enter.prevent="focusTabContent(index)"
            placeholder="Tab Label"
          />
          <button
            v-if="tabs.length > 1"
            class="tab-remove"
            @click.stop="removeTab(index)"
            title="刪除此標籤"
          >
            ×
          </button>
        </button>
        <button class="tab-add" @click="addTab" title="新增標籤頁">
          + 新增標籤
        </button>
      </div>
      <div class="tabs-style-selector">
        <select v-model="currentStyle" class="style-select">
          <option value="default">預設樣式</option>
          <option value="box">Box</option>
          <option value="box-red">Red Box</option>
          <option value="box-yellow">Yellow Box</option>
          <option value="box-green">Green Box</option>
          <option value="box-blue">Blue Box</option>
          <option value="box-brand">Brand Box</option>
        </select>
      </div>
    </div>
    
    <div class="tabs-content">
      <div
        v-for="(tab, index) in tabs"
        v-show="activeTab === index"
        :key="tab.id"
        class="tab-panel"
      >
        <textarea
          :ref="el => tabTextareas[index] = el"
          v-model="tab.content"
          class="tab-content-input"
          placeholder="輸入標籤內容..."
          rows="5"
        ></textarea>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps<{
  node: {
    attrs: {
      tabs: Array<{ id: string; label: string; content: string }>
      style: string
    }
  }
  updateAttributes: (attrs: any) => void
}>()

const activeTab = ref(0)
const tabs = ref([...props.node.attrs.tabs])
const currentStyle = ref(props.node.attrs.style)
const tabTextareas = ref<any[]>([])

const tabsClass = computed(() => {
  const style = currentStyle.value
  return style === 'default' 
    ? 'custom-block tabs' 
    : `custom-block tabs tabs-${style}`
})

// 監聽 tabs 變化並更新屬性
watch(tabs, (newTabs) => {
  props.updateAttributes({ tabs: [...newTabs] })
}, { deep: true })

// 監聽樣式變化
watch(currentStyle, (newStyle) => {
  props.updateAttributes({ style: newStyle })
})

const addTab = () => {
  const newIndex = tabs.value.length + 1
  const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
  tabs.value.push({
    id: `tab${Date.now()}`,
    label: `Tab ${labels[newIndex - 1] || newIndex}`,
    content: `Content for tab ${labels[newIndex - 1] || newIndex}`,
  })
  activeTab.value = tabs.value.length - 1
}

const removeTab = (index: number) => {
  if (tabs.value.length <= 1) return
  
  tabs.value.splice(index, 1)
  
  // 調整 activeTab
  if (activeTab.value >= tabs.value.length) {
    activeTab.value = tabs.value.length - 1
  }
}

const focusTabContent = (index: number) => {
  activeTab.value = index
  setTimeout(() => {
    tabTextareas.value[index]?.focus()
  }, 100)
}

onMounted(() => {
  // 初始化時確保至少有兩個標籤
  if (tabs.value.length === 0) {
    tabs.value = [
      { id: 'tab1', label: 'Tab A', content: '' },
      { id: 'tab2', label: 'Tab B', content: '' },
    ]
  }
})
</script>

<style scoped>
.custom-block.tabs {
  margin: 1.5rem 0;
  border: 2px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg);
}

.tabs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--vp-c-bg-soft);
  border-bottom: 2px solid var(--vp-c-divider);
  padding: 0.5rem;
  gap: 1rem;
}

.tabs-nav {
  display: flex;
  gap: 0.25rem;
  flex: 1;
  overflow-x: auto;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-button:hover {
  background: var(--vp-c-bg);
}

.tab-button.active {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.tab-label-input {
  background: transparent;
  border: none;
  outline: none;
  font-size: 0.9rem;
  color: inherit;
  min-width: 60px;
  max-width: 120px;
}

.tab-remove {
  width: 20px;
  height: 20px;
  padding: 0;
  background: var(--vp-c-danger-soft);
  border: 1px solid var(--vp-c-danger-1);
  border-radius: 50%;
  color: var(--vp-c-danger-1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
  transition: all 0.2s;
}

.tab-remove:hover {
  background: var(--vp-c-danger-1);
  color: white;
}

.tab-add {
  padding: 0.5rem 1rem;
  background: var(--vp-c-brand-soft);
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 6px;
  color: var(--vp-c-brand-1);
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab-add:hover {
  background: var(--vp-c-brand-1);
  color: white;
}

.tabs-style-selector {
  flex-shrink: 0;
}

.style-select {
  padding: 0.4rem 0.8rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  color: var(--vp-c-text-1);
  font-size: 0.85rem;
  cursor: pointer;
  outline: none;
}

.style-select:hover {
  border-color: var(--vp-c-brand-1);
}

.tabs-content {
  padding: 1.5rem;
  min-height: 150px;
}

.tab-panel {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tab-content-input {
  width: 100%;
  padding: 0.75rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  color: var(--vp-c-text-1);
  font-size: 0.95rem;
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
  outline: none;
}

.tab-content-input:focus {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg);
}

/* 樣式變體 */
.custom-block.tabs.tabs-box {
  border: 2px solid var(--vp-c-divider-light);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.custom-block.tabs.tabs-box-red {
  border-color: #ff5a5a;
  background: rgba(255, 90, 90, 0.05);
}

.custom-block.tabs.tabs-box-red .tabs-header {
  background: rgba(255, 90, 90, 0.1);
  border-bottom-color: #ff5a5a;
}

.custom-block.tabs.tabs-box-yellow {
  border-color: #ffc107;
  background: rgba(255, 193, 7, 0.05);
}

.custom-block.tabs.tabs-box-yellow .tabs-header {
  background: rgba(255, 193, 7, 0.1);
  border-bottom-color: #ffc107;
}

.custom-block.tabs.tabs-box-green {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.05);
}

.custom-block.tabs.tabs-box-green .tabs-header {
  background: rgba(76, 175, 80, 0.1);
  border-bottom-color: #4caf50;
}

.custom-block.tabs.tabs-box-blue {
  border-color: #2196f3;
  background: rgba(33, 150, 243, 0.05);
}

.custom-block.tabs.tabs-box-blue .tabs-header {
  background: rgba(33, 150, 243, 0.1);
  border-bottom-color: #2196f3;
}

.custom-block.tabs.tabs-box-brand {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.custom-block.tabs.tabs-box-brand .tabs-header {
  background: var(--vp-c-brand-softer);
  border-bottom-color: var(--vp-c-brand-1);
}
</style>
