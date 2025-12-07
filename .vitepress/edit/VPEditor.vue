<template>
  <div class="vp-editor-wrapper">
    <div class="editor-toolbar">
      <button @click="exportMarkdown" class="toolbar-btn export-btn">
        <i class="fas fa-download"></i>
        導出 Markdown
      </button>
      <button @click="clearContent" class="toolbar-btn clear-btn">
        <i class="fas fa-trash"></i>
        清空內容
      </button>
      <div class="toolbar-info">
        <button 
          class="info-btn"
          @mouseenter="handleTooltipEnter"
          @mouseleave="handleTooltipLeave"
          title="輸入 / 開啟插入選單 | 選取文字顯示格式選單"
        >
          <i class="fas fa-info-circle"></i>
        </button>
        <span>字數: {{ editor?.storage.characterCount?.characters() || 0 }}</span>
        <div v-if="showTooltip" class="info-tooltip">
          {{ currentTip }}
        </div>
      </div>
    </div>

    <!-- 新增固定工具列 -->
    <FixedToolbar
      :editor="editor"
      @insertImage="handleInsertImage"
      @insertYoutube="handleInsertYoutube"
      @insertTable="handleInsertTable"
      @insertTabs="handleInsertTabs"
    />
    
    <div class="editor-container">
      <!-- Bubble Menu (選取文字時顯示) -->
      <BubbleMenu v-if="editor" :editor="editor" />
      
      <!-- Editor Content -->
      <!-- <EditorContent :editor="editor" class="editor-content" /> -->

      
      <!-- Slash Menu (輸入 / 時顯示) -->
      <SlashMenu
        v-if="editor"
        :editor="editor"
        :is-visible="showSlashMenu"
        :menu-position="slashMenuPosition"
        @close="showSlashMenu = false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import SlashMenu from './SlashMenu.vue'
import BubbleMenu from './BubbleMenu.vue'
import FixedToolbar from './FixedToolbar.vue'
// 導入自訂節點
import { 
  CenterNode, RowNode, ThirdNode, HalfNode,
  HighlightNode, BoxNode, CardNode, TabsNode 
} from './nodes'
// 導入可拖曳圖片擴展
import { DraggableImage } from './extensions'
// 導入 Markdown 導出工具
import { exportToMarkdown, downloadMarkdown } from './utils/markdownExporter'

// 定義 props
const props = defineProps<{
  initialContent?: string
}>()

// 定義 emits
const emit = defineEmits<{
  update: [html: string],
  showExportPreview: [markdownContent: string] // New emit for showing export preview
}>()

const showSlashMenu = ref(false)
const slashMenuPosition = ref({ top: 0, left: 0 })
const showTooltip = ref(false)
let tooltipTimer: number | null = null

// INFO 提示文字數組
const infoTips = [
  '💡 輸入 / 開啟插入選單 | 選取文字顯示格式選單',
  '🎨 支援多種容器樣式：分欄、卡片、高亮區塊等',
  '📝 拖曳圖片可調整大小和位置',
  '🔗 自動偵測連結並轉換為可點擊格式',
  '✅ 支援待辦事項清單功能',
  '🎯 使用 Tab 鍵快速縮排和格式化',
  '💾 內容會自動儲存到瀏覽器中',
  '📤 可匯出為 Markdown 檔案',
  '🎪 支援 YouTube 影片嵌入',
  '⚡ 即時預覽功能同步顯示結果'
]

// 當前顯示的提示文字
const currentTip = ref('')

