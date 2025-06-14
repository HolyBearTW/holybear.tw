<script setup>
import Theme from 'vitepress/theme'
import { useData } from 'vitepress'
import { computed } from 'vue'
import GiscusComments from '../components/GiscusComments.vue'
import VotePanel from '../components/VotePanel.vue'
import ViewCounter from '../components/ViewCounter.vue' // 新增這行

const { frontmatter, page } = useData()

const isHomePage = computed(() =>
  page.value && (page.value.path === '/' || page.value.path === '/index.html')
)

const currentTitle = computed(() =>
  frontmatter.value ? (frontmatter.value.title || '無標題文章') : 'frontmatter.value is UNDEFINED'
)

// 唯一識別 key，可根據你需求調整
const currentSlug = computed(() =>
  frontmatter.value?.slug || page.value?.path || frontmatter.value?.title || 'unknown'
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
        <div
          v-if="(frontmatter.category && frontmatter.category.length) || (frontmatter.tag && frontmatter.tag.length)"
          class="blog-post-meta-row"
        >
          <span
            v-for="c in frontmatter.category"
            :key="'cat-' + c"
            class="category"
          >{{ c }}</span>
          <span
            v-for="t in frontmatter.tag"
            :key="'tag-' + t"
            class="tag"
          >{{ t }}</span>
        </div>
        <p class="blog-post-date-in-content">
          <template v-if="frontmatter.author">作者：{{ frontmatter.author }}</template>
          <template v-if="frontmatter.author && currentDisplayDate">｜</template>
          <template v-if="currentDisplayDate">{{ currentDisplayDate }}</template>
          <span style="float:right;">
            <ClientOnly>
              <ViewCounter :slug="currentSlug" />
            </ClientOnly>
          </span>
        </p>
        <div class="blog-post-date-divider"></div>
      </div>
    </template>
    <template #doc-after>
    <ClientOnly>
      <VotePanel />
      <GiscusComments />
    </ClientOnly>
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
  font-size: 2rem; /* 小一點 */
  line-height: 1.2;
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: var(--vp-c-text-1);
}
.blog-post-meta-row {
  margin-bottom: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
}
.category {
  display: inline-block;
  background: #00FFEE;  /* 主色系背景 */
  color: #000;       /* 黑色字 */
  border-radius: 3px;
  padding: 0 0.5em;
  font-size: 0.85em;
}
.tag {
  display: inline-block;
  background: #e3f2fd;  /* 藍色淡色背景 */
  color: #2077c7;       /* 藍色字 */
  border-radius: 3px;
  padding: 0 0.5em;
  font-size: 0.85em;
}
.blog-post-date-in-content {
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  margin-top: 0;
  margin-bottom: 0.2rem;
}
.blog-post-date-divider {
  border-bottom: 1px dashed var(--vp-c-divider);
  margin-bottom: 0.5rem;
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
/* vitepress 側邊欄 */
.VPDocAside .VPSidebarGroup {
margin-bottom: 8px !important; /* 原本可能是 24px，可自行調整 */
}
</style>
