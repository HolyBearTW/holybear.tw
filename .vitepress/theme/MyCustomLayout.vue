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
  這些樣式是為了確保標題和日期與內容完美對齊，不重疊不裁切。
  我們將 .blog-post-header-injected 定位到正確的位置，
  然後用 margin-top 把 .vp-doc 內容往下推，為它騰出空間。
*/

/* 隱藏由 Markdown 自動生成的第一個 H1 (因為我們在 #doc-before 渲染了自訂的) */
:deep(.vp-doc h1:first-of-type) {
  display: none !important; /* 強制隱藏，確保不被其他樣式覆蓋 */
}

/* .blog-post-header-injected 是包裹客製化標題和日期的 div */
.blog-post-header-injected {
  position: relative; /* 相對定位，使其在文檔流中正常排列 */
  top: auto;
  left: auto;
  width: 100%; /* 佔據 100% 寬度 */

  /* 增加內距，使其內容與 VitePress 的標準內容區對齊 */
  padding-left: var(--vp-content-padding);
  padding-right: var(--vp-content-padding);
  
  /* 調整這裡：確保標題區塊與導航欄有適當距離 */
  padding-top: calc(var(--vp-nav-height) + 24px); /* 導航欄高度 + 額外間距 */
  
  padding-bottom: 2rem; /* 標題日期區塊下方的內距 */
  
  /* 這個負邊距會讓 .blog-post-header-injected 往上拉，但這次我們要讓 .vp-doc 推開它 */
  margin-bottom: 0; 

  box-sizing: border-box;
  background-color: var(--vp-c-bg); /* 添加背景色，確保內容不透明 */
  z-index: 1; /* 確保在其他內容之上（如果需要） */
}

/* 調整 Markdown 內容區塊的頂部邊距，為我們注入的標題和日期騰出空間 */
/* 這是**解決文字被裁切的關鍵！** */
:deep(.vp-doc) {
  padding-top: 0 !important; /* 確保沒有多餘的 padding-top */
  /* 將 margin-top 設為一個足夠大的正值，以推開上面的注入區塊 */
  /* 這個值應約等於 .blog-post-header-injected 的**實際高度** + 期望的**小間距** */
  margin-top: 200px; /* <-- 請微調此值！這是解決錯位和裁切的關鍵 */
}

/* 手機版調整 */
@media (max-width: 768px) {
  .blog-post-header-injected {
    padding-left: var(--vp-content-padding);
    padding-right: var(--vp-content-padding);
    
    /* 手機版頂部內距 */
    padding-top: calc(var(--vp-nav-height) + 16px); /* 手機版間距可能需要小一點 */
    
    margin-bottom: 0;
  }
  /* 手機版下，Markdown 內容區塊的頂部邊距 */
  :deep(.vp-doc) {
    padding-top: 0 !important;
    margin-top: 150px; /* <-- 手機版也請微調此值！ */
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
