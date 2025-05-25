<script setup>
import Theme from 'vitepress/theme-without-fonts'
import { useData } from 'vitepress'
import { computed, h } from 'vue'
import FbComments from '../components/FbComments.vue'

const { page } = useData()

const isHomePage = computed(() => page.value && (page.value.path === '/' || page.value.path === '/index.html'))

// 這裡不需要 isBlogPost 和 displayDate 的複雜邏輯了，
// 因為我們相信 VitePress 預設主題會自動處理標題和日期。

</script>

<template>
  <Theme.Layout>
    <template #doc-before>
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
  現在，由於 VitePress 預設主題已經正確渲染了標題和日期，
  我們不需要隱藏任何由 Markdown 自動生成的 H1。
  所以，移除 :deep(.vp-doc h1:first-of-type) 樣式。
*/
/*
:deep(.vp-doc h1:first-of-type) {
  display: none !important;
}
*/

/* 其他 Markdown 內容元素的間距，如果需要可以保留或調整 */
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
