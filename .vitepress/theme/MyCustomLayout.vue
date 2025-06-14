<script setup>
import Theme from 'vitepress/theme'
import { useData } from 'vitepress'
import { computed, ref, onMounted, nextTick } from 'vue'
import GiscusComments from '../components/GiscusComments.vue'
import VotePanel from '../components/VotePanel.vue'
import ViewCounter from '../components/ViewCounter.vue'

const { frontmatter, page } = useData()
const imagesLoaded = ref(false)
const allContentReady = ref(false)
const isFirstVisit = ref(true)
const contentLoaded = ref(false)

// 檢查是否為首次訪問
onMounted(async () => {
  const pageKey = `visited-${page.value.path}`
  
  if (sessionStorage.getItem(pageKey)) {
    isFirstVisit.value = false
    contentLoaded.value = true
    allContentReady.value = true
  } else {
    // 首次訪問 - 延遲等待 DOM 完全渲染後再檢查圖片
    setTimeout(async () => {
      await waitForImages()
      
      setTimeout(() => {
        contentLoaded.value = true
        allContentReady.value = true
        sessionStorage.setItem(pageKey, 'true')
      }, 300)
    }, 100)
  }
})

// 等待所有圖片載入完成
async function waitForImages() {
  return new Promise((resolve) => {
    const tryWait = (attempts = 0) => {
      nextTick(() => {
        const images = document.querySelectorAll('.vp-doc img')
        
        if (images.length === 0 && attempts < 5) {
          setTimeout(() => tryWait(attempts + 1), 200)
          return
        }
        
        if (images.length === 0) {
          resolve()
          return
        }
        
        let loadedCount = 0
        const totalImages = images.length
        
        const checkComplete = () => {
          loadedCount++
          if (loadedCount >= totalImages) {
            imagesLoaded.value = true
            resolve()
          }
        }
        
        images.forEach((img) => {
          if (img.complete && img.naturalHeight !== 0) {
            checkComplete()
          } else {
            img.addEventListener('load', checkComplete)
            img.addEventListener('error', checkComplete)
          }
        })
        
        setTimeout(() => {
          imagesLoaded.value = true
          resolve()
        }, 8000)
      })
    }
    
    tryWait()
  })
}

const isHomePage = computed(() =>
  page.value && (page.value.path === '/' || page.value.path === '/index.html')
)

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
    <!-- 首次加載時的臨時加載畫面 -->
    <template v-if="isFirstVisit && !allContentReady && !isHomePage">
      <div class="content-loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">載入內容中...</div>
        <div class="loading-progress">請稍候，正在準備文章內容...</div>
      </div>
    </template>
    
    <!-- 文章頂部內容 -->
    <template #doc-before>
      <div v-if="!isHomePage" 
           class="blog-post-header-injected" 
           :class="{ 'content-hidden': isFirstVisit && !allContentReady }">
        <h1 class="blog-post-title">{{ currentTitle }}</h1>
        <div
          v-if="frontmatter && ((Array.isArray(frontmatter.category) && frontmatter.category.length) || 
               (Array.isArray(frontmatter.tag) && frontmatter.tag.length))"
          class="blog-post-meta-row"
        >
          <span
            v-for="c in (Array.isArray(frontmatter.category) ? frontmatter.category : [])"
            :key="'cat-' + c"
            class="category"
          >{{ c }}</span>
          <span
            v-for="t in (Array.isArray(frontmatter.tag) ? frontmatter.tag : [])"
            :key="'tag-' + t"
            class="tag"
          >{{ t }}</span>
        </div>
        <p class="blog-post-date-in-content">
          <template v-if="frontmatter && frontmatter.author">作者：{{ frontmatter.author }}</template>
          <template v-if="frontmatter && frontmatter.author && currentDisplayDate">｜</template>
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
    
    <!-- 文章底部內容 -->
    <template #doc-after>
      <div :class="{ 'content-hidden': isFirstVisit && !allContentReady }">
        <ClientOnly>
          <VotePanel :articleId="currentSlug" />
        </ClientOnly>
      </div>
    </template>

    <!-- Giscus 評論區 -->
    <template #doc-footer>
      <div :class="{ 'content-hidden': isFirstVisit && !allContentReady }">
        <ClientOnly>
          <GiscusComments :slug="currentSlug" />
        </ClientOnly>
      </div>
    </template>
  </Theme.Layout>
</template>

<style scoped>
/* 新增 loading 相關樣式 */
.content-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--vp-c-bg);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--vp-c-divider);
  border-top: 4px solid var(--vp-c-brand);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin-top: 16px;
  font-size: 16px;
  color: var(--vp-c-text-1);
}

.loading-progress {
  margin-top: 10px;
  font-size: 14px;
  color: var(--vp-c-text-2);
  text-align: center;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.content-hidden {
  visibility: hidden !important;
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
}

/* 原有的 CSS */
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
