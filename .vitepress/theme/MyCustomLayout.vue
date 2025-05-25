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
});

const isHomePage = computed(() => page.value && (page.value.path === '/' || page.value.path === '/index.html'))
</script>

<template>
  <Theme.Layout>
    <template #doc-before>
      <div v-if="currentIsBlogPost" class="blog-post-header-injected">
        <h1 class="blog-post-title">{{ currentTitle }}</h1>
        <p v-if="currentDisplayDate" class="blog-post-date-in-content">發布日期：{{ currentDisplayDate }}</p>
      </div>
      <div v-else>
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

/* 將 .VPContent 設為定位上下文，以便其內部的絕對定位元素能相對於它定位 */
/* 使用 :deep() 來穿透 scoped CSS，因為 .VPContent 在外部 */
:deep(.VPContent) {
  position: relative; /* <-- 這是關鍵，讓絕對定位的子元素相對於它 */
}

/* 隱藏由 Markdown 自動生成的第一個 H1 (因為我們在 #doc-before 渲染了自訂的) */
:deep(.vp-doc h1:first-of-type) {
  display: none !important; /* 強制隱藏，確保不被其他樣式覆蓋 */
}

/* .blog-post-header-injected 是包裹客製化標題和日期的 div */
.blog-post-header-injected {
  position: absolute; /* 相對於 .VPContent 絕對定位 */
  top: 0; /* 位於 .VPContent 頂部 */
  left: 0; /* 位於 .VPContent 左側 */
  width: 100%; /* 佔據 .VPContent 的全部寬度 */
  
  /* 調整內距，使其內容與 VitePress 的標準內容區對齊 */
  /* 這些 padding 值會將內容推離 .VPContent 的邊界 */
  padding-top: calc(var(--vp-nav-height) + 16px); /* 導航欄下方的間距 */
  padding-left: var(--vp-sidebar-width); /* 側邊欄寬度 */
  padding-right: var(--vp-content-padding); /* 內容區塊的右側內距 */
  padding-bottom: 2rem; /* 標題日期區塊下方的內距 */

  box-sizing: border-box; /* 確保 padding 包含在 width 計算中 */
  background-color: var(--vp-c-bg); /* 添加背景色，確保內容不透明 */
  z-index: 10; /* 確保在其他內容之上 */
}

/* 調整 Markdown 內容區塊的頂部邊距，為我們注入的標題和日期騰出空間 */
/* 這個 margin-top 值需要精確調整，以確保 Markdown 內容從正確位置開始 */
:deep(.vp-doc) {
  padding-top: 0 !important; /* 確保沒有多餘的 padding-top */
  margin-top: 200px; /* <-- 這是關鍵值！請根據實際顯示效果微調此值！ */
                     /* 應該略大於 .blog-post-header-injected 的實際高度 */
}

/* 手機版調整 */
@media (max-width: 768px) {
  .blog-post-header-injected {
    position: relative; /* 手機版改為相對定位，避免脫離文檔流 */
    padding-left: var(--vp-content-padding);
    padding-right: var(--vp-content-padding);
    padding-top: calc(var(--vp-nav-height) + 16px);
    margin-bottom: 2rem; /* 標題日期區塊下方留出空間 */
    box-sizing: border-box;
    left: auto;
    top: auto;
    width: auto;
  }
  /* 手機版下，Markdown 內容區塊的頂部邊距可能需要調整 */
  :deep(.vp-doc) {
    padding-top: 0 !important;
    margin-top: 0 !important; /* 手機版通常不需要特別的 margin-top，因為它是相對定位的 */
  }
}

/* 客製化的標題樣式 */
.blog-post-title {
  font-size: 2.5rem;
  line-height: 1.2;
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: var(--vp-c-text-1);
}

/* 發布日期的樣式 */
.blog-post-date-in-content {
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  margin-top: 0;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px dashed var(--vp-c-divider);
}

/* 調整 Markdown 內容元素的間距 */
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
