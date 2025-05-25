// docs/.vitepress/theme/index.ts
import MyCustomLayout from './MyCustomLayout.vue'
import './style.css'

// 移除 MyVPDoc 相關的引用和 enhanceApp
// import MyVPDoc from '../components/MyVPDoc.vue' // 刪除這行

export default {
  Layout: MyCustomLayout,
  // 刪除 enhanceApp 區塊
  // enhanceApp({ app }) {
  //   app.component('VPDoc', MyVPDoc);
  // }
}