const editor = ref(null)
/*
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
      // StarterKit already includes Strike, but we explicitly add it below
      // to ensure it's properly configured and recognized.
      strike: false, // Disable strike from StarterKit to avoid conflicts
    }),
    DraggableImage.configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: {
        class: 'editor-image',
      },
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Youtube.configure({
      width: 640,
      height: 480,
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Placeholder.configure({
      placeholder: '開始輸入內容... 或輸入 / 開啟選單',
    }),
    CharacterCount,
    Highlight.configure({
      multicolor: false,
    }),
    Strike.configure({
      // Configure Strike to render as <del> for consistency with markdown-it
      HTMLAttributes: {
        tag: 'del',
      },
      // parseHTML is not a configurable option here; Strike extension already handles <del> by default.
      // Removed to fix TypeScript error.
    }),
    // Link extension 已由 StarterKit 內建，無需重複註冊
    // 自訂版面節點 (注意順序: Row 必須在 Half/Third 之前)
    RowNode,
    CenterNode,
    HalfNode,
    ThirdNode,
    // 特殊容器節點
    HighlightNode,
    BoxNode,
    CardNode,
    TabsNode,
  ],
  content: props.initialContent || `
    <h1>歡迎使用 VitePress 編輯器</h1>
    <p>這是一個類似 Notion 的所見即所得編輯器。</p>
    <h2>功能特色</h2>
    <ul>
      <li>輸入 <code>/</code> 開啟插入選單</li>
      <li>選取文字顯示格式工具列</li>
      <li>支援主題自訂容器 (分欄、特殊樣式)</li>
      <li>拖曳調整圖片大小和對齊</li>
      <li>導出為 Markdown 檔案</li>
    </ul>
    <h2>待辦事項範例</h2>
    <ul data-type="taskList">
      <li data-type="taskItem" data-checked="false">建立專案結構</li>
      <li data-type="taskItem" data-checked="true">整合 TipTap 編輯器</li>
      <li data-type="taskItem" data-checked="false">實作自訂節點</li>
    </ul>
  `,
  onUpdate: ({ editor }) => {
    // 發送更新事件
    emit('update', editor.getHTML())
  },
  editorProps: {
    attributes: {
      class: 'vp-editor-prose',
    },
    handleKeyDown: (view, event) => {
      // 監聽 / 鍵觸發選單
      if (event.key === '/') {
        const { state } = view
        const { selection } = state
        const { $from } = selection
        
        // 檢查游標前面的字元 (如果是行首或前面是空格,才觸發)
        const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)
        const shouldTrigger = textBefore.length === 0 || textBefore.endsWith(' ')
        
        if (shouldTrigger && !showSlashMenu.value) {
          // 獲取游標位置 (使用 DOM 座標)
          const coords = view.coordsAtPos($from.pos)
          
          // 計算選單位置,考慮邊界問題
          const menuWidth = 400 // 選單寬度
          const menuHeight = 400 // 選單最大高度
          const viewportWidth = window.innerWidth
          const viewportHeight = window.innerHeight
          
          let left = coords.left
          let top = coords.bottom + 5 // 在游標下方 5px
          
          // 右邊界檢查
          if (left + menuWidth > viewportWidth) {
            left = viewportWidth - menuWidth - 20
          }
          
          // 下邊界檢查
          if (top + menuHeight > viewportHeight + window.scrollY) {
            top = coords.top - menuHeight - 5 // 改為顯示在上方
          }
          
          slashMenuPosition.value = {
            top: top,
            left: Math.max(20, left) // 至少距離左邊 20px
          }
          
          showSlashMenu.value = true
          
          // 阻止 / 字元輸入
          event.preventDefault()
          
          return true
        }
      }
      
      return false
    }
  },
})
*/

const exportMarkdown = () => {
  /*
  if (!editor.value) return
  
  try {
    // 獲取編輯器 HTML
    const html = editor.value.getHTML()
    
    // 轉換為 Markdown
    const markdown = exportToMarkdown(html)
    
    // 生成檔案名稱 (使用當前時間)
    const now = new Date()
    const timestamp = now.toISOString().slice(0, 19).replace(/[:.]/g, '-')
    // 觸發父組件顯示預覽彈窗
    emit('showExportPreview', markdown)
  } catch (error) {
    console.error('❌ Markdown 導出失敗:', error)
    alert('Markdown 導出失敗,請查看控制台了解詳情')
  }
  */
}

const clearContent = () => {
  /*
  if (!editor.value) return
  
  if (confirm('確定要清空所有內容嗎?')) {
    editor.value.commands.clearContent()
  }
  */
}

// FixedToolbar 事件處理器
const handleInsertImage = () => {
  /*
  if (!editor.value) return
  const url = prompt('請輸入圖片 URL:')
  if (url) {
    try {
      editor.value.chain().focus().setImage({ src: url }).run()
    } catch (e) {
      console.error('插入圖片失敗:', e)
      alert('插入圖片失敗，請查看控制台')
    }
  }
  */
}

