<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { useData } from 'vitepress'
import MarkdownIt from 'markdown-it'

// 引入容器樣式
import './tools/complete-container-styles.scss'

const props = defineProps<{
  markdown: string
}>()

const { isDark } = useData()

// 預覽容器
const previewContainer = ref<HTMLElement>()

// 是否正在渲染
const isRendering = ref(false)

// 渲染錯誤
const renderError = ref<string>('')

// 創建 markdown-it 實例
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
})

// 自定義渲染規則來處理 @lando 主題的容器語法
const renderMarkdown = async (markdown: string) => {
  console.log('renderMarkdown 被調用，markdown:', markdown)
  
  if (!previewContainer.value) {
    console.log('previewContainer 不存在')
    return
  }
  
  if (!markdown.trim()) {
    console.log('markdown 是空的')
    previewContainer.value.innerHTML = '<div class="empty-preview"><p>開始編輯以查看預覽...</p></div>'
    return
  }
  
  console.log('開始渲染 markdown')
  isRendering.value = true
  renderError.value = ''
  
  try {
    let processed = markdown
    
    // 1. 預處理 YouTube 組件
    processed = processed.replace(/<YouTube\s+id=["']([^"']+)["']\s*\/>/g, 
      '<div class="youtube-container"><iframe src="https://www.youtube.com/embed/$1" frameborder="0" allowfullscreen></iframe></div>')
    

    // 2. 處理 tabs 容器中的 == 分隔符(先處理,避免被容器處理影響)
    processed = processed.replace(/:::tabs([^\n]*)\n([\s\S]*?):::/gm, (_match: string, style: string, content: string) => {
      const tabStyle = style.trim() || ''
      // 使用更精確的分割邏輯
      const tabs = []
      const lines = content.split('\n')
      let currentTab = null

      for (const line of lines) {
        const tabMatch = line.match(/^==\s+(.+)$/)
        if (tabMatch) {
          // 如果有之前的tab，先保存
          if (currentTab) {
            tabs.push(currentTab)
          }
          // 開始新tab
          currentTab = {
            title: tabMatch[1].trim(),
            content: ''
          }
        } else if (currentTab) {
          // 累積內容
          currentTab.content += line + '\n'
        }
      }

      // 保存最後一個tab
      if (currentTab) {
        tabs.push(currentTab)
      }

      let tabsHtml = `<div class="plugin-tabs--tab-list" role="tablist">`
      let contentHtml = ''

      // 存儲tabs數據以供JavaScript使用
      const tabsData = []
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i]
        const tabId = `tab-${tab.title}-${i + 1}`
        const panelId = `panel-${tab.title}-${i + 1}`
        const isActive = i === 0

        tabsHtml += `<button id="${tabId}" role="tab" class="plugin-tabs--tab" aria-selected="${isActive}" aria-controls="${panelId}" tabindex="${isActive ? '0' : '-1'}">${tab.title}</button>`

        // 存儲所有tab的數據
        tabsData.push({
          title: tab.title,
          content: tab.content.trim(),
          tabId: tabId,
          panelId: panelId,
          isActive: isActive
        })

        // 只渲染當前選中的tab內容，其他tab內容不渲染（相當於v-if效果）
        if (isActive) {
          contentHtml += `<div data-v-47429141="" id="${panelId}" class="plugin-tabs--content" role="tabpanel" tabindex="0" aria-labelledby="${tabId}">${md.render(tab.content.trim())}</div>`
        }
      }

      tabsHtml += '</div>'

      // 將tabs數據存儲在容器上
      const tabsDataAttr = encodeURIComponent(JSON.stringify(tabsData))

      return `<div class="plugin-tabs ${tabStyle}" data-tabs-data="${tabsDataAttr}">` + tabsHtml + contentHtml + '<!--v-if--></div>'
    })
    
    // 3. 遞歸處理容器 (排除tabs容器)
    const processContainers = (text: string): string => {
      // 找出所有容器的開始和結束位置
      const lines = text.split('\n')
      const stack: Array<{depth: number, type: string, params: string, startLine: number}> = []
      const containers: Array<{start: number, end: number, depth: number, type: string, params: string, content: string}> = []
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        // 修正正則:冒號和類型之間的空格改為可選(\s*)
        const openMatch = line.match(/^(:{3,})\s*([\w-]+)(?:\s+(.*))?$/)
        const closeMatch = line.match(/^(:{3,})\s*$/)
        
        if (openMatch) {
          const depth = openMatch[1].length
          const type = openMatch[2]
          const params = openMatch[3] || ''
          
          // 跳過tabs容器，因為已經在前面處理過了
          if (type === 'tabs') {
            continue
          }
          
          stack.push({depth, type, params, startLine: i})
        } else if (closeMatch && stack.length > 0) {
          const depth = closeMatch[1].length
          // 找到匹配深度的開始標記
          for (let j = stack.length - 1; j >= 0; j--) {
            if (stack[j].depth === depth) {
              const start = stack[j]
              const content = lines.slice(start.startLine + 1, i).join('\n')
              containers.push({
                start: start.startLine,
                end: i,
                depth: start.depth,
                type: start.type,
                params: start.params,
                content: content
              })
              stack.splice(j, 1)
              break
            }
          }
        }
      }
      
      // 如果沒有找到容器,直接返回
      if (containers.length === 0) {
        return text
      }
      
      // 按照深度排序,先處理最深的容器
      containers.sort((a, b) => {
        if (b.depth !== a.depth) return b.depth - a.depth
        return a.start - b.start
      })
      
      // 處理每個容器
      let result = text
      const processed = new Set<number>()
      
      for (const container of containers) {
        if (processed.has(container.start)) continue
        
        const {type, params, content} = container
        let processedContent = content
        
        // 檢查內容中是否還有容器(支持有空格或無空格的語法)
        const hasNested = /^:{3,}\s*[\w-]+/m.test(content)
        
        // 如果有嵌套,遞歸處理
        if (hasNested) {
          processedContent = processContainers(content)
          
          // 對於 thumbnail,遞歸處理後還需要渲染剩餘的 markdown
          if (type === 'thumbnail') {
            processedContent = md.render(processedContent)
          }
        } else {
          // 沒有嵌套,渲染 markdown
          if (type === 'card') {
            const cardTitle = params.trim()
            processedContent = md.render(content.trim())
            if (cardTitle) {
              processedContent = `<div class="card-header">${cardTitle}</div><div class="card-body">${processedContent}</div>`
            } else {
              processedContent = `<div class="card-body">${processedContent}</div>`
            }
          } else if (type === 'caption') {
            // caption 總是渲染內部 markdown
            processedContent = md.render(content)
          } else if (type === 'thumbnail') {
            // thumbnail 沒有嵌套時,渲染內部 markdown
            processedContent = md.render(content)
          } else {
            // 其他容器渲染 markdown
            processedContent = md.render(content)
          }
        }
        
        // 構建替換字符串
        const openTag = `<div class="${type} custom-block">`
        const closeTag = `</div>`
        const replacement = `${openTag}${processedContent}${closeTag}`
        
        // 構建原始字符串(用於替換)
        // 注意:需要匹配原始 markdown 的格式,可能有或沒有空格
        const colonPattern = ':'.repeat(container.depth)
        // 從原始文本中提取實際的開始行來確保格式一致
        const startLine = lines[container.start]
        const endLine = lines[container.end]
        const originalContent = lines.slice(container.start + 1, container.end).join('\n')
        const original = `${startLine}\n${originalContent}\n${endLine}`
        
        result = result.replace(original, replacement)
        processed.add(container.start)
      }
      
      return result
    }
    
    processed = processContainers(processed)
    
    // 4. 最終渲染剩餘的 markdown
    const html = md.render(processed)
    console.log('最終渲染的HTML:', html)
    
    // 5. 設置內容
    previewContainer.value.innerHTML = html
    console.log('HTML 已設置到容器')
    
    await nextTick()
    
    // 6. 添加 tabs 交互功能
    const tabButtons = previewContainer.value.querySelectorAll('.plugin-tabs--tab')
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabsContainer = button.closest('.plugin-tabs')
        
        if (tabsContainer) {
          const tabId = button.getAttribute('id')
          const panelId = button.getAttribute('aria-controls')
          
          // 移除所有 active 狀態
          tabsContainer.querySelectorAll('.plugin-tabs--tab').forEach(btn => {
            btn.setAttribute('aria-selected', 'false')
            btn.setAttribute('tabindex', '-1')
          })
          
          // 設置當前 active 狀態
          button.setAttribute('aria-selected', 'true')
          button.setAttribute('tabindex', '0')
          
          // 先隱藏當前顯示的內容（如果有的話）
          const contentDiv = tabsContainer.querySelector('.plugin-tabs--content') as HTMLElement
          if (contentDiv) {
            contentDiv.style.display = 'none'
          }
          
          // 從data屬性獲取tabs數據
          const tabsDataAttr = tabsContainer.getAttribute('data-tabs-data')
          if (tabsDataAttr) {
            try {
              const tabsData = JSON.parse(decodeURIComponent(tabsDataAttr))
              
              // 找到當前點擊的tab數據
              const selectedTab = tabsData.find((tab: any) => tab.tabId === tabId)
              if (selectedTab && contentDiv) {
                // 更新內容
                contentDiv.innerHTML = md.render(selectedTab.content)
                contentDiv.setAttribute('id', selectedTab.panelId)
                contentDiv.setAttribute('aria-labelledby', selectedTab.tabId)
                contentDiv.setAttribute('role', 'tabpanel')
                contentDiv.setAttribute('tabindex', '0')
                contentDiv.setAttribute('data-v-47429141', '')
                
                // 顯示新內容
                contentDiv.style.display = ''
              }
            } catch (error) {
              console.error('解析tabs數據失敗:', error)
            }
          }
        }
      })
    })
    
    // 觸發 VitePress 的內容更新事件
    const event = new Event('vitepress:content-update')
    document.dispatchEvent(event)
    
  } catch (error) {
    console.error('Markdown 渲染失敗:', error)
    renderError.value = error instanceof Error ? error.message : '未知錯誤'
    
    if (previewContainer.value) {
      previewContainer.value.innerHTML = `
        <div class="render-error">
          <p class="error-title">⚠️ 渲染失敗</p>
          <p class="error-message">${renderError.value}</p>
          <details class="error-details">
            <summary>查看原始 Markdown</summary>
            <pre>${escapeHtml(markdown)}</pre>
          </details>
        </div>
      `
    }
  } finally {
    console.log('渲染完成')
    isRendering.value = false
  }
}

