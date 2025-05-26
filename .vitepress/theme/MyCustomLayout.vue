<script setup>
import Theme from 'vitepress/theme'
import { useData } from 'vitepress'
import { computed, ref, onMounted, watch } from 'vue'
import FbComments from '../components/FbComments.vue'
import VotePanel from '../components/VotePanel.vue'

const { frontmatter, page } = useData()

const currentTitle = computed(() =>
  frontmatter.value ? (frontmatter.value.title || '無標題文章') : 'frontmatter.value is UNDEFINED'
)
const currentDisplayDate = computed(() => {
  if (frontmatter.value?.git_date) {
    const date = new Date(frontmatter.value.git_date)
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`
  }
  return ''
})
const isHomePage = computed(() =>
  page.value && (page.value.path === '/' || page.value.path === '/index.html')
)
function hasNoEnglishMsg() {
  return (page.value?.content || '').includes('Sorry, this blog post is not available in English.')
}
const isClient = ref(false)
onMounted(() => {
  isClient.value = true
  watch(page, (val) => {
    console.log('==============[DEBUG: page.value 全部]==============')
    console.log(val)
    console.log('==============[hasNoEnglishMsg()]==============')
    console.log(hasNoEnglishMsg())
    console.log('=======================================================')
  }, { immediate: true, deep: true })
})
</script>

<template>
  <Theme.Layout>
    <template #doc-before>
  <div>{{ frontmatter.title }}</div>
</template>
    <template #doc-after>
      <div>
        <template v-if="page.value && page.value.relativePath && page.value.relativePath.startsWith('blog/')">
          <VotePanel v-if="isClient" />
          <FbComments v-if="isClient" />
        </template>
      </div>
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
