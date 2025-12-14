<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

// 歷史記錄介面
interface HistoryItem {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

const props = defineProps<{
  currentDocId?: string
}>()

const emit = defineEmits<{
  load: [item: HistoryItem]
  delete: [id: string]
}>()

// LocalStorage 鍵名
const HISTORY_KEY = 'vitepress-editor-history'

// 歷史記錄列表
const historyList = ref<HistoryItem[]>([])

// 搜尋關鍵字
const searchQuery = ref('')

// 載入歷史記錄
const loadHistory = () => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY)
    if (stored) {
      historyList.value = JSON.parse(stored)
      // 按更新時間排序 (最新的在前)
      historyList.value.sort((a, b) => b.updatedAt - a.updatedAt)
    }
  } catch (error) {
    console.error('載入歷史記錄失敗:', error)
  }
}

// 刪除歷史記錄
const deleteItem = (id: string) => {
  if (confirm('確定要刪除這條記錄嗎?')) {
    historyList.value = historyList.value.filter(item => item.id !== id)
    saveHistory()
    emit('delete', id)
  }
}

// 載入歷史記錄到編輯器
const loadItem = (item: HistoryItem) => {
  emit('load', item)
}

// 保存歷史記錄到 LocalStorage
const saveHistory = () => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(historyList.value))
  } catch (error) {
    console.error('保存歷史記錄失敗:', error)
  }
}

// 清空所有歷史記錄
const clearAll = () => {
  if (confirm('確定要清空所有歷史記錄嗎?此操作無法撤銷!')) {
    historyList.value = []
    saveHistory()
  }
}

