<script setup>
import Theme from 'vitepress/theme-without-fonts'
import { useData } from 'vitepress'
import { computed, h } from 'vue' // 引入 Vue 的 h 函數
import FbComments from '../components/FbComments.vue' // 引入您的 FbComments 元件

const { frontmatter, page } = useData() // 獲取文章 Front Matter 和頁面資訊

// 判斷是否為首頁 (用於 FbComments 的顯示邏輯)
const isHomePage = computed(() => page.value.path === '/' || page.value.path === '/index.html')

// 判斷當前頁面是否為部落格文章 (用於日期顯示)
// 條件：頁面路徑在 'blog/' 開頭，且不是 'blog/index.md' 這個列表頁
const isBlogPost = computed(() => {
  return page.value.relativePath.startsWith('blog/') && !page.value.relativePath.endsWith('blog/index.md')
})

// 格式化發布日期
const displayDate = computed(() => {
  if (isBlogPost.value && frontmatter.value.date) {
    const date = new Date(frontmatter.value.date)
    return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  return null
})

// 這是實際渲染佈局的函數，它會返回一個 Vue 虛擬節點 (VNode)
const renderLayout = () => {
  return h(Theme.Layout, null, {
    // 這裡我們覆寫了預設的 content slot
    // 讓它先顯示標題和日期，然後才是文章內容
    default: () => {
      if (isBlogPost.value) {
        return h('div', { class: 'blog-post-content-wrapper' }, [
          // 顯示文章標題 (從 Front Matter 獲取)
          h('h1', { class: 'blog-post-title' }, frontmatter.value.title),
          // 顯示發布日期 (在標題下方，字體會小一點)
          h('p', { class: 'blog-post-date-in-content' }, `發布日期：${displayDate.value}`),
          // 渲染 Markdown 內容 (這是 VitePress 處理過的 Markdown 內容，現在不包含 H1)
          h(Theme.Content)
        ])
      }
      // 對於非部落格文章，保持預設內容渲染
      return h(Theme.Content)
    },
    // 注入 FbComments 到 #doc-after slot (保持您原有的邏輯)
    'doc-after': () => {
      if (!isHomePage.value) {
        return h(FbComments)
      }
      return null // 如果是首頁，則不顯示
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
  /* 這裡可以添加一些整體文章內容的樣式，例如左右內邊距 */
  padding-top: 2rem;
  padding-bottom: 2rem;
}

/* 自訂的文章標題樣式 (取代預設的 H1) */
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

/* 您可能需要覆蓋 VitePress 預設對 .vp-doc h1 的樣式，以避免樣式衝突 */
/* 這裡使用 :deep() 來穿透 scoped CSS，影響 .vp-doc 內部由 Markdown 生成的 H1 */
/* 目的是確保即使 Markdown 裡不小心留了 H1，它也不會被渲染出來 */
:deep(.vp-doc h1:first-of-type) {
  display: none; /* 隱藏由 Markdown 內容自動渲染的第一個 H1 */
}

/* 其他可能影響文章內容樣式，例如段落、列表、圖片等 */
:deep(.vp-doc p),
:deep(.vp-doc ul),
:deep(.vp-doc ol),
:deep(.vp-doc img) {
  margin-top: 1rem;
  margin-bottom: 1rem;
}

</style>
