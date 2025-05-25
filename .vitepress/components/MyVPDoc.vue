<script setup>
import { useData, Content } from 'vitepress' // 引入 useData 和 Content 組件
import { computed } from 'vue'

const { frontmatter, page } = useData() // 獲取文章 Front Matter 和頁面資訊

// 判斷當前頁面是否為部落格文章
const isBlogPost = computed(() => {
  const isBlog = page.value.relativePath.startsWith('blog/') && !page.value.relativePath.endsWith('blog/index.md');

  // --- 偵錯訊息 (將顯示在頁面 HTML 中) ---
  console.log('--- Debugging MyVPDoc.vue ---');
  console.log('page.value.relativePath:', page.value.relativePath);
  console.log('isBlogPost calculated:', isBlog);
  console.log('frontmatter.value.title:', frontmatter.value.title);
  console.log('frontmatter.value.date:', frontmatter.value.date);
  console.log('------------------------------------');
  // ---------------------------------------------

  return isBlog;
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
  <div class="VPDoc has-aside">
    <div class="container">
      <div class="content">
        <div class="content-container">
          <main class="main">
            <div class="vp-doc">
              <template v-if="isBlogPost">
                <p>Debug: relativePath = {{ page.value.relativePath }}</p>
                <p>Debug: isBlogPost = {{ isBlogPost }}</p>
                <p>Debug: frontmatter.title = {{ frontmatter.value.title }}</p>
                <p>Debug: frontmatter.date = {{ frontmatter.value.date }}</p>
                <hr>

                <h1 class="blog-post-title">{{ frontmatter.value.title || '無標題文章' }}</h1>
                <p v-if="displayDate" class="blog-post-date-in-content">發布日期：{{ displayDate }}</p>
              </template>

              <Content />
            </div>
          </main>
          </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
  我們在 MyVPDoc.vue 中渲染了自訂的 H1 標題。
  為了避免 Markdown 內容中可能出現的重複 H1（即使您已移除，也做個保險），
  我們隱藏由 Markdown 自動生成的第一個 H1。
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


/* 調整其他 Markdown 內容元素的間距，避免與日期重疊或過於緊密 */
:deep(.vp-doc p),
:deep(.vp-doc ul),
:deep(.vp-doc ol),
:deep(.vp-doc img),
:deep(.vp-doc table),
:deep(.vp-doc blockquote),
:deep(.vp-doc pre),
:deep(.vp-doc .custom-block),
:deep(.vp-doc h2:not(.blog-post-title)), /* 確保不影響我們的 custom H1 */
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
