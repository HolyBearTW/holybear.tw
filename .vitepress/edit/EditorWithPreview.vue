<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed, defineAsyncComponent, Suspense } from 'vue'
import { exportToMarkdown } from './utils/markdownExporter'
import DocumentHistory from './DocumentHistory.vue'
import MarkdownPreview from './MarkdownPreview.vue'
import MarkdownIt from 'markdown-it'

// 異步載入編輯器組件
const VPEditor = defineAsyncComponent(() => import('./VPEditor.vue'))

// 初始化 markdown-it
const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true
})

// 歷史記錄介面
interface HistoryItem {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

// LocalStorage 鍵名
const CURRENT_DOC_KEY = 'vitepress-editor-current'
const HISTORY_KEY = 'vitepress-editor-history'

// 當前文檔 ID
const currentDocId = ref<string>('')

// 編輯器引用
const editorRef = ref<any>(null)

// 文檔標題
const documentTitle = ref('未命名文檔')

// 編輯器內容 (HTML)
const editorContent = ref('')

// Markdown 內容 (用於預覽)
const markdownContent = ref('')

// 是否顯示預覽
const showPreview = ref(true)

// 是否顯示歷史記錄
const showHistory = ref(true)

// 編輯模式: 'visual' 或 'markdown'
const editMode = ref<'visual' | 'markdown'>('visual')

// Markdown 源碼 (純文本編輯模式)
const markdownSource = ref('')

// 分隔線位置 (用於調整大小)
const historyWidth = ref(280) // 歷史記錄寬度
const editorWidth = ref(50) // 編輯器寬度百分比

// 自動保存計時器
let autoSaveTimer: number | null = null

// 歷史記錄組件引用
const historyRef = ref<any>(null)

// 是否正在拖拽調整大小
const isResizing = ref(false)
const isResizingHistory = ref(false)

// 生成新文檔 ID
const generateDocId = () => {
  return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// 載入當前文檔
const loadCurrentDoc = () => {
  try {
    const stored = localStorage.getItem(CURRENT_DOC_KEY)
    if (stored) {
      const doc = JSON.parse(stored)
      currentDocId.value = doc.id
      documentTitle.value = doc.title
      editorContent.value = doc.content
      markdownContent.value = doc.markdown || ''
      markdownSource.value = doc.markdown || ''
    } else {
      // 創建新文檔
      createNewDoc()
    }
  } catch (error) {
    console.error('載入文檔失敗:', error)
    createNewDoc()
  }
}

// 創建新文檔
const createNewDoc = () => {
  currentDocId.value = generateDocId()
  documentTitle.value = '未命名文檔'
  editorContent.value = ''
  markdownContent.value = ''
  markdownSource.value = ''
  saveCurrentDoc()
}

// 保存當前文檔
const saveCurrentDoc = () => {
  try {
    const doc = {
      id: currentDocId.value,
      title: documentTitle.value,
      content: editorContent.value,
      markdown: markdownContent.value,
      updatedAt: Date.now()
    }
    localStorage.setItem(CURRENT_DOC_KEY, JSON.stringify(doc))
  } catch (error) {
    console.error('保存文檔失敗:', error)
  }
}

// 保存到歷史記錄
const saveToHistory = () => {
  try {
    // 讀取現有歷史
    let history: HistoryItem[] = []
    const stored = localStorage.getItem(HISTORY_KEY)
    if (stored) {
      history = JSON.parse(stored)
    }

    // 查找是否已存在
    const existingIndex = history.findIndex(item => item.id === currentDocId.value)
    
    const historyItem: HistoryItem = {
      id: currentDocId.value,
      title: documentTitle.value,
      content: markdownContent.value,
      createdAt: existingIndex >= 0 ? history[existingIndex].createdAt : Date.now(),
      updatedAt: Date.now()
    }

    if (existingIndex >= 0) {
      // 更新現有記錄
      history[existingIndex] = historyItem
    } else {
      // 新增記錄
      history.unshift(historyItem)
    }

    // 限制歷史記錄數量 (最多 50 條)
    if (history.length > 50) {
      history = history.slice(0, 50)
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    
    // 刷新歷史記錄列表
    if (historyRef.value) {
      historyRef.value.loadHistory()
    }
  } catch (error) {
    console.error('保存歷史記錄失敗:', error)
  }
}

// 從編輯器更新內容
const handleEditorUpdate = (html: string) => {
  editorContent.value = html
  
  // 轉換為 Markdown
  try {
    markdownContent.value = exportToMarkdown(html)
    markdownSource.value = markdownContent.value
  } catch (error) {
    console.error('轉換 Markdown 失敗:', error)
  }
  
  // 啟動自動保存
  scheduleAutoSave()
}

// 排程自動保存
const scheduleAutoSave = () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
  
  autoSaveTimer = window.setTimeout(() => {
    saveCurrentDoc()
    saveToHistory()
  }, 2000) // 2 秒後自動保存
}

// 載入歷史記錄項目
const handleLoadHistory = (item: HistoryItem) => {
  currentDocId.value = item.id
  documentTitle.value = item.title
  markdownContent.value = item.content
  markdownSource.value = item.content
  
  // 如果在視覺模式,需要將 Markdown 轉回 HTML
  if (editMode.value === 'visual' && editorRef.value) {
    // 使用 markdown-it 將 Markdown 轉換為 HTML
    const htmlContent = md.render(item.content)
    editorRef.value.setContent(htmlContent)
  }
  
  saveCurrentDoc()
}

// 刪除歷史記錄項目
const handleDeleteHistory = (id: string) => {
  if (id === currentDocId.value) {
    // 如果刪除的是當前文檔,創建新文檔
    createNewDoc()
  }
}

// 切換預覽顯示
const togglePreview = () => {
  showPreview.value = !showPreview.value
}

// 切換歷史記錄顯示
const toggleHistory = () => {
  showHistory.value = !showHistory.value
}

// 切換編輯模式
const toggleEditMode = () => {
  if (editMode.value === 'visual') {
    // 切換到 Markdown 源碼模式
    editMode.value = 'markdown'
    // 獲取當前內容的 Markdown
    if (editorRef.value) {
      const html = editorRef.value.getHTML()
      markdownSource.value = exportToMarkdown(html)
    }
  } else {
    // 切換回視覺模式
    editMode.value = 'visual'
    // 將 Markdown 源碼更新到編輯器
    markdownContent.value = markdownSource.value
    // 將 Markdown 轉換為 HTML 並設置到編輯器
    if (editorRef.value) {
      const htmlContent = md.render(markdownSource.value)
      editorRef.value.setContent(htmlContent)
    }
  }
}

// 更新 Markdown 源碼
const updateMarkdownSource = () => {
  markdownContent.value = markdownSource.value
  scheduleAutoSave()
}

// 導出 Markdown 文件
const exportDocument = () => {
  const blob = new Blob([markdownContent.value], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${documentTitle.value}.md`
  a.click()
  URL.revokeObjectURL(url)
}

// 創建新文檔 (按鈕)
const handleNewDoc = () => {
  if (confirm('確定要創建新文檔嗎?當前未保存的更改將會丟失。')) {
    createNewDoc()
    if (editorRef.value) {
      editorRef.value.commands.setContent('')
    }
  }
}

// 開始調整編輯器大小
const startResizeEditor = (e: MouseEvent) => {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = editorWidth.value
  
  const onMouseMove = (moveEvent: MouseEvent) => {
    const deltaX = moveEvent.clientX - startX
    const containerWidth = window.innerWidth - (showHistory.value ? historyWidth.value : 0)
    const deltaPercent = (deltaX / containerWidth) * 100
    const newWidth = Math.max(20, Math.min(80, startWidth + deltaPercent))
    editorWidth.value = newWidth
  }
  
  const onMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }
  
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

// 開始調整歷史記錄大小
const startResizeHistory = (e: MouseEvent) => {
  isResizingHistory.value = true
  const startX = e.clientX
  const startWidth = historyWidth.value
  
  const onMouseMove = (moveEvent: MouseEvent) => {
    const deltaX = moveEvent.clientX - startX
    const newWidth = Math.max(200, Math.min(500, startWidth + deltaX))
    historyWidth.value = newWidth
  }
  
  const onMouseUp = () => {
    isResizingHistory.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }
  
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

// 計算編輯器樣式
const editorStyle = computed(() => {
  if (!showPreview.value) {
    return { width: '100%' }
  }
  return { width: `${editorWidth.value}%` }
})

// 計算預覽樣式
const previewStyle = computed(() => {
  if (!showPreview.value) {
    return { display: 'none' }
  }
  return { width: `${100 - editorWidth.value}%` }
})

// 組件掛載
onMounted(() => {
  loadCurrentDoc()
})

// 組件卸載
onBeforeUnmount(() => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
  saveCurrentDoc()
  saveToHistory()
})
</script>

<template>
  <div class="editor-with-preview">
    <!-- 頂部工具列 -->
    <div class="top-toolbar">
      <div class="toolbar-left">
        <input
          v-model="documentTitle"
          type="text"
          class="doc-title-input"
          placeholder="輸入文檔標題..."
          @blur="scheduleAutoSave"
        />
      </div>
      
      <div class="toolbar-center">
        <button
          @click="toggleEditMode"
          class="mode-toggle-btn"
          :class="{ active: editMode === 'markdown' }"
          title="切換編輯模式"
        >
          <i :class="editMode === 'visual' ? 'fas fa-code' : 'fas fa-eye'"></i>
          {{ editMode === 'visual' ? 'Markdown 源碼' : '視覺編輯' }}
        </button>
      </div>
      
      <div class="toolbar-right">
        <button @click="toggleHistory" class="toolbar-btn" :class="{ active: showHistory }">
          <i class="fas fa-history"></i>
          歷史記錄
        </button>
        <button @click="togglePreview" class="toolbar-btn" :class="{ active: showPreview }">
          <i class="fas fa-eye"></i>
          預覽
        </button>
        <button @click="exportDocument" class="toolbar-btn">
          <i class="fas fa-download"></i>
          導出
        </button>
        <button @click="handleNewDoc" class="toolbar-btn">
          <i class="fas fa-file-alt"></i>
          新建
        </button>
      </div>
    </div>

    <!-- 主內容區 -->
    <div class="main-content">
      <!-- 歷史記錄側邊欄 -->
      <div v-if="showHistory" class="history-sidebar" :style="{ width: historyWidth + 'px' }">
        <DocumentHistory
          ref="historyRef"
          :current-doc-id="currentDocId"
          @load="handleLoadHistory"
          @delete="handleDeleteHistory"
        />
        
        <!-- 調整大小手柄 -->
        <div class="resize-handle resize-handle-history" @mousedown="startResizeHistory"></div>
      </div>

      <!-- 編輯器和預覽區 -->
      <div class="content-area">
        <!-- 編輯器區 -->
        <div class="editor-section" :style="editorStyle">
          <!-- 視覺編輯模式 -->
          <div v-if="editMode === 'visual'" class="visual-editor">
            <Suspense>
              <template #default>
                <VPEditor
                  ref="editorRef"
                  :initial-content="editorContent"
                  @update="handleEditorUpdate"
                />
              </template>
              <template #fallback>
                <div class="editor-loading">
                  <i class="fas fa-spinner fa-spin"></i>
                  <p>載入編輯器...</p>
                </div>
              </template>
            </Suspense>
          </div>
          
          <!-- Markdown 源碼編輯模式 -->
          <div v-else class="markdown-editor">
            <div class="markdown-editor-header">
              <h3>
                <i class="fas fa-code"></i>
                Markdown 源碼
              </h3>
              <span class="markdown-tip">
                💡 直接編輯 Markdown 語法
              </span>
            </div>
            <textarea
              v-model="markdownSource"
              class="markdown-textarea"
              placeholder="# 開始編寫 Markdown..."
              @input="updateMarkdownSource"
            ></textarea>
          </div>
          
          <!-- 調整大小手柄 -->
          <div 
            v-if="showPreview"
            class="resize-handle resize-handle-editor"
            @mousedown="startResizeEditor"
          ></div>
        </div>

        <!-- 預覽區 -->
        <div v-if="showPreview" class="preview-section" :style="previewStyle">
          <MarkdownPreview :markdown="markdownContent" />
        </div>
      </div>
    </div>

    <!-- 拖拽遮罩 -->
    <div v-if="isResizing || isResizingHistory" class="resize-overlay"></div>
  </div>
</template>

<style scoped>
.editor-with-preview {
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg);
  overflow: hidden;
}

/* 頂部工具列 */
.top-toolbar {
  height: 60px;
  padding: 0 1rem;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-shrink: 0;
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toolbar-left {
  flex: 1;
  min-width: 0;
}

.doc-title-input {
  width: 100%;
  max-width: 400px;
  padding: 0.5rem 0.75rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  color: var(--vp-c-text-1);
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.2s;
}

.doc-title-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-alt);
}

.mode-toggle-btn {
  padding: 0.5rem 1rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.mode-toggle-btn:hover {
  background: var(--vp-c-bg-alt);
  border-color: var(--vp-c-brand-2);
}

.mode-toggle-btn.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.toolbar-btn {
  padding: 0.5rem 0.75rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  color: var(--vp-c-text-2);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.toolbar-btn:hover {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-2);
}

.toolbar-btn.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

/* 主內容區 */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

/* 歷史記錄側邊欄 */
.history-sidebar {
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
}

/* 內容區域 */
.content-area {
  flex: 1;
  display: flex;
  min-width: 0;
  position: relative;
}

/* 編輯器區 */
.editor-section {
  position: relative;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--vp-c-divider);
  transition: width 0.1s ease-out;
}

.visual-editor,
.markdown-editor {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Markdown 編輯器 */
.markdown-editor-header {
  height: 60px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  display: flex;
  padding-left: 15px;
  padding-right: 12px;
  justify-content: space-between;
  align-items: center;
}

.markdown-editor-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.markdown-tip {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

.markdown-textarea {
  flex: 1;
  width: 100%;
  padding: 1.5rem;
  background: var(--vp-c-bg);
  border: none;
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 0.9rem;
  line-height: 1.7;
  resize: none;
  outline: none;
}

.markdown-textarea::placeholder {
  color: var(--vp-c-text-3);
}

/* 預覽區 */
.preview-section {
  transition: width 0.1s ease-out;
  overflow: hidden;
}

/* 調整大小手柄 */
.resize-handle {
  position: absolute;
  background: transparent;
  transition: background 0.2s;
  z-index: 10;
}

.resize-handle:hover {
  background: var(--vp-c-brand-1);
}

.resize-handle-history {
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  cursor: ew-resize;
}

.resize-handle-editor {
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  cursor: ew-resize;
}

/* 拖拽遮罩 */
.resize-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9;
  cursor: ew-resize;
}

/* 編輯器載入狀態 */
.editor-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--vp-c-text-2);
  padding: 2rem;
}

.editor-loading i {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: var(--vp-c-brand-1);
}

.editor-loading p {
  margin: 0;
  font-size: 0.9rem;
}

/* 響應式設計 */
@media (max-width: 960px) {
  .top-toolbar {
    height: auto;
    flex-wrap: wrap;
    padding: 0.75rem;
  }
  
  .toolbar-left,
  .toolbar-center,
  .toolbar-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .doc-title-input {
    max-width: none;
  }
  
  .history-sidebar {
    width: 100% !important;
    max-width: 280px;
  }
  
  .editor-section {
    width: 100% !important;
  }
  
  .preview-section {
    display: none !important;
  }
}

/* 暗色模式 */
.dark .markdown-textarea {
  background: var(--vp-c-bg-alt);
}
</style>
