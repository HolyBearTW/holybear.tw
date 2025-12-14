<script setup lang="ts">
import { ref, watch, nextTick, onMounted, computed } from 'vue';
import { useData } from 'vitepress';
import MarkdownIt from 'markdown-it';
import markdownItTaskLists from 'markdown-it-task-lists';

// 引入容器樣式
import './tools/complete-container-styles.scss';

const props = defineProps<{
  markdown: string;
  title?: string;
  categories?: string[];
  tags?: string[];
  isBlogPost?: boolean; // New prop
}>();

const { isDark } = useData();

// 預覽容器
const previewContainer = ref<HTMLElement>();

// 是否正在渲染
const isRendering = ref(false);

// 渲染錯誤
const renderError = ref<string>('');

// 創建 markdown-it 實例
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
})
.use(markdownItTaskLists, { enabled: true, class: 'task-list-item' }) // 啟用待辦事項清單
.enable('strikethrough'); // 明確啟用刪除線

// Helper to generate styled HTML for the header (title, category, tags)
const generateStyledHeaderHtml = computed(() => {
  if (!props.isBlogPost) {
    return ''; // Only show header if it's a blog post
  }

  let headerHtml = '';
  const hasMeta = (props.categories && props.categories.length > 0) || (props.tags && props.tags.length > 0);

  if (!props.title && !hasMeta) {
    return ''; // Don't generate anything if no title, category, or tags
  }

  headerHtml += `<div class="blog-post-header-injected">`;

  if (props.title) {
    headerHtml += `<h1 class="blog-post-title">${props.title}</h1>`;
  }

  if (hasMeta) {
    headerHtml += `<div class="blog-post-meta-row">`;
    if (props.categories && props.categories.length > 0) {
      headerHtml += props.categories.map(c => `<span class="category">${c}</span>`).join('');
    }
    if (props.tags && props.tags.length > 0) {
      headerHtml += props.tags.map(t => `<span class="tags">${t}</span>`).join('');
    }
    headerHtml += `</div>`;
  }

  headerHtml += `<div class="blog-post-date-divider"></div>`;
  headerHtml += `</div>`;

  return headerHtml;
});

