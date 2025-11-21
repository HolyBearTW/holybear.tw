import TurndownService from 'turndown'

/**
 * 創建自訂的 Turndown 服務,支援 VitePress 主題容器語法
 */
export function createMarkdownExporter(): TurndownService {
  const turndownService = new TurndownService({
    headingStyle: 'atx', // 使用 # 標題
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
    emDelimiter: '_',
    strongDelimiter: '**',
    linkStyle: 'inlined',
  })


  // 自訂轉義規則: 不要轉義 == (用於 tabs 分隔符)
  turndownService.escape = function (text: string) {
    // 僅轉義必要的字符,不轉義 == (tabs 分隔符)
    return text
      .replace(/\\/g, '\\\\')  // 反斜線
      .replace(/\*/g, '\\*')   // 星號 (粗體/斜體)
      .replace(/^-/gm, '\\-')  // 行首的減號
      .replace(/^\+ /gm, '\\+ ') // 行首的加號
      // 注意: 不轉義 == (用於 tabs),只轉義 Setext 標題 (單行全是 ===)
      .replace(/^(={3,})\s*$/gm, '\\$1') // 行首的連續 === 且後面只有空白 (Setext 標題)
      .replace(/^>/gm, '\\>')  // 行首的 > (引用)
      .replace(/^(\d+)\. /gm, '$1\\. ') // 數字列表
      .replace(/^#{1,6} /gm, match => '\\' + match) // 標題
      .replace(/`/g, '\\`')    // 反引號
      .replace(/^~~~/gm, '\\~~~') // 代碼區塊
      .replace(/\[/g, '\\[')   // 連結語法
      .replace(/\]/g, '\\]')   // 連結語法
      .replace(/^(\s*)(\d+)\. /gm, '$1$2\\. ') // 有縮排的數字列表
  }

  // ==================== 版面節點規則 ====================

  // CenterNode - 置中容器
  turndownService.addRule('centerNode', {
    filter: (node: HTMLElement) => {
      try {
        const cls = node.classList
        if (node.getAttribute && node.getAttribute('data-type') === 'center') return true
        if (cls && cls.contains && cls.contains('custom-block') && cls.contains('center')) return true
      } catch (e) {}
      return false
    },
    replacement: (content: string) => {
      return `\n:::::: center\n${content.trim()}\n::::::\n\n`
    },
  })

  // RowNode - 多欄容器
  turndownService.addRule('rowNode', {
    filter: (node: HTMLElement) => {
      try {
        const cls = node.classList
        if (node.getAttribute && node.getAttribute('data-type') === 'row') return true
        if (cls && cls.contains && cls.contains('custom-block') && cls.contains('row')) return true
      } catch (e) {}
      return false
    },
    replacement: (content: string) => {
      // 解析內容，尋找所有 third 節點的內容
      const lines = content.split('\n')
      const thirds: string[] = []
      let currentThird: string[] | null = null
      let inThird = false
      let inBox = false
      
      for (const line of lines) {
        if (line.trim() === ':::: third') {
          inThird = true
          currentThird = []
        } else if (line.trim() === '::: box' && inThird) {
          inBox = true
        } else if (line.trim() === ':::' && inBox) {
          inBox = false
        } else if (line.trim() === '::::' && inThird && !inBox) {
          if (currentThird && currentThird.length > 0) {
            thirds.push(currentThird.join('\n').trim())
          }
          inThird = false
          currentThird = null
        } else if (inBox && currentThird) {
          currentThird.push(line)
        }
      }
      
      if (thirds.length === 3) {
        // 三欄格式
        return `\n:::::: center\n:::: third\n::: box\n${thirds[0]}\n:::\n::::\n:::: third\n::: box\n${thirds[1]}\n:::\n::::\n:::: third\n::: box\n${thirds[2]}\n:::\n::::\n::::::\n\n`
      }
      
      // 解析 half 節點 (兩欄) - 處理連續的 half 容器
      const halves: string[] = []
      let currentHalf: string[] | null = null
      let inHalf = false
      let inHalfBox = false
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        
        if (line.trim() === '::: half') {
          if (currentHalf && currentHalf.length > 0) {
            // 保存之前的 half
            halves.push(currentHalf.join('\n').trim())
          }
          inHalf = true
          currentHalf = []
        } else if (line.trim() === '::: box' && inHalf) {
          inHalfBox = true
          if (currentHalf) currentHalf.push(line)
        } else if (line.trim() === ':::' && inHalfBox) {
          inHalfBox = false
          if (currentHalf) currentHalf.push(line)
        } else if (line.trim() === '::: half' && inHalf) {
          // 遇到下一個 half，結束當前 half
          if (currentHalf && currentHalf.length > 0) {
            halves.push(currentHalf.join('\n').trim())
          }
          inHalf = true
          currentHalf = []
        } else if (inHalf && currentHalf) {
          currentHalf.push(line)
        }
      }
      
      // 保存最後一個 half
      if (currentHalf && currentHalf.length > 0) {
        halves.push(currentHalf.join('\n').trim())
      }
      
      if (halves.length === 2) {
        // 兩欄格式 - 連續的 half 容器
        return `\n:::::: center\n::: half\n::: box\n${halves[0]}\n::: half\n::: box\n${halves[1]}\n::::::\n\n`
      }
      
      // 降級方案
      return `\n::: row\n${content.trim()}\n:::\n\n`
    },
  })

  // HalfNode - 1/2 欄
  turndownService.addRule('halfNode', {
    filter: (node: HTMLElement) => {
      try {
        const cls = node.classList
        if (node.getAttribute && node.getAttribute('data-type') === 'half') return true
        if (cls && cls.contains && cls.contains('custom-block') && cls.contains('half')) return true
      } catch (e) {}
      return false
    },
    replacement: (content: string) => {
      return `\n::: half\n${content.trim()}\n:::\n\n`
    },
  })

  // ThirdNode - 1/3 欄
  turndownService.addRule('thirdNode', {
    filter: (node: HTMLElement) => {
      try {
        const cls = node.classList
        if (node.getAttribute && node.getAttribute('data-type') === 'third') return true
        if (cls && cls.contains && cls.contains('custom-block') && cls.contains('third')) return true
      } catch (e) {}
      return false
    },
    replacement: (content: string) => {
      return `\n:::: third\n::: box\n${content.trim()}\n:::\n::::\n\n`
    },
  })

  // ==================== 特殊容器節點規則 ====================

  // HighlightNode - 高亮區塊
  turndownService.addRule('highlightNode', {
    filter: (node: HTMLElement) => {
      return node.getAttribute('data-type') === 'highlight'
    },
    replacement: (content: string) => {
      return `\n::: tip 💡 重點提示\n${content.trim()}\n:::\n\n`
    },
  })

  // BoxNode - 彩色提示框
  turndownService.addRule('boxNode', {
    filter: (node: HTMLElement) => {
      return node.getAttribute('data-type') === 'box'
    },
    replacement: (content: string, node: HTMLElement) => {
      const color = node.getAttribute('data-color') || 'blue'
      
      // 映射顏色到 VitePress 容器類型
      const containerTypeMap: Record<string, string> = {
        red: 'danger',
        yellow: 'warning',
        green: 'tip',
        blue: 'info',
        brand: 'details',
      }
      
      const containerType = containerTypeMap[color] || 'info'
      
      return `\n::: ${containerType}\n${content.trim()}\n:::\n\n`
    },
  })

  // CardNode - 卡片容器
  turndownService.addRule('cardNode', {
    filter: (node: HTMLElement) => {
      return node.getAttribute('data-type') === 'card'
    },
    replacement: (content: string, node: HTMLElement) => {
      const title = node.getAttribute('data-title') || '卡片'
      
      // 解析 header 和 body
      const cardHeader = node.querySelector('.card-header')
      const cardBody = node.querySelector('.card-body')
      
      const headerText = cardHeader?.textContent?.trim() || title
      const bodyContent = cardBody?.innerHTML || content
      
      // 轉換 body 內容
      const bodyMarkdown = turndownService.turndown(bodyContent)
      
      return `\n::: details ${headerText}\n${bodyMarkdown.trim()}\n:::\n\n`
    },
  })

  // TabsNode - 標籤頁容器
  turndownService.addRule('tabsNode', {
    filter: (node: HTMLElement) => {
      return node.getAttribute('data-type') === 'tabs'
    },
    replacement: (content: string, node: HTMLElement) => {
      const style = node.getAttribute('data-style') || 'default'
      
      // 嘗試從 data 屬性中解析 tabs
      const tabsData = node.getAttribute('data-tabs')
      
      if (tabsData) {
        try {
          const tabs = JSON.parse(tabsData)
          const tabsMarkdown = tabs.map((tab: any) => {
            return `== ${tab.label}\n${tab.content || ''}`
          }).join('\n\n')
          
          const containerType = style === 'default' ? 'tabs' : `tabs ${style}`
          
          return `\n::: ${containerType}\n${tabsMarkdown}\n:::\n\n`
        } catch (e) {
          console.error('Failed to parse tabs data:', e)
        }
      }
      
      // 降級方案: 直接輸出內容
      return `\n::: tabs\n${content.trim()}\n:::\n\n`
    },
  })

  // ==================== 圖片規則 ====================

  // DraggableImage - 可拖曳圖片
  turndownService.addRule('draggableImage', {
    filter: (node: HTMLElement) => {
      return node.tagName === 'IMG' || 
             (node.classList && node.classList.contains('draggable-image-wrapper'))
    },
    replacement: (content: string, node: HTMLElement) => {
      let img: HTMLImageElement | null = null
      
      if (node.tagName === 'IMG') {
        img = node as HTMLImageElement
      } else {
        img = node.querySelector('img')
      }
      
      if (!img) return ''
      
      const src = img.getAttribute('src') || ''
      const alt = img.getAttribute('alt') || ''
      const title = img.getAttribute('title') || ''
      const width = img.getAttribute('width')
      const align = node.getAttribute('data-align') || img.getAttribute('data-align')
      
      let markdown = `![${alt}](${src}`
      if (title) {
        markdown += ` "${title}"`
      }
      markdown += ')'
      
      // 如果有寬度或對齊方式,添加 HTML 標籤
      if (width || align) {
        const attrs = []
        if (width) attrs.push(`width="${width}"`)
        if (align) attrs.push(`align="${align}"`)
        
        markdown = `<img src="${src}" alt="${alt}" ${attrs.join(' ')} />`
      }
      
      return markdown
    },
  })

  // ==================== YouTube 規則 ====================

  turndownService.addRule('youtube', {
    filter: (node: HTMLElement) => {
      if (node.tagName !== 'IFRAME') return false
      const iframe = node as HTMLIFrameElement
      return iframe.src?.includes('youtube.com') || iframe.src?.includes('youtu.be')
    },
    replacement: (content: string, node: HTMLElement) => {
      const src = (node as HTMLIFrameElement).src || ''
      
      // 提取 YouTube 影片 ID
      let videoId = ''
      const patterns = [
        /youtube\.com\/embed\/([^?&]+)/,
        /youtube\.com\/watch\?v=([^&]+)/,
        /youtu\.be\/([^?&]+)/,
      ]
      
      for (const pattern of patterns) {
        const match = src.match(pattern)
        if (match) {
          videoId = match[1]
          break
        }
      }
      
      if (videoId) {
        return `\n@[youtube](${videoId})\n\n`
      }
      
      return `\n[YouTube 影片](${src})\n\n`
    },
  })

  // ==================== 任務列表規則 ====================

  turndownService.addRule('taskList', {
    filter: (node: HTMLElement) => {
      return node.getAttribute('data-type') === 'taskList'
    },
    replacement: (content: string) => {
      return content
    },
  })

  turndownService.addRule('taskItem', {
    filter: (node: HTMLElement) => {
      return node.getAttribute('data-type') === 'taskItem'
    },
    replacement: (content: string, node: HTMLElement) => {
      const checked = node.getAttribute('data-checked') === 'true'
      const checkbox = checked ? '[x]' : '[ ]'
      return `- ${checkbox} ${content.trim()}\n`
    },
  })

  // ==================== 連結規則 (處理 target="_blank") ====================

  turndownService.addRule('linkWithTarget', {
    filter: (node: HTMLElement) => {
      return node.tagName === 'A' && node.getAttribute('target') === '_blank'
    },
    replacement: (content: string, node: HTMLElement) => {
      const href = (node as HTMLAnchorElement).href || ''
      const title = node.getAttribute('title')
      
      let markdown = `[${content}](${href}`
      if (title) {
        markdown += ` "${title}"`
      }
      markdown += ')'
      
      return markdown
    },
  })

  // ==================== 代碼區塊規則 (保留語言) ====================

  turndownService.addRule('codeBlock', {
    filter: (node: HTMLElement) => {
      return node.tagName === 'PRE' && !!node.querySelector('code')
    },
    replacement: (content: string, node: HTMLElement) => {
      const codeElement = node.querySelector('code')
      if (!codeElement) return content
      
      // 嘗試從 class 中提取語言
      const className = codeElement.className || ''
      const languageMatch = className.match(/language-(\w+)/)
      const language = languageMatch ? languageMatch[1] : ''
      
      const code = codeElement.textContent || ''
      
      return `\n\`\`\`${language}\n${code}\n\`\`\`\n\n`
    },
  })

  return turndownService
}

/**
 * 將編輯器 HTML 轉換為 Markdown
 */
export function exportToMarkdown(html: string): string {
  const turndownService = createMarkdownExporter()
  const markdown = turndownService.turndown(html)
  
  // 清理多餘的空行 (超過 2 個連續換行)
  return markdown.replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * 下載 Markdown 檔案
 */
export function downloadMarkdown(markdown: string, filename: string = 'document.md') {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
