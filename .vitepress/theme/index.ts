// https://vitepress.dev/guide/custom-theme
import Theme from 'vitepress/theme-without-fonts' // 主題基於這個
import './style.css' // 載入你的樣式

import { h } from 'vue' // 引入 Vue 的 h 函數
import { useRoute } from 'vitepress' // 引入 VitePress 的 useRoute
import FbComments from '../components/FbComments.vue' // 引入你的 FbComments 元件

export default {
  extends: Theme, // 這裡從原本的 `...Theme` 改為 `extends: Theme`
  Layout: () => {
    const route = useRoute() // 取得當前路由資訊
    const isHomePage = route.path === '/' || route.path === '/index.html' // 判斷是否為首頁

    // 使用主題的 Layout (Theme.Layout)
    // 並在這個 Layout 裡面，注入 FbComments 到 'doc-after' slot
    return h(Theme.Layout, null, {
      'doc-after': () => {
        // 如果不是首頁，就顯示 FbComments
        if (!isHomePage) {
          return h(FbComments)
        }
        return null // 如果是首頁，則不顯示任何東西
      }
    })
  }
}
