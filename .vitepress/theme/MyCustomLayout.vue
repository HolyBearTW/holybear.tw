<script setup>
import Theme from 'vitepress/theme'
import { useData, useRoute } from 'vitepress'
import { computed, onMounted, watch } from 'vue'
import GiscusComments from '../components/GiscusComments.vue'
import VotePanel from '../components/VotePanel.vue'
import ViewCounter from '../components/ViewCounter.vue'

const { frontmatter, page } = useData()
const route = useRoute()

function triggerContentAnimation() {
  setTimeout(() => {
    requestAnimationFrame(() => {
      const el = document.querySelector('.vp-doc')
      if (el) {
        el.classList.remove('slide-in')
        void el.offsetWidth
        el.classList.add('slide-in')
      }
    })
  }, 80)
}
onMounted(triggerContentAnimation)
watch(() => route.path, triggerContentAnimation)

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
    const dd = String(twDate.getDate() + 1).padStart(2, '0')
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
    <template #doc>
      <slot name="doc" />
    </template>
    <template #doc-after>
      <ClientOnly>
        <VotePanel />
        <GiscusComments />
      </ClientOnly>
    </template>
  </Theme.Layout>
</template>

<style>
.VPDoc .vp-doc.slide-in {
  animation: contentSlideIn 0.8s cubic-bezier(.4,0,.2,1);
}
@keyframes contentSlideIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