// 格式化時間
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // 小於 1 分鐘
  if (diff < 60000) {
    return '剛剛'
  }
  // 小於 1 小時
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分鐘前`
  }
  // 小於 24 小時
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} 小時前`
  }
  // 小於 7 天
  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)} 天前`
  }
  // 超過 7 天顯示完整日期
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 過濾後的歷史記錄
const filteredHistory = computed(() => {
  if (!searchQuery.value.trim()) {
    return historyList.value
  }
  const query = searchQuery.value.toLowerCase()
  return historyList.value.filter(item => 
    item.title.toLowerCase().includes(query) ||
    item.content.toLowerCase().includes(query)
  )
})

// 獲取預覽文字 (前 100 字)
const getPreviewText = (content: string) => {
  const text = content.replace(/<[^>]*>/g, '').trim()
  return text.length > 100 ? text.substring(0, 100) + '...' : text
}

// 計算緩存大小 (KB)
const cacheSizeKB = computed(() => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY)
    if (!stored) return '0.0'
    // 1 個字元約 1 byte
    const bytes = new Blob([stored]).size
    return (bytes / 1024).toFixed(1)
  } catch {
    return '0.0'
  }
})

// 組件掛載時載入歷史記錄
onMounted(() => {
  loadHistory()
})

// 暴露方法給父組件
defineExpose({
  loadHistory,
  saveHistory
})
</script>

<template>
  <div class="document-history">
    <!-- 頭部 -->
    <div class="history-header">
      <h3 class="history-title">
        <i class="fas fa-history"></i>
        歷史記錄
      </h3>
      <button 
        v-if="historyList.length > 0"
        @click="clearAll"
        class="clear-btn"
        title="清空所有記錄"
      >
        <i class="fas fa-trash-alt"></i>
      </button>
    </div>

    <!-- 搜尋框 -->
    <div class="search-box">
      <i class="fas fa-search search-icon"></i>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜尋歷史記錄..."
        class="search-input"
      />
    </div>

    <!-- 歷史記錄列表 -->
    <div class="history-list">
      <div
        v-for="item in filteredHistory"
        :key="item.id"
        class="history-item"
        :class="{ active: item.id === currentDocId }"
      >
        <div class="item-header">
          <h4 class="item-title" @click="loadItem(item)">
            {{ item.title }}
          </h4>
          <button 
            @click.stop="deleteItem(item.id)"
            class="delete-btn"
            title="刪除"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <p class="item-preview" @click="loadItem(item)">
          {{ getPreviewText(item.content) }}
        </p>
        
        <div class="item-footer">
          <span class="item-time">
            <i class="far fa-clock"></i>
            {{ formatTime(item.updatedAt) }}
          </span>
          <button 
            @click.stop="loadItem(item)"
            class="load-btn"
          >
            <i class="fas fa-folder-open"></i>
            載入
          </button>
        </div>
      </div>

      <!-- 空狀態 -->
      <div v-if="filteredHistory.length === 0" class="empty-state">
        <i class="fas fa-inbox empty-icon"></i>
        <p class="empty-text">
          {{ searchQuery ? '沒有符合的記錄' : '尚無歷史記錄' }}
        </p>
      </div>
    </div>

    <!-- 底部統計信息 -->
    <div class="history-footer">
      <div class="storage-info">
        <i class="fas fa-database"></i>
        <span>暫存: <strong>{{ filteredHistory.length }}</strong> / {{ historyList.length }}</span>
      </div>
      <div class="storage-limit">
        <i class="fas fa-info-circle"></i>
        <span>緩存: <strong>{{ cacheSizeKB }}</strong> KB</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.document-history {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
  border-right: 1px solid var(--vp-c-divider);
}

/* 頭部 */
.history-header {
  height: 60px;
  padding: 0 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: transparent;
  flex-shrink: 0;
}

.history-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.clear-btn {
  padding: 0.4rem 0.6rem;
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: var(--vp-c-danger-soft);
  color: var(--vp-c-danger-1);
  border-color: var(--vp-c-danger-1);
}

/* 搜尋框 */
.search-box {
  padding: 1rem;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 1.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--vp-c-text-3);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg);
}

/* 歷史記錄列表 */
.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.history-item {
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  background: var(--vp-c-bg-alt);
  border-color: var(--vp-c-brand-2);
  transform: translateX(2px);
}

.history-item.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.item-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn {
  padding: 0.2rem 0.4rem;
  background: transparent;
  border: none;
  color: var(--vp-c-text-3);
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 4px;
}

.delete-btn:hover {
  background: var(--vp-c-danger-soft);
  color: var(--vp-c-danger-1);
}

.item-preview {
  margin: 0 0 0.5rem 0;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-time {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.load-btn {
  padding: 0.25rem 0.5rem;
  background: var(--vp-c-brand-soft);
  border: 1px solid var(--vp-c-brand-2);
  border-radius: 4px;
  color: var(--vp-c-brand-1);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.load-btn:hover {
  background: var(--vp-c-brand-1);
  color: white;
}

/* 空狀態 */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
}

.empty-icon {
  font-size: 3rem;
  color: var(--vp-c-text-3);
  margin-bottom: 1rem;
}

.empty-text {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}

/* 滾動條樣式 */
.history-list::-webkit-scrollbar {
  width: 6px;
}

.history-list::-webkit-scrollbar-track {
  background: var(--vp-c-bg-soft);
}

.history-list::-webkit-scrollbar-thumb {
  background: var(--vp-c-divider);
  border-radius: 3px;
}

.history-list::-webkit-scrollbar-thumb:hover {
  background: var(--vp-c-text-3);
}

/* 底部統計信息 */
.history-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--vp-c-divider);
  background: transparent;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.storage-info,
.storage-limit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

.storage-info i {
  color: var(--vp-c-brand-1);
}

.storage-info strong {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.storage-limit {
  color: var(--vp-c-text-3);
  font-size: 0.75rem;
}

.storage-limit i {
  color: var(--vp-c-text-3);
}

/* 暗色模式 */
:global(.dark) .history-header,
:global(body.theme-christmas) .history-header {
  background: transparent !important;
}

:global(body.theme-christmas) .history-title {
  color: var(--panel-text-color) !important;
}

:global(.dark) .search-input,
:global(body.theme-christmas) .search-input {
  background: rgba(0, 0, 0, 0.2) !important;
  color: var(--panel-text-color);
}

:global(body.theme-christmas) .search-input {
  color: #e6f1ff !important;
  border-color: rgba(230, 241, 255, 0.3) !important;
}

:global(body.theme-christmas) .search-input::placeholder {
  color: rgba(230, 241, 255, 0.5) !important;
}

:global(.dark) .history-item,
:global(body.theme-christmas) .history-item {
  background: rgba(0, 0, 0, 0.2) !important;
  border-color: rgba(255, 255, 255, 0.1);
}

:global(body.theme-christmas) .history-item {
  border-color: rgba(230, 241, 255, 0.2) !important;
}

:global(.dark) .history-item:hover,
:global(body.theme-christmas) .history-item:hover {
  background: rgba(0, 0, 0, 0.4) !important;
}

:global(body.theme-christmas) .item-title {
  color: #e6f1ff !important;
}

:global(body.theme-christmas) .item-preview {
  color: rgba(230, 241, 255, 0.7) !important;
}

:global(body.theme-christmas) .item-time {
  color: rgba(230, 241, 255, 0.5) !important;
}
</style>