const handleInsertYoutube = () => {
  /*
  if (!editor.value) return
  const url = prompt('請輸入 YouTube 影片 URL 或 ID:')
  if (url) {
    try {
      // 使用與 SlashMenu 相同的命令名稱
      ;(editor.value as any).chain().focus().setYoutubeVideo({ src: url }).run()
    } catch (e) {
      console.error('插入 YouTube 影片失敗:', e)
      alert('插入 YouTube 影片失敗，請查看控制台')
    }
  }
  */
}

const handleInsertTable = () => {
  /*
  if (!editor.value) return
  const rowsStr = prompt('請輸入表格列數 (rows):', '2')
  const colsStr = prompt('請輸入表格欄數 (cols):', '2')
  
  const rows = parseInt(rowsStr || '2')
  const cols = parseInt(colsStr || '2')
  if (rows > 0 && cols > 0) {
    try {
      ;(editor.value as any).chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
    } catch (e) {
      console.error('插入表格失敗:', e)
      alert('插入表格失敗，請查看控制台')
    }
  }
  */
}

const handleInsertTabs = () => {
  /*
  if (!editor.value) return
  const countStr = prompt('請輸入標籤頁數量 (2-8):', '2')
  const count = parseInt(countStr || '2')
  if (count >= 2 && count <= 8) {
    try {
      ;(editor.value as any).chain().focus().setTabs('default', count).run()
    } catch (e) {
      console.error('插入 Tabs 失敗:', e)
      alert('插入 Tabs 失敗，請查看控制台')
    }
  } else {
    alert('標籤頁數量必須在 2-8 之間')
  }
  */
}

// Tooltip 處理函數
const handleTooltipEnter = () => {
  if (tooltipTimer) {
    clearTimeout(tooltipTimer)
  }
  tooltipTimer = window.setTimeout(() => {
    // 隨機選擇一個提示文字
    const randomIndex = Math.floor(Math.random() * infoTips.length)
    currentTip.value = infoTips[randomIndex]
    showTooltip.value = true
  }, 300) // 0.3 秒延遲
}

const handleTooltipLeave = () => {
  if (tooltipTimer) {
    clearTimeout(tooltipTimer)
    tooltipTimer = null
  }
  showTooltip.value = false
}

// 初始化隨機提示文字
const initializeRandomTip = () => {
  const randomIndex = Math.floor(Math.random() * infoTips.length)
  currentTip.value = infoTips[randomIndex]
}

// 暴露方法給父組件
defineExpose({
  getHTML: () => '', // editor.value?.getHTML() || '',
  setContent: (content: string) => {
    /*
    if (editor.value) {
      editor.value.commands.setContent(content)
    }
    */
  },
  commands: null // editor.value?.commands
})

onBeforeUnmount(() => {
  // editor.value?.destroy()
  if (tooltipTimer) {
    clearTimeout(tooltipTimer)
  }
})
</script>

<style scoped>

.vp-editor-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 60px;
  padding: 0 1rem;
  background: var(--vp-c-bg-soft);
  border-bottom: none;
  flex-shrink: 0;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.toolbar-btn:hover {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.export-btn i {
  color: var(--vp-c-green-1);
}

.clear-btn i {
  color: var(--vp-c-danger-1);
}

.toolbar-info {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  position: relative;
}

.info-btn {
  background: none;
  border: none;
  color: var(--vp-c-text-3);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info-btn:hover {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-brand-1);
}

.info-tooltip {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 0.8rem;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  z-index: 1000;
  animation: tooltipFadeIn 0.2s ease-out;
}

.info-tooltip::before {
  content: '';
  position: absolute;
  top: -6px;
  right: 1rem;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid var(--vp-c-bg);
}

.info-tooltip::after {
  content: '';
  position: absolute;
  top: -7px;
  right: 1rem;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 7px solid var(--vp-c-divider);
  z-index: -1;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.editor-container {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 0 0 8px 8px;
  min-height: 600px;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  flex: 1;
}

@media (max-width: 768px) {
  .editor-toolbar {
    flex-wrap: wrap;
    height: auto;
    padding: 0.75rem;
  }
  .toolbar-btn {
    padding: 0.6rem 0.9rem;
  }
  .toolbar-info {
    width: 100%;
    margin-left: 0;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }
}
</style>

<style>
/* TipTap 編輯器全域樣式 */

/* BubbleMenu and SlashMenu Mobile Optimizations */
@media (max-width: 768px) {
  .tiptap-bubble-menu {
    transform: scale(1.1);
    transform-origin: bottom;
  }
  .tiptap-bubble-menu button {
    padding: 0.6rem !important;
  }
  .slash-menu {
    max-height: 250px;
    overflow-y: auto;
  }
}

.vp-editor-prose {
  padding: 2rem;
  min-height: 600px;
  outline: none;
}

.vp-editor-prose .ProseMirror-focused {
  outline: none;
}

/* Placeholder 樣式 */
.vp-editor-prose .is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--vp-c-text-3);
  pointer-events: none;
  height: 0;
}

