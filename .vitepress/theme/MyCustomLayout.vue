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
      <div v-if="!isHomePage" class="post-container">
        <h1 class="post-title">{{ currentTitle }}</h1>
        <div class="post-meta">
          <span class="post-author" v-if="frontmatter.author">作者：{{ frontmatter.author }}</span>
          <span v-if="frontmatter.author && currentDisplayDate">｜</span>
          <span class="post-date" v-if="currentDisplayDate">{{ currentDisplayDate }}</span>
        </div>
        <div class="post-content">
          <Content />
        </div>
        <VotePanel />
        <GiscusComments />
      </div>
    </template>
  </Theme.Layout>
</template>

<style>
/* Blog 內容頁主體容器 */
.post-container {
  max-width: 700px;
  margin: 48px auto 32px auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  padding: 2rem 2.5rem;
}

/* 標題 */
.post-title {
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 1.2rem;
  color: #222;
}

/* 作者、日期資訊 */
.post-meta {
  color: #888;
  font-size: 1rem;
  margin-bottom: 2.2rem;
}

/* 文章內容 */
.post-content {
  font-size: 1.18rem;
  line-height: 1.8;
  color: #222;
}

/* 內容常見元素細節 */
.post-content h2 {
  font-size: 1.7rem;
  margin: 2.5rem 0 1.2rem 0;
  font-weight: bold;
  color: #1a1a1a;
}
.post-content h3 {
  font-size: 1.35rem;
  margin: 2rem 0 1rem 0;
  font-weight: bold;
  color: #1a1a1a;
}
.post-content p,
.post-content ul,
.post-content ol,
.post-content table,
.post-content blockquote,
.post-content pre {
  margin-top: 1rem;
  margin-bottom: 1rem;
}
.post-content img {
  max-width: 100%;
  display: block;
  margin: 1.5rem auto;
  border-radius: 8px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.04);
}
.post-content code {
  background: #f4f4f4;
  border-radius: 4px;
  padding: 0.2em 0.4em;
  font-size: 95%;
}
.post-content pre {
  background: #f6f8fa;
  border-radius: 8px;
  padding: 1.2rem;
  overflow-x: auto;
}
.post-content blockquote {
  border-left: 4px solid #eee;
  background: #fafbfc;
  color: #666;
  margin: 1.5em 0;
  padding: 0.6em 1em;
  border-radius: 6px;
}
.post-content ul,
.post-content ol {
  padding-left: 2em;
}

/* 手機版 RWD */
@media (max-width: 768px) {
  .post-container {
    padding: 1rem 0.5rem;
    border-radius: 0;
    box-shadow: none;
    margin: 20px 0 0 0;
  }
  .post-title {
    font-size: 2rem;
  }
}
</style>
