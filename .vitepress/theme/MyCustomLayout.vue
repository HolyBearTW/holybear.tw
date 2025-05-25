<script setup>
import Theme from 'vitepress/theme-without-fonts' // 引入您在 index.ts 中使用的基礎主題
import { useData } from 'vitepress'
import { computed, h } from 'vue'
import FbComments from '../components/FbComments.vue' // 引入您的 FbComments 元件

const { frontmatter, page } = useData() // 獲取文章 Front Matter 和頁面資訊

// 判斷是否為首頁 (用於 FbComments 的顯示邏輯)
const isHomePage = computed(() => page.value.path === '/' || page.value.path === '/index.html')

// 判斷當前頁面是否為部落格文章 (用於日期顯示)
const isBlogPost = computed(() => {
  const isBlog = page.value.relativePath.startsWith('blog/') && !page.value.relativePath.endsWith('blog/index.md');

  // --- 偵錯訊息 (這些訊息將會被渲染到 HTML 頁面中) ---
  console.log('--- Debugging MyCustomLayout.vue (Page Data) ---');
  console.log('page.value.relativePath:', page.value.relativePath);
  console.log('isBlogPost calculated:', isBlog);
  console.log('frontmatter.value.title:', frontmatter.value.title);
  console.log('frontmatter.value.date:', frontmatter.value.date);
  console.log('------------------------------------');
  // --------------------------------------------------

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
</script>

<template>
  <Theme.Layout>
    <template #doc-before>
      <div v-if="isBlogPost">
        <p>Debug: relativePath = {{ page.value.relativePath }}</p>
        <p>Debug: isBlogPost = {{ isBlogPost }}</p>
        <p>Debug: frontmatter.title = {{ frontmatter.value.title }}</p>
        <p>Debug: frontmatter.date = {{ frontmatter.value.date }}</p>
        <hr> <h1 class="blog-post-title">{{ frontmatter.value.title || '無標題文章' }}</h1>
        <p v-if="displayDate" class="blog-post-date-in-content">發布日期：{{ displayDate }}</p>
      </div>
    </template>

    <template #doc-after>
      <div v-if="!isHomePage">
        <FbComments />
      </div>
    </template>

    </Theme.Layout>
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

/* 部落格文章內容的整體容器 (這個樣式現在會影響整個 .VPDocContent 區塊) */
/* 由於我們將標題和日期放在 #doc-before，這個樣式可能需要根據實際顯示微調 */
/* .blog-post-content-wrapper 類別現在不再使用於外層 div，因為我們使用插槽 */


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
:deep(.vp-doc .custom-block), /* 例如 :::tip */
:deep(.vp-doc h2),
:deep(.vp-doc h3),
:deep(.vp-doc img) {
  margin-top: 1rem;
  margin-bottom: 1rem;
}
/* 調整 Code Block 預設樣式避免衝突 */
:deep(.vp-doc div[class*="language-"]) {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}

/* 之前部落格列表的樣式，如果還沒移除請移除 */
/* .blog-post-content-wrapper { ... } */
/* .blog-articles-grid { ... } */
/* .post-item { ... } */
/* ... 許多其他的部落格列表樣式應該只在 blog/index.md 中定義 ... */
</style>