// HTML 轉義
const escapeHtml = (str: string) => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// 監聽 Markdown 變化 (防抖)
let renderTimer: number | null = null
watch(() => props.markdown, (newMd) => {
  console.log('markdown 變化監聽器被觸發:', newMd)
  if (renderTimer) {
    clearTimeout(renderTimer)
  }
  
  renderTimer = window.setTimeout(() => {
    renderMarkdown(newMd)
  }, 300) // 300ms 防抖
}, { immediate: false })

// 監聽暗色模式變化
watch(isDark, () => {
  console.log('暗色模式變化')
  // 暗色模式切換時重新渲染
  renderMarkdown(props.markdown)
})

onMounted(() => {
  console.log('組件掛載')
  renderMarkdown(props.markdown)
})
</script>

<template>
  <div class="markdown-preview-wrapper">
    <div class="preview-header">
      <h3 class="preview-title">
        <i class="fas fa-eye"></i>
        即時預覽
      </h3>
      <div class="preview-badges">
        <div class="preview-badge">
          <i class="fas fa-check-circle"></i>
          VitePress 主題
        </div>
        <div v-if="isRendering" class="preview-badge rendering">
          <i class="fas fa-spinner fa-spin"></i>
          渲染中...
        </div>
      </div>
    </div>
    
    <div 
      ref="previewContainer"
      class="markdown-preview vp-doc"
    >
      <!-- Markdown 內容將在此渲染 -->
      <div class="empty-preview">
        <p>開始編輯以查看預覽...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.markdown-preview-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg);
}