const renderMarkdown = async () => {
  console.log('MarkdownPreview: props.markdown =', props.markdown);
  console.log('MarkdownPreview: props.title =', props.title);
  console.log('MarkdownPreview: props.categories =', props.categories);
  console.log('MarkdownPreview: props.tags =', props.tags);
  console.log('MarkdownPreview: props.isBlogPost =', props.isBlogPost); // Log new prop
  
  if (!previewContainer.value) {
    console.log('previewContainer 不存在');
    return;
  }
  
  const headerContentHtml = generateStyledHeaderHtml.value;
  const markdownToProcess = props.markdown.trim();

  if (!markdownToProcess && !headerContentHtml.trim()) {
    console.log('markdown 和 headerContentHtml 都是空的');
    previewContainer.value.innerHTML = '<div class="empty-preview"><p>開始編輯以查看預覽...</p></div>';
    return;
  }
  
  console.log('開始渲染 markdown');
  isRendering.value = true;
  renderError.value = '';
  
  try {
    let processedMarkdown = markdownToProcess;
    
    // 1. 預處理 YouTube 組件
    processedMarkdown = processedMarkdown.replace(/<YouTube\s+id=["']([^"']+)["']\s*\/>/g, 
      '<div class="youtube-container"><iframe src="https://www.youtube.com/embed/$1" frameborder="0" allowfullscreen></iframe></div>');
    
    // 2. 處理 tabs 容器中的 == 分隔符(先處理,避免被容器處理影響)
    processedMarkdown = processedMarkdown.replace(/:::tabs([^\n]*)\n([\s\S]*?):::/gm, (_match: string, style: string, content: string) => {
      const tabStyle = style.trim() || '';
      const tabs = [];
      const lines = content.split('\n');
      let currentTab = null;

      for (const line of lines) {
        const tabMatch = line.match(/^==\s+(.+)$/);
        if (tabMatch) {
          if (currentTab) {
            tabs.push(currentTab);
          }
          currentTab = {
            title: tabMatch[1].trim(),
            content: ''
          };
        } else if (currentTab) {
          currentTab.content += line + '\n';
        }
      }

      if (currentTab) {
        tabs.push(currentTab);
      }

      let tabsHtml = `<div class="plugin-tabs--tab-list" role="tablist">`;
      let contentHtml = '';

      const tabsData = [];
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        const tabId = `tab-${tab.title}-${i + 1}`;
        const panelId = `panel-${tab.title}-${i + 1}`;
        const isActive = i === 0;

        tabsHtml += `<button id="${tabId}" role="tab" class="plugin-tabs--tab" aria-selected="${isActive}" aria-controls="${panelId}" tabindex="${isActive ? '0' : '-1'}">${tab.title}</button>`;

        tabsData.push({
          title: tab.title,
          content: tab.content.trim(),
          tabId: tabId,
          panelId: panelId,
          isActive: isActive
        });

        if (isActive) {
          contentHtml += `<div data-v-47429141="" id="${panelId}" class="plugin-tabs--content" role="tabpanel" tabindex="0" aria-labelledby="${tabId}">${md.render(tab.content.trim())}</div>`;
        }
      }

      tabsHtml += '</div>';

      const tabsDataAttr = encodeURIComponent(JSON.stringify(tabsData));

      return `<div class="plugin-tabs ${tabStyle}" data-tabs-data="${tabsDataAttr}">` + tabsHtml + contentHtml + '<!--v-if--></div>';
    });
    
    // 3. 遞歸處理容器 (排除tabs容器)
    const processContainers = (text: string): string => {
      const lines = text.split('\n');
      const stack: Array<{depth: number, type: string, params: string, startLine: number}> = [];
      const containers: Array<{start: number, end: number, depth: number, type: string, params: string, content: string}> = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const openMatch = line.match(/^(:{3,})\s*([\w-]+)(?:\s+(.*))?$/);
        const closeMatch = line.match(/^(:{3,})\s*$/);
        
        if (openMatch) {
          const depth = openMatch[1].length;
          const type = openMatch[2];
          const params = openMatch[3] || '';
          
          if (type === 'tabs') {
            continue;
          }
          
          stack.push({depth, type, params, startLine: i});
        } else if (closeMatch && stack.length > 0) {
          const depth = closeMatch[1].length;
          for (let j = stack.length - 1; j >= 0; j--) {
            if (stack[j].depth === depth) {
              const start = stack[j];
              const content = lines.slice(start.startLine + 1, i).join('\n');
              containers.push({
                start: start.startLine,
                end: i,
                depth: start.depth,
                type: start.type,
                params: start.params,
                content: content
              });
              stack.splice(j, 1);
              break;
            }
          }
        }
      }
      
      if (containers.length === 0) {
        return text;
      }
      
      containers.sort((a, b) => {
        if (b.depth !== a.depth) return b.depth - a.depth;
        return a.start - b.start;
      });
      
      let result = text;
      const processed = new Set<number>();
      
      for (const container of containers) {
        if (processed.has(container.start)) continue;
        
        const {type, params, content} = container;
        let processedContent = content;
        
        const hasNested = /^:{3,}\s*[\w-]+/m.test(content);
        
        if (hasNested) {
          processedContent = processContainers(content);
          
          if (type === 'thumbnail') {
            processedContent = md.render(processedContent);
          }
        } else {
          if (type === 'card') {
            const cardTitle = params.trim();
            processedContent = md.render(content.trim());
            if (cardTitle) {
              processedContent = `<div class="card-header">${cardTitle}</div><div class="card-body">${processedContent}</div>`;
            } else {
              processedContent = `<div class="card-body">${processedContent}</div>`;
            }
          } else if (type === 'caption') {
            processedContent = md.render(content);
          } else if (type === 'thumbnail') {
            processedContent = md.render(content);
          } else {
            processedContent = md.render(content);
          }
        }
        
        const openTag = `<div class="${type} custom-block">`;
        const closeTag = `</div>`;
        const replacement = `${openTag}${processedContent}${closeTag}`;
        
        const startLine = lines[container.start];
        const endLine = lines[container.end];
        const originalContent = lines.slice(container.start + 1, container.end).join('\n');
        const original = `${startLine}\n${originalContent}\n${endLine}`;
        
        result = result.replace(original, replacement);
        processed.add(container.start);
      }
      
      return result;
    };
    
    processedMarkdown = processContainers(processedMarkdown);
    
    // 4. 最終渲染剩餘的 markdown
    const renderedMarkdownHtml = md.render(processedMarkdown);
    
    // 5. 設置內容
    previewContainer.value.innerHTML = headerContentHtml + renderedMarkdownHtml; // Combine header HTML and rendered markdown
    console.log('最終渲染的HTML:', previewContainer.value.innerHTML);
    
    await nextTick();
    
    // 6. 添加 tabs 交互功能
    const tabButtons = previewContainer.value.querySelectorAll('.plugin-tabs--tab');
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabsContainer = button.closest('.plugin-tabs');
        
        if (tabsContainer) {
          const tabId = button.getAttribute('id');
          const panelId = button.getAttribute('aria-controls');
          
          tabsContainer.querySelectorAll('.plugin-tabs--tab').forEach(btn => {
            btn.setAttribute('aria-selected', 'false');
            btn.setAttribute('tabindex', '-1');
          });
          
          button.setAttribute('aria-selected', 'true');
          button.setAttribute('tabindex', '0');
          
          const contentDiv = tabsContainer.querySelector('.plugin-tabs--content') as HTMLElement;
          if (contentDiv) {
            contentDiv.style.display = 'none';
          }
          
          const tabsDataAttr = tabsContainer.getAttribute('data-tabs-data');
          if (tabsDataAttr) {
            try {
              const tabsData = JSON.parse(decodeURIComponent(tabsDataAttr));
              
              const selectedTab = tabsData.find((tab: any) => tab.tabId === tabId);
              if (selectedTab && contentDiv) {
                contentDiv.innerHTML = md.render(selectedTab.content);
                contentDiv.setAttribute('id', selectedTab.panelId);
                contentDiv.setAttribute('aria-labelledby', selectedTab.tabId);
                contentDiv.setAttribute('role', 'tabpanel');
                contentDiv.setAttribute('tabindex', '0');
                contentDiv.setAttribute('data-v-47429141', '');
                
                contentDiv.style.display = '';
              }
            } catch (error) {
              console.error('解析tabs數據失敗:', error);
            }
          }
        }
      });
    });
    
    const event = new Event('vitepress:content-update');
    document.dispatchEvent(event);
    
  } catch (error) {
    console.error('Markdown 渲染失敗:', error);
    renderError.value = error instanceof Error ? error.message : '未知錯誤';
    
    if (previewContainer.value) {
      previewContainer.value.innerHTML = `
        <div class="render-error">
          <p class="error-title">⚠️ 渲染失敗</p>
          <p class="error-message">${renderError.value}</p>
          <details class="error-details">
            <summary>查看原始 Markdown</summary>
            <pre>${escapeHtml(markdownToProcess)}</pre>
          </details>
        </div>
      `;
    }
  } finally {
    console.log('渲染完成');
    isRendering.value = false;
  }
};

