<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed, defineAsyncComponent, Suspense, nextTick } from 'vue'
import { exportToMarkdown } from './utils/markdownExporter'
import DocumentHistory from './DocumentHistory.vue'
import MarkdownPreview from './MarkdownPreview.vue'
import MarkdownIt from 'markdown-it'
import fm from 'front-matter'
import markdownItFrontMatter from 'markdown-it-front-matter'

// 常數與 interface
const historyUpdateKey = ref(0) // 用來強制刷新歷史列表
const isEditorActive = ref(true) // 用來強制重置編輯器
const CURRENT_DOC_KEY = 'vitepress-editor-current'
const HISTORY_KEY = 'vitepress-editor-history'
const INITIALIZED_KEY = 'vitepress-editor-initialized'
const TEMPLATE_VERSION_KEY = 'vitepress-editor-template-version'
const TEMPLATE_VERSION = '2026-08-26-load-example'
interface HistoryItem {
  id: string
  title: string
  content: string
  markdown?: string
  updatedAt: number
}

// 初始化時加入插件，回呼函式可以留空，它的作用就是把 Front Matter 從渲染結果中移出
const md = new MarkdownIt({ html: true, breaks: true, linkify: true })
    .use(markdownItFrontMatter, (fm: string) => { // Added type annotation
        // fm 是解析出來的內容，這裡我們單純只是為了讓它從 HTML 中消失
        // 所以不做任何事
    })
    .enable('strikethrough') // Explicitly enable strikethrough for this markdown-it instance
// Front Matter 相關
const documentTitle = ref('')
const documentDescription = ref('')
const documentImage = ref('')
const documentTag = ref<string[]>([])
const documentCategory = ref<string[]>([])
const documentBlog = ref(true)
const documentTagString = ref('')
const documentCategoryString = ref('')

// 主要內容
const currentDocId = ref<string>('')
const editorRef = ref<any>(null)
const markdownTextareaRef = ref<HTMLTextAreaElement | null>(null)
const markdownSelection = ref({ start: 0, end: 0 })
const editorContent = ref('')
const markdownContent = ref('')
const showPreview = ref(true)
const showHistory = ref(true)
const editMode = ref<'visual' | 'markdown'>('markdown') // Default to markdown as Tiptap is removed
const markdownSource = ref('')
const showEmojiPicker = ref(false)
const historyWidth = ref(280)
const editorWidth = ref(50)
let autoSaveTimer: number | null = null
const historyRef = ref<any>(null)
const isResizing = ref(false)
const isResizingHistory = ref(false)
const showFrontMatter = ref(true) // New: Controls visibility of front matter inputs
const showExportConfirmation = ref(false) // New: Controls visibility of export confirmation modal
const exportMarkdownContent = ref('') // New: Content to display in the export confirmation modal

// Helper to generate full markdown with front matter (used for saving/exporting)
const generateFullMarkdownString = (bodyContent: string) => {
  const contentLines: string[] = [];
  if (documentTitle.value) {
    contentLines.push(`title: ${documentTitle.value}`);
  }
  if (documentDescription.value) {
    contentLines.push(`description: ${documentDescription.value}`);
  }
  if (documentImage.value) {
    contentLines.push(`image: ${documentImage.value}`);
  }
  if (documentTag.value.length) {
    contentLines.push(`tag:\n  - ${documentTag.value.join('\n  - ')}`);
  }
  if (documentCategory.value.length) {
    contentLines.push(`category:\n  - ${documentCategory.value.join('\n  - ')}`);
  }
  // Always include blog field to explicitly set its value
  contentLines.push(`blog: ${documentBlog.value}`);

  let frontMatterBlock = '';
  if (contentLines.length > 0) { // Only add --- if there's actual front matter content
    frontMatterBlock = '---' + '\n' + contentLines.join('\n') + '\n' + '---';
  }
  
  return `${frontMatterBlock}\n\n${bodyContent}`.trim();
};

// Helper to extract body content for preview, removing front matter
const getBodyContentForPreview = (source: string) => {
  try {
    const parsed = fm(source);
    return parsed.body || '';
  } catch (error) {
    console.warn('解析 Front Matter 失敗，顯示原始內容:', error);
    return source; // Fallback to raw source if parsing fails
  }
};

const previewBodyMarkdown = computed(() => { // Renamed for clarity
  if (editMode.value === 'visual') {
    return getBodyContentForPreview(markdownContent.value);
  } else {
    return getBodyContentForPreview(markdownSource.value);
  }
});

// Helper to generate styled HTML for the header (title, category, tags)

// markdown-it 初始化

const VPEditor = defineAsyncComponent(() => import('./VPEditor.vue'))

