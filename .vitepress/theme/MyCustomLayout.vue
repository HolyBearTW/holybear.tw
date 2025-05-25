<script setup>
import Theme from 'vitepress/theme-without-fonts'
import { useData } from 'vitepress'
import { computed, ref, onMounted } from 'vue'
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

const isEnBlogPage = computed(() => {
  const path = (page.value?.path || '').toLowerCase()
  return path.startsWith('/en/blog')
})

// 這個 flag 只在 client 端設為 true
const isClient = ref(false)
onMounted(() => {
  isClient.value = true
})
</script>

<template>
  <Theme.Layout>
    <template #doc-before>
      <p v-if="isEnBlogPage" class="en-blog-warning">
        Sorry, the blog does not support English.<br>
        <a href="javascript:history.back()">Click here to go back.</a>
      </p>
      <div v-else-if="currentTitle" class="blog-post-header-injected">
        <h1 class="blog-post-title">{{ currentTitle }}</h1>
        <p v-if="frontmatter.author || currentDisplayDate" class="blog-post-date-in-content">
          作者：{{ frontmatter.author }}<span v-if="frontmatter.author && currentDisplayDate">｜</span>{{ currentDisplayDate }}
        </p>
      </div>
    </template>

    <template #doc-after>
      <div v-if="isClient && !isHomePage && !isEnBlogPage">
        <VotePanel />
        <FbComments />
      </div>
    </template>
  </Theme.Layout>
</template>

<style scoped>
:deep(.vp-doc h1:first-of-type) {
  display: none !important;
}
.en-blog-warning {
  background: #fffbcc;
  color: #b07d00;
  border: 1px solid #ffe58f;
  padding: 1.5em;
  margin: 2em 0;
  text-align: center;
  border-radius: 8px;
  font-size: 1.2em;
}
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

:deep(.vp-doc) {
  padding-top: 0 !important;
  margin-top: 0 !important;
}

/* 讓內文首段更貼近 header */
:deep(.vp-doc > p:first-of-type) {
  margin-top: 0;
}

@media (max-width: 768px) {
  .blog-post-header-injected {
    padding-left: var(--vp-content-padding);
    padding-right: var(--vp-content-padding);
    padding-top: 0;
    padding-bottom: 0;
    margin-bottom: 0;
  }
  :deep(.vp-doc) {
    padding-top: 0 !important;
    margin-top: 0 !important;
  }
  :deep(.vp-doc > p:first-of-type) {
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
