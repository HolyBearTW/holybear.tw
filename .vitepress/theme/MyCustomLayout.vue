<script setup>
import Theme from 'vitepress/theme-without-fonts'
import { useData } from 'vitepress'
import { computed, h } from 'vue'
import FbComments from '../components/FbComments.vue'

const { frontmatter, page } = useData()

const isHomePage = computed(() => page.value.path === '/' || page.value.path === '/index.html')

const isBlogPost = computed(() => {
  const isBlog = page.value.relativePath.startsWith('blog/') && !page.value.relativePath.endsWith('blog/index.md');

  // --- 請將以下偵錯訊息加入您的程式碼中 ---
  // 這些訊息將會被渲染到 HTML 頁面中，這樣我才能看到
  console.log('--- Debugging MyCustomLayout.vue (Page Data) ---');
  console.log('page.value.relativePath:', page.value.relativePath);
  console.log('isBlogPost calculated:', isBlog);
  console.log('frontmatter.value.title:', frontmatter.value.title);
  console.log('frontmatter.value.date:', frontmatter.value.date);
  console.log('------------------------------------');
  // ----------------------------------------------------

  return isBlog;
})

const displayDate = computed(() => {
  if (isBlogPost.value && frontmatter.value.date) {
    const date = new Date(frontmatter.value.date)
    return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  return null
})

const renderLayout = () => {
  return h(Theme.Layout, null, {
    default: () => {
      // --- 在這裡也加入偵錯訊息，直接渲染到 HTML 中 ---
      const debugInfo = [
        h('p', null, `Debug: relativePath = ${page.value.relativePath}`),
        h('p', null, `Debug: isBlogPost = ${isBlogPost.value}`),
        h('p', null, `Debug: frontmatter.title = ${frontmatter.value.title}`),
        h('p', null, `Debug: frontmatter.date = ${frontmatter.value.date}`),
        h('hr') // 分隔線，方便閱讀
      ];
      // --------------------------------------------------

      if (isBlogPost.value) {
        return h('div', { class: 'blog-post-content-wrapper' }, [
          ...debugInfo, // 將偵錯訊息放在最前面
          h('h1', { class: 'blog-post-title' }, frontmatter.value.title || '無標題文章'),
          displayDate.value
            ? h('p', { class: 'blog-post-date-in-content' }, `發布日期：${displayDate.value}`)
            : null,
          h(Theme.Content)
        ])
      }
      // 對於非部落格文章，也輸出基本偵錯訊息，然後渲染原始內容
      return h('div', null, [
        ...debugInfo, // 將偵錯訊息放在最前面
        h(Theme.Content)
      ]);
    },
    'doc-after': () => {
      if (!isHomePage.value) {
        return h(FbComments)
      }
      return null
    }
  })
}
</script>

<template>
  <renderLayout />
</template>

<style scoped>
/* ... 樣式保持不變 ... */
</style>
