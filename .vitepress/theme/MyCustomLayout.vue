<script setup>
import Theme from 'vitepress/theme-without-fonts'
import { useData } from 'vitepress'
import { computed, ref, onMounted } from 'vue'
import FbComments from '../components/FbComments.vue' // 引入您的 FbComments 元件

const { frontmatter, page } = useData() // 獲取文章 Front Matter 和頁面資訊

// 使用 ref 儲存最終的數據狀態，確保在客戶端 Hydration 後數據可用
const currentRelativePath = ref('N/A');
const currentIsBlogPost = ref(false);
const currentTitle = ref('N/A');
const currentFrontmatterDate = ref('N/A');
const currentDisplayDate = ref(null);

// 在組件掛載後 (客戶端)，確保數據已載入並更新 ref 變數
onMounted(() => {
  // 這裡的 page.value 和 frontmatter.value 應該是最終確定的值
  currentRelativePath.value = page.value ? page.value.relativePath : 'page.value is UNDEFINED';
  currentTitle.value = frontmatter.value ? (frontmatter.value.title || '無標題文章') : 'frontmatter.value is UNDEFINED';
  currentFrontmatterDate.value = frontmatter.value ? (frontmatter.value.date ? frontmatter.value.date.toString() : 'No date in frontmatter') : 'frontmatter.value is UNDEFINED';

  // 重新計算 isBlogPost
  currentIsBlogPost.value = page.value && page.value.relativePath &&
                             page.value.relativePath.startsWith('blog/') &&
                             !page.value.relativePath.endsWith('blog/index.md');
  
  // 重新計算 displayDate
  if (currentIsBlogPost.value && frontmatter.value && frontmatter.value.date) {
    const date = new Date(frontmatter.value.date);
    currentDisplayDate.value = date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
  } else {
    currentDisplayDate.value = null;
  }
});


// 判斷是否為首頁 (確保 page.value 存在)
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
  由於我們在 #doc-before 插槽中渲染了自訂的 H1 標題。
  VitePress 預設會從 Front Matter 的 `title` 生成一個 `<h1>` 標籤，
  這個 `<h1>` 會位於 `.vp-doc` 內部。我們需要隱藏這個 H1，避免重複。
*/
:deep(.vp-doc h1:first-of-type) {
  display: none !important; /* 強制隱藏，確保不被其他樣式覆蓋 */
}

/* 調整 Markdown 內容區塊的頂部邊距，為我們注入的標題和日期留出空間 */
:deep(.vp-doc) {
  padding-top: 180px; /* 根據實際效果調整，這是讓下方內容往下移的距離 */
  margin-top: -100px; /* 嘗試用負邊距將整個 .vp-doc 往上拉，與頂部對齊 */
}

/* .blog-post-header-injected 是包裹客製化標題和日期的 div */
.blog-post-header-injected {
  position: absolute; /* 絕對定位 */
  top: 0; /* 位於頁面頂部 */
  left: 0;
  width: 100%;
  padding-top: calc(var(--vp-nav-height) + 16px); /* 加上導航欄高度 */
  padding-left: var(--vp-sidebar-width); /* 加上側邊欄寬度 */
  box-sizing: border-box; /* 確保 padding 不影響寬度 */
  z-index: 10; /* 確保在其他內容之上 */
  background-color: var(--vp-c-bg); /* 添加背景色，避免透視下方的內容 */
}

/* 手機版調整 */
@media (max-width: 768px) {
  .blog-post-header-injected {
    position: relative; /* 手機版改為相對定位，避免脫離文檔流 */
    padding-left: var(--vp-content-padding); /* 調整左右內距 */
    padding-right: var(--vp-content-padding);
    padding-top: calc(var(--vp-nav-height) + 16px); /* 導航欄下方的間距 */
    margin-bottom: 2rem; /* 標題日期區塊下方留出空間 */
    box-sizing: border-box;
    left: auto;
    top: auto;
    width: auto; /* 寬度自動調整 */
  }
  /* 手機版下，Markdown 內容區塊不需要額外的 padding-top */
  :deep(.vp-doc) {
    padding-top: 0;
    margin-top: 0; /* 手機版移除負邊距 */
  }
}

/* 客製化的標題樣式 */
.blog-post-title {
  font-size: 2.5rem; /* 標題大小，可調整 */
  line-height: 1.2;
  margin-top: 0; /* 確保沒有多餘的上方外距 */
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
