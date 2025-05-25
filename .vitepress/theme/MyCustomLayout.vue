<script setup>
import Theme from 'vitepress/theme-without-fonts'
import { useData } from 'vitepress'
import { computed, h } from 'vue'
import FbComments from '../components/FbComments.vue'

const { frontmatter, page } = useData()

// 判斷是否為首頁 (用於 FbComments 的顯示邏輯)
const isHomePage = computed(() => page.value.path === '/' || page.value.path === '/index.html')

// 判斷當前頁面是否為部落格文章
const isBlogPost = computed(() => {
  // 檢查頁面路徑是否以 'blog/' 開頭，且不是 'blog/index.md' 這個列表頁
  const isBlog = page.value.relativePath.startsWith('blog/') && !page.value.relativePath.endsWith('blog/index.md');
  return isBlog;
})

// 格式化發布日期
const displayDate = computed(() => {
  if (isBlogPost.value && frontmatter.value.date) {
    const date = new Date(frontmatter.value.date)
    return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  return null
})

// 這是實際渲染佈局的函數
const renderLayout = () => {
  return h(Theme.Layout, null, {
    // 覆寫預設的 content slot，來控制文章內容的渲染
    default: () => {
      // 如果是部落格文章
      if (isBlogPost.value) {
        return h('div', { class: 'blog-post-content-wrapper' }, [
          // 顯示文章標題 (從 Front Matter 獲取，若無則顯示 '無標題文章')
          h('h1', { class: 'blog-post-title' }, frontmatter.value.title || '無標題文章'),
          // 顯示發布日期 (若有日期則顯示，否則不顯示該段落)
          displayDate.value
            ? h('p', { class: 'blog-post-date-in-content' }, `發布日期：${displayDate.value}`)
            : null, // 如果沒有日期就不渲染這個 <p> 標籤
          // 渲染文章其餘的 Markdown 內容
          h(Theme.Content)
        ])
      }
      // 對於非部落格文章（例如首頁、Mod.html 等），保持預設內容渲染
      return h(Theme.Content)
    },
    // 注入 FbComments 到 #doc-after slot (保持您原有的邏輯)
    'doc-after': () => {
      if (!isHomePage.value) {
        return h(FbComments)
      }
      return null
    }
  })
}
</script>

<template>
  <renderLayout />
</template>

<style scoped>
/* 部落格文章內容的整體容器 */
.blog-post-content-wrapper {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

/* 自訂的文章標題樣式 */
.blog-post-title {
  font-size: 2.5rem; /* 標題大小，可調整 */
  line-height: 1.2;
  margin-top: 0; /* 確保沒有多餘的上方外距 */
  margin-bottom: 0.5rem; /* 標題下方與日期的間距 */
  color: var(--vp-c-text-1);
}

/* 發布日期的樣式 */
.blog-post-date-in-content {
  color: var(--vp-c-text-2); /* 使用 VitePress 變數定義的次要文字顏色 */
  font-size: 0.85rem; /* 字體更小 */
  margin-top: 0; /* 確保沒有多餘的上方外距 */
  margin-bottom: 1.5rem; /* 日期下方與文章內容的間距 */
  padding-bottom: 1rem; /* 日期與下方分隔線的間距 */
  border-bottom: 1px dashed var(--vp-c-divider); /* 在日期下方加一條虛線分隔 */
}

/* 確保隱藏由 Markdown 內容自動渲染的第一個 H1，避免重複標題 */
:deep(.vp-doc h1:first-of-type) {
  display: none;
}

/* 其他可能影響文章內容樣式，例如段落、列表、圖片等 */
:deep(.vp-doc p),
:deep(.vp-doc ul),
:deep(.vp-doc ol),
:deep(.vp-doc img),
:deep(.vp-doc table),
:deep(.vp-doc blockquote),
:deep(.vp-doc pre),
:deep(.vp-doc .custom-block) { /* 增加更多常見的 Markdown 元素 */
  margin-top: 1rem;
  margin-bottom: 1rem;
}
/* 調整 Code Block 預設樣式避免衝突 */
:deep(.vp-doc div[class*="language-"]) {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}
</style>
