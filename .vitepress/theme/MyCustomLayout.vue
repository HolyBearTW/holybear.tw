<script setup>
import Theme from 'vitepress/theme'
import { useData } from 'vitepress'
import { computed } from 'vue'
import GiscusComments from '../components/GiscusComments.vue'
import VotePanel from '../components/VotePanel.vue'
import ViewCounter from '../components/ViewCounter.vue'

const { frontmatter, page, locale } = useData()

const isHomePage = computed(() =>
  page.value && (page.value.path === '/' || page.value.path === '/index.html')
)

const isEnglish = computed(() => (locale?.value ?? '') === 'en')

const currentTitle = computed(() =>
  frontmatter.value ? (frontmatter.value.title || '無標題文章') : 'frontmatter.value is UNDEFINED'
)

const currentSlug = computed(() =>
  frontmatter.value?.slug || page.value?.path || frontmatter.value?.title || 'unknown'
)

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
          <template v-if="frontmatter.author">
            {{ isEnglish ? 'Author: ' : '作者：' }}{{ frontmatter.author }}
          </template>
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

<!-- 下面這段是內容區 header 樣式，只會作用在頁面內容，不會影響 sidebar -->
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
  font-size: 2rem;
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
  background: #00FFEE;
  color: #000;
  border-radius: 3px;
  padding: 0 0.5em;
  font-size: 0.85em;
}
.tag {
  display: inline-block;
  background: #e3f2fd;
  color: #2077c7;
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
</style>

<!-- 這裡是全域 CSS，直接作用於 sidebar，務必不要加 scoped！ -->
<style>
/* ==== VitePress Sidebar 分組間距適中（有分隔線＋一點點間距）==== */
.group + .group[data-v-a84b7c21] {
  border-top: 1px solid var(--vp-c-divider) !important;
  padding-top: 8px !important;
  margin-top: 8px !important;
}
section.VPSidebarItem.level-0 {
  padding-bottom: 4px !important;
  padding-top: 0 !important;
}
</style>
