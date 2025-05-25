<script setup>
import Theme from 'vitepress/theme-without-fonts'
import { useData } from 'vitepress'
import { computed, h } from 'vue'
import FbComments from '../components/FbComments.vue' // 引入您的 FbComments 元件

const { page } = useData()

const isHomePage = computed(() => page.value && (page.value.path === '/' || page.value.path === '/index.html'))

const renderLayout = () => {
  return h(Theme.Layout, null, {
    // 這個 default 插槽現在只會渲染從 VPDoc 傳遞過來的內容
    default: () => h('slot'),

    // 注入 FbComments 到 #doc-after 插槽
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
/* 此文件 (MyCustomLayout.vue) 的樣式範圍通常用於佈局組件本身，
   實際文章內容的樣式將由 MyVPDoc.vue 及其內部樣式控制。
   所以這裡應該保持簡潔。 */
</style>
