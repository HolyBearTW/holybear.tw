<script setup>
// 引入您在 index.ts 中使用的基礎主題
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
    // 注入發布日期到 #doc-before slot (在 Markdown 內容上方)
    'doc-before': () => {
      if (isBlogPost.value && displayDate.value) {
        return h('div', { class: 'blog-post-date-display' }, `發布日期：${displayDate.value}`)
      }
      return null // 如果不是部落格文章或沒有日期，則不顯示
    },
    // 注入 FbComments 到 #doc-after slot (保持您原有的邏輯)
    'doc-after': () => {
      if (!isHomePage.value) {
        return h(FbComments)
      }
      return null // 如果是首頁，則不顯示
    }
    // 如果您還有其他需要注入的 slot，可以在這裡繼續添加
  })
}
</script>

<template>
  <renderLayout />
</template>

<style scoped>
/* 日期顯示的樣式 */
.blog-post-date-display {
  color: var(--vp-c-text-2); /* 使用 VitePress 變數定義的次要文字顏色 */
  font-size: 0.95rem;
  margin-top: 1rem; /* 日期上方留點空間 */
  margin-bottom: 1.5rem; /* 日期下方與文章內容的間距 */
  padding-bottom: 1rem; /* 日期與下方分隔線的間距 */
  border-bottom: 1px dashed var(--vp-c-divider); /* 在日期下方加一條虛線分隔 */
}
</style>
