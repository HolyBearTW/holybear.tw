<script setup>
import Theme from 'vitepress/theme-without-fonts'
import { useData } from 'vitepress'
import { computed, ref, onMounted } from 'vue'
import FbComments from '../components/FbComments.vue'

const { frontmatter, page } = useData()

const currentRelativePath = ref('N/A');
const currentIsBlogPost = ref(false);
const currentTitle = ref('N/A');
const currentFrontmatterDate = ref('N/A');
const currentDisplayDate = ref(null);

onMounted(() => {
  currentRelativePath.value = page.value ? page.value.relativePath : 'page.value is UNDEFINED';
  currentTitle.value = frontmatter.value ? (frontmatter.value.title || '無標題文章') : 'frontmatter.value is UNDEFINED';
  currentFrontmatterDate.value = frontmatter.value ? (frontmatter.value.date ? frontmatter.value.date.toString() : 'No date in frontmatter') : 'frontmatter.value is UNDEFINED';

  currentIsBlogPost.value = page.value && page.value.relativePath &&
                             page.value.relativePath.startsWith('blog/') &&
                             !page.value.relativePath.endsWith('blog/index.md');
  
  if (currentIsBlogPost.value && frontmatter.value && frontmatter.value.date) {
    const date = new Date(frontmatter.value.date);
    currentDisplayDate.value = date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
  } else {
    currentDisplayDate.value = null;
  }

  // --- 偵錯訊息 (會在客戶端控制台顯示) ---
  console.log('--- Debugging MyCustomLayout.vue (onMounted Final State) ---');
  console.log('Final relativePath:', currentRelativePath.value);
  console.log('Final isBlogPost:', currentIsBlogPost.value);
  console.log('Final Title:', currentTitle.value);
  console.log('Final Frontmatter Date:', currentFrontmatterDate.value);
  console.log('Final Display Date:', currentDisplayDate.value);
  console.log('------------------------------------');
});

const isHomePage = computed(() => page.value && (page.value.path === '/' || page.value.path === '/index.html'))
</script>

<template>
  <Theme.Layout>
    <template #doc-before>
      <div v-if="currentIsBlogPost" class="blog-post-header-injected">
        <p>Debug: relativePath = {{ currentRelativePath }}</p>
        <p>Debug: isBlogPost = {{ currentIsBlogPost }}</p>
        <p>Debug: frontmatter.title = {{ currentTitle }}</p>
        <p>Debug: frontmatter.date = {{ currentFrontmatterDate }}</p>
        <hr>

        <h1 class="blog-post-title">{{ currentTitle }}</h1>
        <p v-if="currentDisplayDate" class="blog-post-date-in-content">發布日期：{{ currentDisplayDate }}</p>
      </div>
      <div v-else>
        <p>Debug: Not a blog post OR data not ready ({{ page.value ? page.value.relativePath : 'N/A' }})</p>
        <hr>
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
  display: none !important; /* 強制隱藏，確保不被其他樣式覆蓋 */
}

/* 調整 Markdown 內容區塊的頂部邊距 */
/* 這裡將 .vp-doc 的頂部內距和外距重設為 0，讓其緊鄰上方內容 */
:deep(.vp-doc) {
  padding-top: 0;
  margin-top: 0;
}

/* .blog-post-header-injected 是包裹客製化標題和日期的 div */
/* 這個容器將會自然地流動在頁面中，並透過負邊距拉起下方的內容 */
.blog-post-header-injected {
  /* 移除絕對定位，讓它在文檔流中正常排列 */
  position: relative; /* 改為相對定位 */
  top: auto;
  left: auto;
  width: 100%; /* 佔據 100% 寬度 */

  /* 增加內距，使其內容與 VitePress 的標準內容區對齊 */
  padding-left: var(--vp-content-padding);
  padding-right: var(--vp-content-padding);
  padding-top: calc(var(--vp-nav-height) + 16px); /* 距離導航欄底部的高度 */
  padding-bottom: 2rem; /* 標題日期區塊下方的內距 */
  
  /* 這是一個**關鍵的負邊距**，用於將其後面的 .vp-doc 內容往上拉 */
  /* 這個值需要根據您實際的標題和日期的高度來微調 */
  /* 您可以在瀏覽器開發者工具中，觀察 .blog-post-header-injected 的實際高度，
     然後將這個負值設為略小於該高度的負值，以拉起 .vp-doc */
  margin-bottom: -100px; /* 範例值，您可能需要調整 */

  box-sizing: border-box;
  background-color: var(--vp-c-bg); /* 添加背景色，確保內容不透明 */
  z-index: 1; /* 確保在其他元素之上（如果需要） */
}

/* 手機版調整 */
@media (max-width: 768px) {
  .blog-post-header-injected {
    padding-left: var(--vp-content-padding);
    padding-right: var(--vp-content-padding);
    padding-top: calc(var(--vp-nav-height) + 16px);
    /* 手機版可能需要不同的負邊距值 */
    margin-bottom: -80px; /* 範例值，可能需要根據手機實際顯示調整 */
  }
}

/* 客製化的標題樣式 */
.blog-post-title {
  font-size: 2.5rem; /* 標題大小，可調整 */
  line-height: 1.2;
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: var(--vp-c-text-1);
}

/* 發布日期的樣式 */
.blog-post-date-in-content {
  color: var(--vp-c-text-2); /* 次要文字顏色 */
  font-size: 0.85rem; /* 字體更小 */
  margin-top: 0;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
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
