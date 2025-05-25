<script setup>
import Theme from 'vitepress/theme-without-fonts'
import { useData } from 'vitepress'
import { computed, h } from 'vue' // 引入 Vue 的 h 函數
import FbComments from '../components/FbComments.vue' // 引入您的 FbComments 元件

const { frontmatter, page } = useData() // 獲取文章 Front Matter 和頁面資訊

// 判斷是否為首頁
const isHomePage = computed(() => page.value && (page.value.path === '/' || page.value.path === '/index.html'))

// 判斷當前頁面是否為部落格文章
const isBlogPost = computed(() => {
  // 確保 page.value 存在且 relativePath 存在時才進行判斷
  return page.value && page.value.relativePath &&
         page.value.relativePath.startsWith('blog/') &&
         !page.value.relativePath.endsWith('blog/index.md');
})

// 格式化發布日期
const displayDate = computed(() => {
  if (isBlogPost.value && frontmatter.value && frontmatter.value.date) {
    const date = new Date(frontmatter.value.date)
    return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  return null
})
</script>

<template>
  <Theme.Layout>
    <template #doc-before>
      <div v-if="isBlogPost" class="blog-post-header-injected">
        <p>Debug: relativePath = {{ page.value ? page.value.relativePath : 'N/A' }}</p>
        <p>Debug: isBlogPost = {{ isBlogPost }}</p>
        <p>Debug: frontmatter.title = {{ frontmatter.value ? (frontmatter.value.title || 'N/A') : 'N/A' }}</p>
        <p>Debug: frontmatter.date = {{ frontmatter.value ? (frontmatter.value.date.toString() || 'N/A') : 'N/A' }}</p>
        <hr>

        <h1 class="blog-post-title">{{ frontmatter.value ? (frontmatter.value.title || '無標題文章') : '載入中...' }}</h1>
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
  這個樣式區塊非常重要！它會調整 #doc-before 插槽中內容的位置，
  讓它看起來像是位於 Markdown 內容的 h1 和其餘內容之間。
  我們還會隱藏 VitePress 預設為 Markdown 內容生成的 h1。
*/

/* 隱藏由 Markdown 自動生成的第一個 H1 (因為我們在 #doc-before 渲染了自訂的) */
:deep(.vp-doc h1:first-of-type) {
  display: none;
}

/* 調整 Markdown 內容區塊的頂部邊距，為我們注入的標題和日期留出空間 */
:deep(.vp-doc) {
  /* 調整此值以控制標題和日期與其上方元素的距離 */
  /* 假設標題和日期總高度約 100px-150px，這裡是視覺微調的關鍵 */
  padding-top: 50px; /* 根據實際效果調整，這是讓內容往下移的距離 */
}

/* .blog-post-header-injected 是包裹客製化標題和日期的 div */
.blog-post-header-injected {
  /* 將其定位到正確的位置 */
  position: absolute;
  top: 0; /* 讓它位於 main 標籤的頂部 */
  left: 0;
  width: 100%;
  padding-top: var(--vp-nav-height); /* 加上導航欄高度 */
  padding-left: var(--vp-sidebar-width); /* 加上側邊欄寬度 */
  box-sizing: border-box; /* 確保 padding 不影響寬度 */
  z-index: 1; /* 確保在其他內容之上 */
}

@media (max-width: 768px) { /* 手機版調整 */
  .blog-post-header-injected {
    position: relative; /* 手機版改為相對定位，避免脫離文檔流 */
    padding-left: var(--vp-content-padding); /* 調整左右內距 */
    padding-right: var(--vp-content-padding);
    padding-top: calc(var(--vp-nav-height) + 16px); /* 導航欄下方的間距 */
    margin-bottom: 2rem; /* 標題日期區塊下方留出空間 */
    box-sizing: border-box;
    left: auto;
    top: auto;
  }
  :deep(.vp-doc) {
    padding-top: 0; /* 手機版重設為0，因為 .blog-post-header-injected 自己會佔位 */
  }
}


/* 客製化的標題樣式 */
.blog-post-title {
  font-size: 2.5rem; /* 標題大小，可調整 */
  line-height: 1.2;
  margin-top: 0; /* 確保沒有多餘的上方外距 */
  margin-bottom: 0.5rem; /* 標題下方與日期的間距 */
  color: var(--vp-c-text-1);
}

/* 發布日期的樣式 */
.blog-post-date-in-content {
  color: var(--vp-c-text-2); /* 次要文字顏色 */
  font-size: 0.85rem; /* 字體更小 */
  margin-top: 0; /* 確保沒有多餘的上方外距 */
  margin-bottom: 1.5rem; /* 日期下方與文章內容的間距 */
  padding-bottom: 1rem; /* 日期與下方分隔線的間距 */
  border-bottom: 1px dashed var(--vp-c-divider); /* 在日期下方加一條虛線分隔 */
}


/* 調整 Markdown 內容元素的間距，避免與日期重疊或過於緊密 */
:deep(.vp-doc p),
:deep(.vp-doc ul),
:deep(.vp-doc ol),
:deep(.vp-doc img),
:deep(.vp-doc table),
:deep(.vp-doc blockquote),
:deep(.vp-doc pre),
:deep(.vp-doc .custom-block),
:deep(.vp-doc h2),
:deep(.vp-doc h3),
:deep(.vp-doc h4),
:deep(.vp-doc h5),
:deep(.vp-doc h6) {
  margin-top: 1rem;
  margin-bottom: 1rem;
}
:deep(.vp-doc div[class*="language-"]) {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}
</style>
