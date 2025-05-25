<script setup>
import Theme from 'vitepress/theme-without-fonts'
import { useData } from 'vitepress'
import { computed, h } from 'vue'
import FbComments from '../components/FbComments.vue'

const { frontmatter, page } = useData()

// 判斷是否為首頁 (確保 page.value 存在)
const isHomePage = computed(() => page.value && (page.value.path === '/' || page.value.path === '/index.html'))

// 判斷當前頁面是否為部落格文章 (更嚴謹的檢查)
const isBlogPost = computed(() => {
  // 只有當 page.value 存在且 relativePath 存在時才進行判斷
  const isBlog = page.value && page.value.relativePath &&
                 page.value.relativePath.startsWith('blog/') &&
                 !page.value.relativePath.endsWith('blog/index.md');

  // --- 偵錯訊息 ---
  console.log('--- Debugging MyCustomLayout.vue (Page Data) ---');
  console.log('page.value.relativePath:', page.value ? page.value.relativePath : 'page.value is UNDEFINED');
  console.log('isBlogPost calculated:', isBlog);
  console.log('frontmatter.value.title:', frontmatter.value ? frontmatter.value.title : 'frontmatter.value is UNDEFINED');
  console.log('frontmatter.value.date:', frontmatter.value ? frontmatter.value.date : 'frontmatter.value is UNDEFINED');
  console.log('Display Date value (computed):', displayDate.value); // 這裡可能還是 null/undefined
  console.log('------------------------------------');

  return isBlog;
})

// 格式化發布日期 (確保 frontmatter.value 存在且 date 存在)
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
      <div v-if="isBlogPost && frontmatter.value">
        <p>Debug: relativePath = {{ page.value ? page.value.relativePath : 'N/A' }}</p>
        <p>Debug: isBlogPost = {{ isBlogPost }}</p>
        <p>Debug: frontmatter.title = {{ frontmatter.value.title || 'N/A' }}</p>
        <p>Debug: frontmatter.date = {{ frontmatter.value.date ? frontmatter.value.date.toString() : 'N/A' }}</p>
        <hr>

        <h1 class="blog-post-title">{{ frontmatter.value.title || '無標題文章' }}</h1>
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
  由於我們在 #doc-before 插槽中渲染了自訂的 H1 標題。
  VitePress 預設會從 Front Matter 的 `title` 生成一個 `<h1>` 標籤，
  這個 `<h1>` 會位於 `.vp-doc` 內部。我們需要隱藏這個 H1，避免重複。
*/
:deep(.vp-doc h1:first-of-type) {
  display: none;
}

/* 自訂的文章標題樣式 (應用於 #doc-before 中的 h1) */
.blog-post-title {
  font-size: 2.5rem; /* 標題大小，可調整 */
  line-height: 1.2;
  margin-top: 0; /* 確保沒有多餘的上方外距 */
  margin-bottom: 0.5rem; /* 標題下方與日期的間距 */
  color: var(--vp-c-text-1);
}

/* 發布日期的樣式 (應用於 #doc-before 中的 p) */
.blog-post-date-in-content {
  color: var(--vp-c-text-2); /* 次要文字顏色 */
  font-size: 0.85rem; /* 字體更小 */
  margin-top: 0; /* 確保沒有多餘的上方外距 */
  margin-bottom: 1.5rem; /* 日期下方與文章內容的間距 */
  padding-bottom: 1rem; /* 日期與下方分隔線的間距 */
  border-bottom: 1px dashed var(--vp-c-divider); /* 在日期下方加一條虛線分隔 */
}


/* 調整其他 Markdown 內容元素的間距，避免與日期重疊或過於緊密 */
/* 這些樣式會應用於實際的 Markdown 內容，確保它們不會被我們注入的標題和日期遮蓋 */
:deep(.vp-doc p),
:deep(.vp-doc ul),
:deep(.vp-doc ol),
:deep(.vp-doc img),
:deep(.vp-doc table),
:deep(.vp-doc blockquote),
:deep(.vp-doc pre),
:deep(.vp-doc .custom-block),
:deep(.vp-doc h2), /* 針對 Markdown 內容中的 H2 */
:deep(.vp-doc h3),
:deep(.vp-doc h4),
:deep(.vp-doc h5),
:deep(.vp-doc h6) {
  margin-top: 1rem;
  margin-bottom: 1rem;
}
/* 調整 Code Block 預設樣式避免衝突 */
:deep(.vp-doc div[class*="language-"]) {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}
</style>
