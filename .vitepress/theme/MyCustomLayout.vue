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
  這些樣式是為了解決標題和日期與內容重疊的問題。
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
  
  /* ******** 估計調整這裡：讓標題區塊更往上靠 ******* */
  padding-top: calc(var(--vp-nav-height) + 0px); /* 導航欄高度 + 0px 額外間距 */
  
  padding-bottom: 2rem; /* 標題日期區塊下方的內距 */
  margin-bottom: 0; 

  box-sizing: border-box;
  background-color: var(--vp-c-bg); /* 添加背景色，確保內容不透明 */
  z-index: 1; /* 確保在其他內容之上（如果需要） */
}

/* 手機版調整 */
@media (max-width: 768px) {
  .blog-post-header-injected {
    padding-left: var(--vp-content-padding);
    padding-right: var(--vp-content-padding);
    
    /* ******** 估計調整這裡 (手機版) ******* */
    padding-top: calc(var(--vp-nav-height) + 0px); /* 手機版頂部內距也調整 */
    margin-bottom: 0;
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