// 預設範例內容
const DEFAULT_EXAMPLE_MARKDOWN = `---
title: 預設範例檔案
description: 這是 Markdown 源碼範例
image: https://thinktandem.io/images/articles/kalabox1.png
tag:
  - Markdown
  - 教學
category:
  - 範例
blog: true
---

::: half
![Is it possible to learn this power?](https://media1.giphy.com/media/bjtM9GdxbqL5e/giphy.gif)
:::

:::::: center
:::: third
::: box
WAIT.
:::
::::
:::: third
::: box
FOR.
:::
::::
:::: third
::: box
FOR.
:::
::::
:::: third
::: box
FOR.
:::
::::
:::: third
::: box
FOR.
:::
::::
:::: third
::: box
FOR.
:::
::::
::::::


:::: center
::: third
![What a show!](https://c.tenor.com/88jV4RXj3x4AAAAC/not-from-a-jedi-palpatine.gif)
:::
::: third
![What a show!](https://c.tenor.com/88jV4RXj3x4AAAAC/not-from-a-jedi-palpatine.gif)
:::
::: third
![What a show!](https://c.tenor.com/88jV4RXj3x4AAAAC/not-from-a-jedi-palpatine.gif)
:::
::::
::: highlight
What if I told you that the Republic was now under the control of a Dark Lord of the Sith?
:::

:::tabs
== tab a
a content
== tab b
b content
:::

:::tabs box
== tab a
a content
== tab b
b content
== tab c
c content
:::

:::tabs box-blue
== tab a
a content
== tab b
b content

:::

:::tabs box-brand
== tab a
a content
== tab b
b content
:::

:::tabs box-green
== tab a
a content
== tab b
b content
== tab c
c content
:::

:::tabs box-red
== tab a
a content
== tab b
b content
:::

:::tabs box-yellow
== tab a
a content
== tab b
b content
:::

:::: thumbnail
![kalabox1-dash](https://thinktandem.io/images/articles/kalabox1.png "Kalabox V1 Dashboard")
::: caption
Kalabox Version 1 Dashboard
:::
::::
::::third
:::card Cat 1
![Cat 1](https://media0.giphy.com/media/SUWn1xWsXKDbz6Y1Dx/giphy.gif)
:::
::::

::::third
:::card Cat 2
![Cat 2](https://media0.giphy.com/media/rxYG6rKr0iQla/200.gif)
:::
::::

::::third
:::card Cat 3
![Cat 3](https://media2.giphy.com/media/YRVP7mapl24G6RNkwJ/200.gif)
:::
::::

\`\`\`
- [ ] todo
- [x] finished
\`\`\`

- [ ] todo
- [x] finished

<YouTube id="Qs68Fugalro"/>`

