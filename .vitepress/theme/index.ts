// docs/.vitepress/theme/index.ts
import MyCustomLayout from './MyCustomLayout.vue'
import './style.css' // 載入你的樣式

export default {
  // 直接匯出 Layout 元件，而不是使用 extends
  // MyCustomLayout.vue 內部會處理如何使用 DefaultTheme.Layout
  Layout: MyCustomLayout,

  // 如果您有其他的 VitePress 主題相關的配置，可以在這裡添加
  // 例如 enhanceApp (用於註冊全局組件或插件)
  // enhanceApp({ app, router, siteData }) {
  //   // app.component('MyGlobalComponent', MyGlobalComponent)
  // }
}
