<script setup>
import Theme from 'vitepress/theme'
import { useData } from 'vitepress'
import { computed } from 'vue'
import GiscusComments from '../components/GiscusComments.vue'
import VotePanel from '../components/VotePanel.vue'

const { frontmatter, page } = useData()

const isHomePage = computed(() =>
  page.value && (page.value.path === '/' || page.value.path === '/index.html')
)

const currentTitle = computed(() =>
  frontmatter.value ? (frontmatter.value.title || '無標題文章') : 'frontmatter.value is UNDEFINED'
)

// 用台灣時區 (Asia/Taipei) 顯示日期
const currentDisplayDate = computed(() => {
  if (frontmatter.value?.date) {
    const date = new Date(frontmatter.value.date)
    const twDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
    const yyyy = twDate.getFullYear()
    const mm = String(twDate.getMonth() + 1).padStart(2, '0')
    const dd = String(twDate.getDate()).padStart(2, '0')
    const hh = String(twDate.getHours()).padStart(2, '0')
    const min = String(twDate.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`
  }
  return ''
})
</script>

<template>
  <Theme.Layout>
    <template #doc-before>
      <div v-if="!isHomePage" class="blog-post-header-injected">
        <h1 class="blog-post-title">{{ currentTitle }}</h1>
        <p class="blog-post-date-in-content">
          <template v-if="frontmatter.author">作者：{{ frontmatter.author }}</template>
          <template v-if="frontmatter.author && currentDisplayDate">｜</template>
          <template v-if="currentDisplayDate">{{ currentDisplayDate }}</template>
        </p>
        <!-- 新增標籤區塊 -->
        <div v-if="frontmatter.tag && frontmatter.tag.length" class="blog-post-tags">
          <span class="tag-label">標籤：</span>
          <span v-for="t in frontmatter.tag" :key="t" class="tag">{{ t }}</span>
        </div>
        <div v-if="frontmatter.category && frontmatter.category.length" class="blog-post-category">
          <span class="category-label">分類：</span>
          <span v-for="c in frontmatter.category" :key="c" class="category">{{ c }}</span>
        </div>
      </div>
    </template>
    <template #doc-after>
      <VotePanel />
      <GiscusComments />
    </template>
  </Theme.Layout>
</template>

<style scoped>
:deep(.vp-doc h1:first-of-type) { display: none !important; }
.blog-post-header-injected {
  position: relative;
  width: 100%;
  padding-left: var(--vp-content-padding);
  padding-right: var(--vp-content-padding);
  padding-top: 0;
  padding-bottom: 0;
  margin-bottom: 0;
  box-sizing: border-box;
  background-color: var(--vp-c-bg);
  z-index: 1;
}
:deep(.vp-doc) { padding-top: 0 !important; margin-top: 0 !important; }
:deep(.vp-doc > p:first-of-type) { margin-top: 0; }
@media (max-width: 768px) {
  .blog-post-header-injected {
    padding-left: var(--vp-content-padding);
    padding-right: var(--vp-content-padding);
    padding-top: 0;
    padding-bottom: 0;
    margin-bottom: 0;
  }
  :deep(.vp-doc) { padding-top: 0 !important; margin-top: 0 !important; }
  :deep(.vp-doc > p:first-of-type) { margin-top: 0; }
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
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px dashed var(--vp-c-divider);
}
/* 新增標籤與分類樣式 */
.blog-post-tags, .blog-post-category {
  margin-bottom: 0.5rem;
}
.tag, .category {
  display: inline-block;
  background: var(--vp-c-bg-soft, #f0f0f0);
  color: var(--vp-c-brand-1, #0078e7);
  border-radius: 3px;
  padding: 0 0.5em;
  margin-right: 0.5em;
  font-size: 0.85em;
}
.tag-label, .category-label {
  color: var(--vp-c-text-2);
  font-weight: bold;
  margin-right: 0.5em;
  font-size: 0.85em;
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