// 生成新文檔 ID
const generateDocId = () => `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

const createExampleDoc = (): HistoryItem => {
  const parsed = fm(DEFAULT_EXAMPLE_MARKDOWN)
  const attrs: Record<string, any> = parsed.attributes || {}

  return {
    id: 'doc_example_default',
    title: 'title' in attrs ? String(attrs.title) : '預設範例檔案',
    content: parsed.body || '',
    markdown: DEFAULT_EXAMPLE_MARKDOWN,
    updatedAt: Date.now()
  }
}

// 確保歷史紀錄中永遠保留一份範例，且不重複新增。
const ensureExampleInHistory = () => {
  const exampleDoc = createExampleDoc()
  let history: HistoryItem[] = []
  const stored = localStorage.getItem(HISTORY_KEY)

  if (stored) history = JSON.parse(stored)

  const existingExample = history.find(item =>
    item.id === exampleDoc.id ||
    item.title === exampleDoc.title ||
    item.markdown === DEFAULT_EXAMPLE_MARKDOWN
  )

  if (existingExample) return existingExample

  history.unshift(exampleDoc)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  historyUpdateKey.value++
  return exampleDoc
}

const applyDocumentState = (doc: HistoryItem) => {
  currentDocId.value = doc.id
  const fullContent = doc.markdown || doc.content || ''
  const parsed = fm(fullContent)
  const attrs: Record<string, any> = parsed.attributes || {}
  const bodyContent = parsed.body !== undefined ? parsed.body : fullContent

  documentTitle.value = 'title' in attrs && typeof attrs.title === 'string' ? attrs.title : (doc.title || '')
  documentDescription.value = 'description' in attrs && typeof attrs.description === 'string' ? attrs.description : ''
  documentImage.value = 'image' in attrs && typeof attrs.image === 'string' ? attrs.image : ''
  documentTag.value = 'tag' in attrs && Array.isArray(attrs.tag) ? attrs.tag.map(String) : ('tag' in attrs && typeof attrs.tag === 'string' ? [attrs.tag] : [])
  documentCategory.value = 'category' in attrs && Array.isArray(attrs.category) ? attrs.category.map(String) : ('category' in attrs && typeof attrs.category === 'string' ? [attrs.category] : [])
  documentBlog.value = 'blog' in attrs && typeof attrs.blog === 'boolean' ? attrs.blog : true
  documentTagString.value = documentTag.value.join('\n')
  documentCategoryString.value = documentCategory.value.join('\n')
  editorContent.value = doc.content || ''
  markdownContent.value = bodyContent
  markdownSource.value = bodyContent
}

const hasMeaningfulContent = (doc: HistoryItem) => {
  try {
    const parsed = fm(doc.markdown || '')
    const attrs: Record<string, any> = parsed.attributes || {}
    const hasFrontMatter = ['title', 'description', 'image', 'tag', 'category']
      .some(key => {
        const value = attrs[key]
        return Array.isArray(value) ? value.length > 0 : String(value || '').trim().length > 0
      })

    return Boolean(
      String(doc.title || '').trim() ||
      String(doc.content || '').trim() ||
      String(parsed.body || '').trim() ||
      hasFrontMatter
    )
  } catch {
    // 無法解析的內容仍可能是使用者草稿，絕不覆蓋。
    return true
  }
}

const loadExampleAsCurrent = (exampleDoc: HistoryItem) => {
  applyDocumentState({
    ...exampleDoc,
    id: generateDocId(),
    updatedAt: Date.now()
  })
  saveCurrentDoc()
}

// 載入當前文檔，解析 Front Matter
const loadCurrentDoc = () => {
  try {
    const isInitialized = localStorage.getItem(INITIALIZED_KEY)
    const templateVersion = localStorage.getItem(TEMPLATE_VERSION_KEY)
    const stored = localStorage.getItem('vitepress-editor-current')
    const exampleDoc = ensureExampleInHistory()

    if (!isInitialized) {
      loadExampleAsCurrent(exampleDoc)
      localStorage.setItem(INITIALIZED_KEY, 'true')
    } else if (stored) {
      const doc = JSON.parse(stored)
      if (templateVersion !== TEMPLATE_VERSION && !hasMeaningfulContent(doc)) {
        loadExampleAsCurrent(exampleDoc)
      } else {
        applyDocumentState(doc)
      }
    } else {
      loadExampleAsCurrent(exampleDoc)
    }

    localStorage.setItem(TEMPLATE_VERSION_KEY, TEMPLATE_VERSION)
  } catch (error) {
    console.error('載入文檔失敗:', error)
    createNewDoc()
  }
}

// 創建新文檔
const createNewDoc = () => {
  currentDocId.value = generateDocId()
  documentTitle.value = ''
  documentDescription.value = ''
  documentImage.value = ''
  documentTag.value = []
  documentCategory.value = []
  documentBlog.value = true
  documentTagString.value = ''
  documentCategoryString.value = ''
  editorContent.value = ''
  markdownContent.value = '' // Body is empty
  markdownSource.value = ''
  saveCurrentDoc()
}

// 保存當前文檔（合併 Front Matter）
const saveCurrentDoc = () => {
  try {
    // 如果是在 Markdown 模式下，markdownSource 已經包含了使用者編輯的完整內容（含 Front Matter）
    // 我們應該直接使用它，而不是重新生成，除非我們想要強制格式化 Front Matter
    // 但為了保持一致性，我們還是使用 generateFullMarkdownString 重新生成，確保 Front Matter 格式正確
    // 關鍵是 markdownContent.value 必須只包含 body
    
    const markdown = generateFullMarkdownString(markdownContent.value);
    
    // 如果我們在 Markdown 模式，且 markdownSource 與生成的 markdown 不同步（例如 Front Matter 被標準化了）
    // 我們可能需要更新 markdownSource，但這會導致游標跳動，所以暫時不更新 markdownSource
    // 除非是在非編輯狀態下
    
    const doc = {
      id: currentDocId.value,
      title: documentTitle.value, 
      content: editorContent.value,
      markdown, // 儲存完整的 Markdown
      updatedAt: Date.now()
    }
    localStorage.setItem(CURRENT_DOC_KEY, JSON.stringify(doc))
  } catch (error) {
    console.error('保存文檔失敗:', error)
  }
}

// 導出 Markdown 文件（包含 Front Matter）

// Tag/Category textarea 處理
watch(documentTag, (val) => {
  documentTagString.value = val.join(', ') // 使用逗號和空格重新組合
})
watch(documentTitle, (val) => {
  console.log('documentTitle changed:', val);
});
watch(documentCategory, (val) => {
  documentCategoryString.value = val.join(', ') // 使用逗號和空格重新組合
})
const updateTag = () => {
  documentTag.value = documentTagString.value.split(/,|\r?\n/).filter(Boolean).map(s => s.trim()) // 支援逗號和換行符，並移除空白
}
const updateCategory = () => {
  documentCategory.value = documentCategoryString.value.split(/,|\r?\n/).filter(Boolean).map(s => s.trim()) // 支援逗號和換行符，並移除空白
}

// 其他 UI/功能函式（如 handleEditorUpdate, scheduleAutoSave, ...）請依原本檔案保留
// 補齊 template 綁定的函式與 computed 變數
const scheduleAutoSave = () => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = window.setTimeout(() => {
    saveCurrentDoc()
    // 這裡可加 saveToHistory()
  }, 2000)
}

const handleManualSave = () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
  saveCurrentDoc();
  saveToHistory();
  historyUpdateKey.value++; // Force refresh of history list
  alert('已手動儲存文件！'); // Provide feedback to the user
};

const handleEditorUpdate = (html: string) => {
  editorContent.value = html
  try {
    markdownContent.value = exportToMarkdown(html)
    markdownSource.value = markdownContent.value
  } catch (error) {
    console.error('轉換 Markdown 失敗:', error)
  }
  scheduleAutoSave()
}

// 保存到歷史記錄
const saveToHistory = () => {
  try {
    let history: HistoryItem[] = []
    const stored = localStorage.getItem(HISTORY_KEY)
    if (stored) {
      history = JSON.parse(stored)
    }
    const doc: HistoryItem = {
      id: currentDocId.value,
      title: documentTitle.value,
      content: markdownContent.value,
      markdown: markdownSource.value,
      updatedAt: Date.now()
    }
    const existingIndex = history.findIndex(item => item.id === currentDocId.value)
    if (existingIndex !== -1) {
      history[existingIndex] = doc
    } else {
      history.unshift(doc)
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch (error) {
    console.error('保存歷史失敗:', error)
  }
}

// 已移除重複宣告，僅保留唯一一份

// 載入歷史記錄項目
const handleLoadHistory = (item: HistoryItem) => {
  currentDocId.value = item.id
  
  // 優先使用 item.markdown (完整內容)，如果沒有則使用 item.content
  const fullContent = item.markdown || item.content || ''
  
  try {
    const parsed = fm(fullContent)
    const attrs: Record<string, any> = parsed.attributes || {}
    
    // 更新 Front Matter 相關變數
    documentTitle.value = 'title' in attrs ? String(attrs.title) : (item.title || '')
    documentDescription.value = 'description' in attrs ? String(attrs.description) : ''
    documentImage.value = 'image' in attrs ? String(attrs.image) : ''
    documentTag.value = 'tag' in attrs && Array.isArray(attrs.tag) ? attrs.tag.map(String) : ('tag' in attrs && typeof attrs.tag === 'string' ? [attrs.tag] : [])
    documentCategory.value = 'category' in attrs && Array.isArray(attrs.category) ? attrs.category.map(String) : ('category' in attrs && typeof attrs.category === 'string' ? [attrs.category] : [])
    documentBlog.value = 'blog' in attrs && typeof attrs.blog === 'boolean' ? attrs.blog : true
    
    documentTagString.value = documentTag.value.join('\n')
    documentCategoryString.value = documentCategory.value.join('\n')
    
    // 更新編輯器內容
    // 如果有解析出 body，使用 body；否則使用原始內容
    const bodyContent = parsed.body !== undefined ? parsed.body : fullContent
    markdownContent.value = bodyContent
    markdownSource.value = bodyContent
    
    // 如果在視覺模式 (雖然現在預設是 markdown 模式)，需要將 Markdown 轉回 HTML
    if (editMode.value === 'visual' && editorRef.value) {
      const htmlContent = md.render(bodyContent)
      editorRef.value.setContent(htmlContent)
    }
  } catch (e) {
    console.error('解析歷史紀錄失敗:', e)
    // Fallback
    documentTitle.value = item.title
    markdownContent.value = item.content
    markdownSource.value = item.content
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

const toggleMoreActions = () => {
  showFrontMatter.value = !showFrontMatter.value
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

const rememberMarkdownSelection = () => {
  const textarea = markdownTextareaRef.value
  if (!textarea) return

  markdownSelection.value = {
    start: textarea.selectionStart,
    end: textarea.selectionEnd
  }
}

// 更新 Markdown 源碼
const updateMarkdownSource = () => {
  markdownContent.value = markdownSource.value
  rememberMarkdownSelection()
  scheduleAutoSave()
}

type MarkdownInsertAction = 'image' | 'table' | 'center' | 'columns' | 'highlight' | 'code'

const markdownInsertActions: Array<{
  id: MarkdownInsertAction
  label: string
  icon: string
  title: string
}> = [
  { id: 'image', label: '圖片', icon: 'fas fa-image', title: '插入 Blog 使用的置中圖片與說明' },
  { id: 'table', label: '圖片表格', icon: 'fas fa-table', title: '插入 Blog 使用的雙欄圖片表格' },
  { id: 'center', label: '置中', icon: 'fas fa-align-center', title: '使用 Blog 既有的 HTML 寫法置中內容' },
  { id: 'columns', label: '雙欄', icon: 'fas fa-columns', title: '使用 ::: half 建立雙欄' },
  { id: 'highlight', label: '提示', icon: 'fas fa-highlighter', title: '使用 ::: highlight 插入提示區塊' },
  { id: 'code', label: '程式碼', icon: 'fas fa-code', title: '插入 fenced code block' }
]

const commonEmojis = [
  '😀', '😂', '🥰', '😎', '🤔', '😭',
  '🎉', '✨', '🔥', '✅', '❌', '⚠️',
  '💡', '🚀', '🐻', '💻', '📌', '❤️'
]

const insertMarkdownSnippet = async (action: MarkdownInsertAction) => {
  const textarea = markdownTextareaRef.value
  if (!textarea) return

  const { start, end } = markdownSelection.value
  const selectedText = markdownSource.value.slice(start, end)
  let snippet = ''
  let focusText = ''

  switch (action) {
    case 'image':
      focusText = '/image/YYYY-MM-DD/圖片.jpg'
      snippet = `<div style="text-align:center;">\n  <img src="${focusText}" alt="圖片說明" style="display:block; margin:0 auto; max-width:100%; height:auto;">\n  <small style="display: block; text-align: center; color: #777;">${selectedText || '圖片說明'}</small>\n</div>`
      break
    case 'table':
      focusText = '/image/YYYY-MM-DD/圖片1.jpg'
      snippet = `<table style="width:100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #2D2D2D !important;">\n  <tbody>\n  <tr>\n    <td style="width:50%; text-align:center; padding: 5px;">\n      <img src="${focusText}" alt="圖片1" style="max-width:100%; height:auto; display:block; margin:0 auto;">\n    </td>\n    <td style="width:50%; text-align:center; padding: 5px;">\n      <img src="/image/YYYY-MM-DD/圖片2.jpg" alt="圖片2" style="max-width:100%; height:auto; display:block; margin:0 auto;">\n    </td>\n  </tr>\n  <tr>\n    <td colspan="2" style="text-align:center; padding-top: 10px; border: 1px solid #2D2D2D !important;">\n      <small style="display: block; color: #777; font-size: 0.95em;">${selectedText || '圖片說明'}</small>\n    </td>\n  </tr>\n  </tbody>\n</table>`
      break
    case 'center':
      focusText = selectedText || '置中內容'
      snippet = `<div style="text-align:center;">\n${focusText}\n</div>`
      break
    case 'columns':
      focusText = selectedText || '左欄內容'
      snippet = `::: half\n${focusText}\n:::\n\n::: half\n右欄內容\n:::`
      break
    case 'highlight':
      focusText = selectedText || '提示內容'
      snippet = `::: highlight\n${focusText}\n:::`
      break
    case 'code':
      focusText = selectedText || '程式碼內容'
      snippet = `\`\`\`text\n${focusText}\n\`\`\``
      break
  }

  const before = markdownSource.value.slice(0, start)
  const after = markdownSource.value.slice(end)
  const leadingBreak = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : ''
  const trailingBreak = after && !after.startsWith('\n\n') ? (after.startsWith('\n') ? '\n' : '\n\n') : ''
  const insertion = `${leadingBreak}${snippet}${trailingBreak}`

  markdownSource.value = `${before}${insertion}${after}`
  markdownContent.value = markdownSource.value
  scheduleAutoSave()

  await nextTick()
  textarea.focus()
  const focusOffset = insertion.indexOf(focusText)
  const selectionStart = start + Math.max(0, focusOffset)
  textarea.setSelectionRange(selectionStart, selectionStart + focusText.length)
  rememberMarkdownSelection()
}

