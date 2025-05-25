// docs/.vitepress/theme/index.ts
import MyCustomLayout from './MyCustomLayout.vue'
import './style.css'

export default {
  Layout: MyCustomLayout,
  // 確保這裡沒有 enhanceApp 或 extends Theme 的設定
}