.preview-header {
  height: 60px;
  padding: 0 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--vp-c-bg-soft);
  flex-shrink: 0;
}

.preview-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.preview-badges {
  display: flex;
  gap: 0.5rem;
}

.preview-badge {
  padding: 0.25rem 0.5rem;
  background: var(--vp-c-brand-soft);
  border: 1px solid var(--vp-c-brand-2);
  border-radius: 4px;
  color: var(--vp-c-brand-1);
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 500;
}

.preview-badge.rendering {
  background: var(--vp-c-warning-soft);
  border-color: var(--vp-c-warning-2);
  color: var(--vp-c-warning-1);
}

.markdown-preview {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  font-size: 16px;
  line-height: 1.7;
}

/* 空狀態 */
.markdown-preview :deep(.empty-preview) {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--vp-c-text-3);
  font-size: 0.9rem;
}

/* 渲染錯誤樣式 */
.markdown-preview :deep(.render-error) {
  padding: 1.5rem;
  margin: 1rem;
  background: var(--vp-c-danger-soft);
  border: 1px solid var(--vp-c-danger-2);
  border-radius: 8px;
  color: var(--vp-c-danger-1);
}

.markdown-preview :deep(.render-error .error-title) {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  font-size: 1.1rem;
}

.markdown-preview :deep(.render-error .error-message) {
  margin: 0 0 1rem 0;
  color: var(--vp-c-text-1);
}

.markdown-preview :deep(.render-error .error-details) {
  margin-top: 1rem;
}

.markdown-preview :deep(.render-error .error-details summary) {
  cursor: pointer;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.markdown-preview :deep(.render-error pre) {
  margin: 0;
  padding: 1rem;
  background: var(--vp-c-bg);
  border-radius: 6px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 0.85rem;
  line-height: 1.5;
}

/* ===== @lando/vitepress-theme-default-plus 自定義容器 ===== */

/* 使用主題的默認樣式，移除自定義覆蓋 */
</style>
