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
:deep(.vp-doc h1:first-of-type) {
  display: none !important;
}

:deep(.vp-doc) {
  padding-top: 0;
  margin-top: 0;
}

.blog-post-header-injected {
  position: relative;
  top: auto;
  left: auto;
  width: 100%;
  padding-left: var(--vp-content-padding);
  padding-right: var(--vp-content-padding);
  
  /* 調整這裡：減少頂部內距，使其更往上 */
  padding-top: calc(var(--vp-nav-height) + 0px); /* 從 +16px 改為 +0px */
  
  padding-bottom: 2rem;
  margin-bottom: -100px; /* 這個值可能需要微調 */
  box-sizing: border-box;
  background-color: var(--vp-c-bg);
  z-index: 1;
}

@media (max-width: 768px) {
  .blog-post-header-injected {
    padding-left: var(--vp-content-padding);
    padding-right: var(--vp-content-padding);
    
    /* 手機版也調整這裡 */
    padding-top: calc(var(--vp-nav-height) + 0px); /* 從 +16px 改為 +0px */
    
    margin-bottom: -80px; /* 範例值，可能需要根據手機實際顯示調整 */
  }
  :deep(.vp-doc) {
    padding-top: 0;
    margin-top: 0;
  }
}

.blog-post-title {
  font-size: 2.5rem;
  line-height: 1.2;
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: var(--vp-c-text-1);
}

.blog-post-date-in-content {
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  margin-top: 0;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px dashed var(--vp-c-divider);
}

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