const insertEmoji = async (emoji: string) => {
  const textarea = markdownTextareaRef.value
  if (!textarea) return

  const { start, end } = markdownSelection.value
  markdownSource.value = `${markdownSource.value.slice(0, start)}${emoji}${markdownSource.value.slice(end)}`
  markdownContent.value = markdownSource.value
  showEmojiPicker.value = false
  scheduleAutoSave()

  await nextTick()
  textarea.focus()
  const nextPosition = start + emoji.length
  textarea.setSelectionRange(nextPosition, nextPosition)
  rememberMarkdownSelection()
}

// 導出 Markdown 文件（包含 Front Matter）
const exportDocument = () => {
  exportMarkdownContent.value = generateFullMarkdownString(markdownContent.value);
  showExportConfirmation.value = true; // Show the confirmation modal
};

const confirmExport = () => {
  const markdown = exportMarkdownContent.value;
  const blob = new Blob([markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${documentTitle.value || '未命名文件'}.md`; // Fallback for download name
  a.click()
  URL.revokeObjectURL(url)
  showExportConfirmation.value = false; // Close the modal after download
};

const cancelExport = () => {
  showExportConfirmation.value = false; // Just close the modal
};

const handleShowExportPreview = (markdownContent: string) => {
  exportMarkdownContent.value = markdownContent;
  showExportConfirmation.value = true;
};

const copyExportContent = async () => {
  try {
    await navigator.clipboard.writeText(exportMarkdownContent.value);
    alert('Markdown 內容已複製到剪貼簿！');
  } catch (err) {
    console.error('複製失敗:', err);
    alert('複製失敗，請手動複製。');
  }
};

// 創建新文檔 (按鈕)
const handleNewDoc = async () => {
  // 1. 先把當前看到的內容存入歷史紀錄
  saveToHistory();

  // 2. 檢查是否有重複標題
  let history: HistoryItem[] = [];
  const storedHistory = localStorage.getItem(HISTORY_KEY);
  if (storedHistory) {
    history = JSON.parse(storedHistory);
  }

  const currentTitle = documentTitle.value.trim();
  const hasDuplicateTitle = currentTitle && history.some(item => item.title.trim() === currentTitle);

  if (hasDuplicateTitle) {
    const confirmMessage = `歷史紀錄中已存在標題為「${currentTitle}」的文件。您確定要創建一個新的同名文件嗎？(當前內容已保存為歷史紀錄中的一個新條目)`;
    if (!confirm(confirmMessage)) {
      // 使用者選擇取消，則不繼續創建新文檔
      return;
    }
  } else if (!confirm('確定要創建新文檔嗎？(當前內容已保存至歷史紀錄)')) {
    // 如果沒有重複標題，但使用者取消了新建操作
    return;
  }
  
  // 3. 🔴 關鍵：讓歷史列表組件強制刷新
  historyUpdateKey.value++; 

  // 4. 暫時殺死編輯器
  isEditorActive.value = false;
  
  // 5. 重置資料
  createNewDoc();
  
  // 6. 等待 Vue 處理完 DOM 更新
  await nextTick();
  
  // 7. 復活編輯器 (此時它會讀取到 <p></p>，顯示為空白)
  isEditorActive.value = true;
};

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
      // Tag/Category textarea 處理
      watch(documentTag, (val) => {
        documentTagString.value = val.join('\n')
      })
      watch(documentCategory, (val) => {
        documentCategoryString.value = val.join('\n')
      })

      const updateTag = () => {
        documentTag.value = documentTagString.value.split(/\r?\n/).filter(Boolean)
      }
      const updateCategory = () => {
        documentCategory.value = documentCategoryString.value.split(/\r?\n/).filter(Boolean)
      }
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
  // Debug: expose helper functions to window for easy console inspection
  ;(window as any).getEditorHTML = () => editorRef?.value?.getHTML?.() || null
  ;(window as any).exportedMD = () => {
    try {
      const html = editorRef?.value?.getHTML?.() || ''
      return exportToMarkdown(html)
    } catch (e) {
      return null
    }
  }
})

// 組件卸載
onBeforeUnmount(() => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
  // Ensure save actions are always performed on unmount
  saveCurrentDoc()
  saveToHistory()
})
</script>

<template>
  <div class="editor-with-preview">
    <!-- 頂部工具列 -->
    <div class="top-toolbar">
      <!-- 前置元數據控制區 -->
      <div class="front-matter-toggle-wrapper">
        <button @click="toggleMoreActions" class="toolbar-btn front-matter-toggle-btn">
          <i :class="showFrontMatter ? 'fas fa-angle-up' : 'fas fa-angle-down'"></i>
          <span class="btn-text">Front Matter</span>
        </button>
      </div>

      <div class="toolbar-spacer"></div>

      <!-- 主要功能按鈕 -->
      <div class="main-action-buttons">
        <!-- <button
          @click="toggleEditMode"
          class="toolbar-btn mode-toggle-btn"
          :class="{ active: editMode === 'markdown' }"
          title="切換編輯模式"
        >
          <i :class="editMode === 'visual' ? 'fas fa-code' : 'fas fa-eye'"></i>
          <span class="btn-text">{{ editMode === 'visual' ? '源碼' : '視覺' }}</span>
        </button> -->
        <button @click="toggleHistory" class="toolbar-btn" :class="{ active: showHistory }">
          <i class="fas fa-history"></i>
          <span class="btn-text">歷史</span>
        </button>
        <button @click="togglePreview" class="toolbar-btn" :class="{ active: showPreview }">
          <i class="fas fa-eye"></i>
          <span class="btn-text">預覽</span>
        </button>
        <button @click="exportDocument" class="toolbar-btn">
          <i class="fas fa-download"></i>
          <span class="btn-text">導出</span>
        </button>
        <button @click="handleNewDoc" class="toolbar-btn">
          <i class="fas fa-file-alt"></i>
          <span class="btn-text">新建</span>
        </button>
        <button @click="handleManualSave" class="toolbar-btn save-btn">
          <i class="fas fa-save"></i>
          <span class="btn-text">儲存</span>
        </button>
      </div>
    </div>

    <!-- 前置元數據輸入區 -->
    <div v-if="showFrontMatter" class="front-matter-inputs">
      <input
        v-model="documentCategoryString"
        type="text"
        class="doc-title-input"
        placeholder="分類 category (逗號分隔)"
        @blur="updateCategory"
      />
      <input
        v-model="documentTitle"
        type="text"
        class="doc-title-input"
        placeholder="標題 title..."
        @blur="scheduleAutoSave"
      />
      <input
        v-model="documentDescription"
        type="text"
        class="doc-title-input"
        placeholder="描述 description..."
        @blur="scheduleAutoSave"
      />
      <input
        v-model="documentImage"
        type="text"
        class="doc-title-input"
        placeholder="封面圖片 image..."
        @blur="scheduleAutoSave"
      />
      <input
        v-model="documentTagString"
        type="text"
        class="doc-title-input"
        placeholder="標籤 tag (逗號分隔)"
        @blur="updateTag"
      />
      <label class="blog-checkbox-label">Blog <input type="checkbox" v-model="documentBlog" /></label>
    </div>

    <!-- 主內容區 -->
    <div class="main-content" :class="{ 'history-open': showHistory }">
      <!-- 歷史記錄側邊欄 -->
      <div v-if="showHistory" class="history-sidebar" :style="{ width: historyWidth + 'px' }">
        <DocumentHistory
        :key="historyUpdateKey"
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
          <div v-if="editMode === 'visual'" class="visual-editor" @contextmenu.prevent="() => {}">
            <Suspense>
              <template #default>
                <VPEditor
                  v-if="isEditorActive"
                  :key="currentDocId"
                  ref="editorRef"
                  :initial-content="editorContent"
                  @update="handleEditorUpdate"
                  @showExportPreview="handleShowExportPreview"
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
             <div class="markdown-format-toolbar" role="toolbar" aria-label="Markdown 格式工具">
               <button
                 v-for="action in markdownInsertActions"
                 :key="action.id"
                 type="button"
                 class="markdown-format-btn"
                 :title="action.title"
                 @pointerdown.prevent
                 @click="insertMarkdownSnippet(action.id)"
               >
                 <i :class="action.icon" aria-hidden="true"></i>
                 <span>{{ action.label }}</span>
               </button>
               <button
                 type="button"
                 class="markdown-format-btn"
                 :class="{ active: showEmojiPicker }"
                 title="插入 Emoji 表情"
                 :aria-expanded="showEmojiPicker"
                 aria-controls="markdown-emoji-picker"
                 @pointerdown.prevent
                 @click="showEmojiPicker = !showEmojiPicker"
               >
                 <span class="emoji-toolbar-icon" aria-hidden="true">😊</span>
                 <span>表情</span>
               </button>
             </div>
             <div
               v-if="showEmojiPicker"
               id="markdown-emoji-picker"
               class="emoji-picker"
               aria-label="常用 Emoji"
             >
               <button
                 v-for="emoji in commonEmojis"
                 :key="emoji"
                 type="button"
                 class="emoji-option"
                 :title="`插入 ${emoji}`"
                 @pointerdown.prevent
                 @click="insertEmoji(emoji)"
               >
                 {{ emoji }}
               </button>
             </div>
             <textarea
               ref="markdownTextareaRef"
               v-model="markdownSource"
              class="markdown-textarea"
              placeholder="# 開始編寫 Markdown..."
              @input="updateMarkdownSource"
              @select="rememberMarkdownSelection"
              @keyup="rememberMarkdownSelection"
              @click="rememberMarkdownSelection"
              @contextmenu.prevent="() => {}"
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
            <MarkdownPreview
              :markdown="previewBodyMarkdown"
              :title="documentTitle"
              :categories="documentCategory"
              :tags="documentTag"
              :is-blog-post="documentBlog"
            />
        </div>
        {{ console.log('EditorWithPreview: documentTitle =', documentTitle) }}
        {{ console.log('EditorWithPreview: documentCategory =', documentCategory) }}
        {{ console.log('EditorWithPreview: documentTag =', documentTag) }}
      </div>
    </div>

    <!-- 拖拽遮罩 -->
    <div v-if="isResizing || isResizingHistory" class="resize-overlay"></div>

    <!-- 導出確認彈窗 -->
    <div v-if="showExportConfirmation" class="export-modal-overlay">
      <div class="export-modal">
        <h3>導出文件預覽</h3>
        <div class="export-preview-content">
          <pre>{{ exportMarkdownContent }}</pre>
        </div>
        <div class="export-modal-actions">
          <button @click="confirmExport" class="modal-btn confirm-btn">確認導出</button>
          <button @click="copyExportContent" class="modal-btn copy-btn">複製</button>
          <button @click="cancelExport" class="modal-btn cancel-btn">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-with-preview {
  height: calc(100vh - var(--vp-nav-height, 64px)); /* Use CSS variable for nav height */
  display: flex;
  flex-direction: column;
  background: var(--panel-glass-bg, rgba(255, 255, 255, 0.7));
  color: var(--panel-text-color, var(--vp-c-text-1));
  backdrop-filter: blur(10px);
  overflow: hidden;
}

/* Removed manual overrides as they are now handled by CSS variables in style.css */

:global(body.theme-christmas) .markdown-editor-header h3,
:global(body.theme-christmas) .history-title,
:global(body.theme-christmas) .btn-text {
  color: #e6f1ff !important;
}

:global(body.theme-christmas) .toolbar-btn {
  color: #e6f1ff !important;
  border-color: rgba(230, 241, 255, 0.3) !important;
}

:global(body.theme-christmas) .toolbar-btn:hover {
  background: rgba(230, 241, 255, 0.1) !important;
}

:global(body.theme-christmas) .doc-title-input {
  color: #e6f1ff !important;
  background: rgba(0, 0, 0, 0.3) !important;
  border-color: rgba(230, 241, 255, 0.3) !important;
}

:global(body.theme-christmas) .doc-title-input::placeholder {
  color: rgba(230, 241, 255, 0.5) !important;
}

/* 頂部工具列 */
.top-toolbar {
  height: 60px; /* Fixed height for consistency */
  padding: 0 1rem;
  background: transparent;
  border-bottom: 1px solid var(--vp-c-divider);
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0; /* Prevent toolbar from shrinking */
  z-index: 101; /* Ensure it's on top */
  position: relative; /* Needed for z-index to work */
}

.toolbar-spacer {
  flex-grow: 1;
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

.toolbar-btn .btn-text {
  display: inline;
}

/* Front Matter Toggle */
.front-matter-toggle-wrapper {
  flex-shrink: 0;
}

.front-matter-toggle-btn .btn-text {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

/* Main Action Buttons */
.main-action-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.mode-toggle-btn {
  font-weight: 500;
}

/* 前置元數據輸入區 */
.front-matter-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: transparent;
  border-bottom: 1px solid var(--vp-c-divider);
  transition: all 0.2s ease-out;
  flex-shrink: 0; /* Prevent from shrinking */
  overflow-y: auto; /* Allow scrolling if content is too tall */
}

.doc-title-input {
  flex: 1;
  min-width: 150px; /* Allow wrapping */
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  color: var(--vp-c-text-1);
  font-size: 0.9rem;
  font-weight: 400;
  transition: all 0.2s;
}

.doc-title-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-alt);
}

.blog-checkbox-label {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  gap: 0.5rem;
}

.blog-checkbox-label input[type="checkbox"] {
  margin-top: 0;
  transform: scale(1.1);
}

/* 主內容區 */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
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
  cursor: text; /* 確保游標顯示為文本編輯狀態 */
}

/* Markdown 編輯器 */
.markdown-editor-header {
  height: 60px;
  background: transparent;
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

.markdown-format-toolbar {
  display: flex;
  flex: 0 0 auto;
  gap: 0.4rem;
  padding: 0.55rem 0.75rem;
  overflow-x: auto;
  border-bottom: 1px solid var(--vp-c-divider);
  background: color-mix(in srgb, var(--vp-c-bg-soft) 72%, transparent);
  scrollbar-width: thin;
}

.markdown-format-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 32px;
  padding: 0.35rem 0.65rem;
  flex: 0 0 auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s, transform 0.2s;
}

.markdown-format-btn:hover,
.markdown-format-btn:focus-visible,
.markdown-format-btn.active {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  outline: none;
}

.markdown-format-btn:active {
  transform: translateY(1px);
}

.emoji-toolbar-icon {
  font-size: 0.95rem;
  line-height: 1;
}

.emoji-picker {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.emoji-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--vp-c-bg);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
}

.emoji-option:hover,
.emoji-option:focus-visible {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  outline: none;
  transform: translateY(-1px);
}

.markdown-textarea {
  flex: 1;
  width: 100%;
  padding: 1.5rem;
  background: transparent;
  border: none;
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 0.9rem;
  line-height: 1.7;
  resize: none;
  outline: none;
  cursor: text !important;
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

/* 桌面版佈局 (默認) */
@media (min-width: 960px) {
  .front-matter-toggle-wrapper .btn-text {
    display: none; /* Hide text on desktop as icon is enough */
  }
}

/* 平板和桌面 */
@media (min-width: 768px) {
  .top-toolbar {
    padding: 0.75rem 1.5rem;
  }
  .main-action-buttons .btn-text {
    display: inline;
  }
  .doc-title-input {
    min-width: 200px;
  }
}

/* 手機版佈局 */
@media (max-width: 767px) {
  .top-toolbar {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    height: auto;
    flex-wrap: wrap; /* Allow wrapping if buttons get too crowded */
  }

  .toolbar-spacer {
    display: none; /* Hide spacer on mobile */
  }

  .main-action-buttons {
    width: auto;
    justify-content: flex-end;
    flex-wrap: nowrap;
    gap: 0.25rem;
  }

  .main-action-buttons .toolbar-btn {
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
  }
  
  .main-action-buttons .btn-text {
    display: none; /* Hide text on smaller buttons */
  }

  .front-matter-toggle-wrapper {
    flex-grow: 1; /* Allow front matter toggle to take available space */
  }

  .front-matter-toggle-btn {
    width: auto;
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
  }

  .front-matter-inputs {
    flex-direction: column;
    padding: 0.75rem;
    gap: 0.75rem;
  }

  .doc-title-input {
    width: 100%;
    min-width: auto;
    font-size: 0.9rem;
    padding: 0.6rem 0.8rem;
  }

  .blog-checkbox-label {
    justify-content: flex-end;
    font-size: 0.85rem;
  }

  .history-sidebar {
    position: fixed;
    top: var(--top-toolbar-mobile-height); /* Dynamic top based on toolbar */
    left: 0;
    width: 100%;
    height: calc(100% - var(--top-toolbar-mobile-height));
    z-index: 100;
    background: transparent;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    transform: translateX(-100%);
    transition: transform 0.3s ease-out;
  }

  .history-sidebar[style*="width"] { /* Override inline style if present */
    width: 100% !important;
  }

  .main-content.history-open .history-sidebar {
    transform: translateX(0);
  }

  /* When history is open, hide content-area */
  .main-content.history-open .content-area {
    display: none;
  }

  .content-area {
    flex-direction: column;
    display: flex;
  }

  .editor-section {
    flex: 1; /* 讓編輯器佔用可用空間 */
    width: 100% !important;
    border-right: none;
    border-bottom: 1px solid var(--vp-c-divider);
    order: 1;
    min-height: 50%; /* 確保至少有一半高度 */
  }

  .preview-section {
    flex: 1; /* 讓預覽佔用可用空間 */
    width: 100% !important;
    border-right: none;
    border-top: 1px solid var(--vp-c-divider);
    order: 2;
    margin-top: 0;
    min-height: 50%; /* 確保至少有一半高度 */
  }
}

/* Tablet (Portrait) */
@media (min-width: 768px) and (max-width: 959px) {
  .front-matter-inputs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
  }

  .doc-title-input {
    min-width: auto;
  }

  .main-action-buttons .btn-text {
    display: inline; /* Show text on tablet */
  }

  .history-sidebar {
    width: 300px !important; /* Fixed width for tablet sidebar */
    position: static;
    transform: translateX(0);
  }

  .main-content.history-open .history-sidebar {
    transform: translateX(0);
  }

  .content-area {
    flex-direction: row;
    display: flex;
  }
  
  .main-content.history-open .content-area {
    display: flex; /* Show content area even if history is open */
  }
}

/* 暗色模式 */
:global(.dark) .markdown-textarea,
:global(body.theme-christmas) .markdown-textarea {
  background: transparent;
  color: var(--vp-c-text-1);
}

:global(body.theme-christmas) .markdown-textarea {
  color: #e6f1ff !important; /* 強制白色文字 */
}

:global(body.theme-christmas) .markdown-textarea::placeholder {
  color: rgba(230, 241, 255, 0.5) !important;
}

/* Export Modal Styles */
.export-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.export-modal {
  background-color: var(--vp-c-bg);
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  color: var(--vp-c-text-1);
}

.export-modal h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--vp-c-brand-1);
  font-size: 1.5rem;
  border-bottom: 1px solid var(--vp-c-divider);
  padding-bottom: 0.75rem;
}

.export-preview-content {
  flex-grow: 1;
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  overflow: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap; /* Preserve whitespace and wrap long lines */
}

.export-preview-content pre {
  margin: 0;
  white-space: pre-wrap; /* Ensure preformatted text wraps */
}

.export-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.modal-btn {
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.modal-btn.confirm-btn {
  background-color: var(--vp-c-brand-1);
  color: #fff;
}

html.dark .modal-btn.confirm-btn {
  color: #000;
}

.modal-btn.confirm-btn:hover {
  background-color: var(--vp-c-brand-2);
}

.modal-btn.cancel-btn {
  background-color: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  border-color: var(--vp-c-divider);
}

.modal-btn.cancel-btn:hover {
  background-color: var(--vp-c-divider);
  color: var(--vp-c-text-1);
}

.modal-btn.copy-btn {
  background-color: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.modal-btn.copy-btn:hover {
  background-color: var(--vp-c-brand-2);
  color: #fff;
}
</style>