/* 標題樣式 */
.vp-editor-prose h1 {
  font-size: 2rem;
  font-weight: 600;
  margin: 1.5rem 0 1rem;
  color: var(--vp-c-text-1);
  border-bottom: 1px solid var(--vp-c-divider);
  padding-bottom: 0.5rem;
}

.vp-editor-prose h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 1.5rem 0 1rem;
  color: var(--vp-c-text-1);
}

.vp-editor-prose h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1.25rem 0 0.75rem;
  color: var(--vp-c-text-1);
}

/* 段落樣式 */
.vp-editor-prose p {
  margin: 0.75rem 0;
  line-height: 1.7;
  color: var(--vp-c-text-1);
}

/* 列表樣式 */
.vp-editor-prose ul,
.vp-editor-prose ol {
  padding-left: 1.5rem;
  margin: 0.75rem 0;
}

.vp-editor-prose li {
  margin: 0.25rem 0;
  line-height: 1.7;
}

/* 待辦事項樣式 */
.vp-editor-prose ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0;
}

.vp-editor-prose ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.vp-editor-prose ul[data-type="taskList"] li > label {
  display: flex;
  align-items: center;
  user-select: none;
}

.vp-editor-prose ul[data-type="taskList"] li > label input[type="checkbox"] {
  margin-right: 0.5rem;
  width: 1.1rem;
  height: 1.1rem;
  cursor: pointer;
}

.vp-editor-prose ul[data-type="taskList"] li > div {
  flex: 1;
}

/* 程式碼區塊樣式 */
.vp-editor-prose pre {
  background: var(--vp-c-bg-soft);
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1rem 0;
}

.vp-editor-prose code {
  background: var(--vp-c-bg-soft);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.vp-editor-prose pre code {
  background: none;
  padding: 0;
}

/* 引用區塊樣式 */
.vp-editor-prose blockquote {
  border-left: 4px solid var(--vp-c-brand-1);
  padding-left: 1rem;
  margin: 1rem 0;
  color: var(--vp-c-text-2);
  font-style: italic;
}

/* 圖片樣式 */
.vp-editor-prose img.editor-image {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 1rem 0;
  display: block;
}

/* 水平分隔線 */
.vp-editor-prose hr {
  border: none;
  border-top: 1px solid var(--vp-c-divider);
  margin: 2rem 0;
}

/* YouTube 嵌入樣式 */
.vp-editor-prose div[data-youtube-video] {
  position: relative;
  padding-bottom: 56.25%;
  height: 0;
  overflow: hidden;
  margin: 1rem 0;
  border-radius: 8px;
}

.vp-editor-prose div[data-youtube-video] iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 8px;
}

/* 螢光標記樣式 */
.vp-editor-prose mark {
  background-color: rgba(255, 208, 0, 0.4);
  padding: 0.1em 0.3em;
  border-radius: 3px;
}

/* 刪除線樣式 */
.vp-editor-prose s,
.vp-editor-prose del { /* Add del tag for consistency with markdown-it output */
  text-decoration: line-through;
}

/* 連結樣式 */
.vp-editor-prose a {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  transition: color 0.2s;
}

.vp-editor-prose a:hover {
  color: var(--vp-c-brand-2);
}
</style>