// HTML 轉義
const escapeHtml = (str: string) => {
  return str
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
};

// 監聽所有相關 props 變化
let renderTimer: number | null = null;
watch([() => props.markdown, () => props.title, () => props.categories, () => props.tags, () => props.isBlogPost, isDark], () => {
  console.log('Preview props 或暗色模式變化監聽器被觸發');
  if (renderTimer) {
    clearTimeout(renderTimer);
  }
  renderTimer = window.setTimeout(() => {
    renderMarkdown();
  }, 300); // 300ms 防抖
}, { immediate: true }); // immediate: true to render on mount as well

onMounted(() => {
  console.log('MarkdownPreview 組件掛載');
  // Initial render handled by immediate: true in watch
});
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
      <!-- 內容將由 renderMarkdown 動態設置 -->
    </div>
  </div>
</template>

<style scoped>
.markdown-preview-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.preview-header {
  height: 60px;
  padding: 0 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: transparent;
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

.markdown-preview :deep(.blog-post-meta-row .category) {
    background: #e0f7fa;
    color: #00796b;
    border-radius: 999px;
    border: 1.5px solid #00b8b8;
    padding: 10px 12px 6px 12px;
    font-size: 13px;
    line-height: 1;
    margin-right: 0.5em; /* Add some spacing */
}
.dark .markdown-preview :deep(.blog-post-meta-row .category) {
    background: #00363a;
    color: #4dd0e1;
    border-radius: 999px;
    border: 1.5px solid #00b8b8;
    padding: 10px 12px 6px 12px;
    font-size: 13px;
    line-height: 1;
    margin-right: 0.5em; /* Add some spacing */
}
.markdown-preview :deep(.blog-post-meta-row .tags) {
    background: #eaf4fb;
    color: #2077c7;
    border-radius: 999px;
    border: 1px solid #b5d0ea;
    padding: 10px 12px 6px 12px;
    font-size: 13px;
    line-height: 1;
    margin-right: 0.5em; /* Add some spacing */
}
.dark .markdown-preview :deep(.blog-post-meta-row .tags) {
    background: #23263a;
    color: #b5c6e0;
    border: 1px solid #3b3b3b;
}
.markdown-preview :deep(.blog-post-header-injected) {
  padding-top: 30px !important;
}
.markdown-preview :deep(.blog-post-title) {
    display: block !important; /* Ensure it's not hidden by display: none */
    font-size: 2rem !important;
    line-height: 1.2 !important;
    margin-top: 0 !important;
    margin-bottom: 0.5rem !important;
    color: var(--vp-c-text-1) !important;
}
.markdown-preview :deep(.blog-post-meta-row) {
    margin-bottom: 0.5rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
}
.markdown-preview :deep(.blog-post-date-divider) {
    border-bottom: 1px dashed var(--vp-c-divider);
    margin-bottom: 0.5rem;
}

/* ===== @lando/vitepress-theme-default-plus 自定義容器 ===== */

/* 使用主題的默認樣式，移除自定義覆蓋 */
</style>

<style>
/* 添加對刪除線的樣式 */
.markdown-preview :deep(del) {
  text-decoration: line-through;
}
</style>
