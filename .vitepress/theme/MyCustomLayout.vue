<script setup>
import Theme from 'vitepress/theme-without-fonts'
import { useData } from 'vitepress'
import { computed, h } from 'vue'
import FbComments from '../components/FbComments.vue' // 引入您的 FbComments 元件

const { frontmatter, page } = useData() // 獲取文章 Front Matter 和頁面資訊

// 判斷是否為首頁
const isHomePage = computed(() => page.value && (page.value.path === '/' || page.value.path === '/index.html'))

// 判斷當前頁面是否為部落格文章
const isBlogPost = computed(() => {
  // 增加對 page.value 是否存在的檢查
  const isBlog = page.value && page.value.relativePath.startsWith('blog/') && !page.value.relativePath.endsWith('blog/index.md');

  // --- 偵錯訊息 (這些訊息將會被渲染到 HTML 頁面中) ---
  console.log('--- Debugging MyCustomLayout.vue (Page Data) ---');
  console.log('page.value.relativePath:', page.value ? page.value.relativePath : 'page.value is UNDEFINED'); // 更安全的顯示
  console.log('isBlogPost calculated:', isBlog);
  console.log('frontmatter.value.title:', frontmatter.value ? frontmatter.value.title : 'frontmatter.value is UNDEFINED'); // 更安全的顯示
  console.log('frontmatter.value.date:', frontmatter.value ? frontmatter.value.date : 'frontmatter.value is UNDEFINED'); // 更安全的顯示
  console.log('------------------------------------');
  // --------------------------------------------------

  return isBlog;
})

// 格式化發布日期
const displayDate = computed(() => {
  // 增加對 frontmatter.value.date 是否存在的檢查
  if (isBlogPost.value && frontmatter.value && frontmatter.value.date) {
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
      // 確保在渲染之前，page.value 和 frontmatter.value 都是存在的
      if (page.value && frontmatter.value && isBlogPost.value) {
        return h('div', { class: 'blog-post-content-wrapper' }, [
          // 渲染偵錯訊息
          h('p', null, `Debug: relativePath = ${page.value.relativePath}`),
          h('p', null, `Debug: isBlogPost = ${isBlogPost.value}`),
          h('p', null, `Debug: frontmatter.title = ${frontmatter.value.title}`),
          h('p', null, `Debug: frontmatter.date = ${frontmatter.value.date}`),
          h('hr'), // 分隔線

          // 顯示文章標題
          h('h1', { class: 'blog-post-title' }, frontmatter.value.title || '無標題文章'),
          // 顯示發布日期
          displayDate.value
            ? h('p', { class: 'blog-post-date-in-content' }, `發布日期：${displayDate.value}`)
            : null,
          // 渲染文章其餘的 Markdown 內容
          h(Theme.Content)
        ])
      }
      // 對於非部落格文章（或 page.value/frontmatter.value 不存在的情況），也輸出基本偵錯訊息，然後渲染原始內容
      return h('div', null, [
        // 渲染偵錯訊息
        h('p', null, `Debug: relativePath = ${page.value ? page.value.relativePath : 'N/A'}`),
        h('p', null, `Debug: isBlogPost = ${isBlogPost.value}`),
        h('p', null, `Debug: frontmatter.title = ${frontmatter.value ? frontmatter.value.title : 'N/A'}`),
        h('p', null, `Debug: frontmatter.date = ${frontmatter.value ? frontmatter.value.date : 'N/A'}`),
        h('hr'), // 分隔線
        h(Theme.Content) // 渲染原始內容
      ]);
    },
    // 注入 FbComments 到 #doc-after slot (保持您原有的邏輯)
    'doc-after': () => {
      if (isHomePage.value) { // 這裡也要確保 isHomePage 是對的
        return null;
      }
      return h(FbComments);
    }
  })
}
</script>

<template>
  <renderLayout />
</template>

<style scoped>
/*
  由於我們在 #doc-before 插入了標題和日期，
  且頁面內容會自動渲染 Markdown 中的標題，
  我們需要隱藏 Markdown 中生成的 H1，避免重複。
*/
:deep(.vp-doc h1:first-of-type) {
  display: none;
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


/* 其他 Markdown 內容的樣式調整，確保它們有適當的間距 */
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
