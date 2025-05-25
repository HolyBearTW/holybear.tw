<script setup>
import Theme from 'vitepress/theme-without-fonts'
import { useData } from 'vitepress'
import { computed, h } from 'vue'
import FbComments from '../components/FbComments.vue' // 引入您的 FbComments 元件

const { page } = useData()

const isHomePage = computed(() => page.value.path === '/' || page.value.path === '/index.html')

// 這個 MyCustomLayout.vue 現在只負責渲染 Theme.Layout
// 並把 #doc-after 的 FbComments 邏輯放進去
const renderLayout = () => {
  return h(Theme.Layout, null, {
    // 預設內容 slot 會自動由 VitePress 渲染，
    // 且因為我們覆蓋了 VPDoc，它會自動呼叫 MyVPDoc.vue 來處理內容
    default: () => h('slot'),

    // 注入 FbComments 到 #doc-after slot
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
   但實際文章內容的樣式將由 MyVPDoc.vue 及其內部樣式控制。
   所以這裡可以保持簡潔或移除不必要的樣式。 */
</style>
