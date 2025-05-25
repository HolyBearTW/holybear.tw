// docs/.vitepress/theme/index.ts
import MyCustomLayout from './MyCustomLayout.vue'
import './style.css'

// 引入我們新的 MyVPDoc 組件
import MyVPDoc from './components/MyVPDoc.vue'

export default {
  Layout: MyCustomLayout,
  // 使用 enhanceApp 函數註冊組件覆蓋
  enhanceApp({ app }) {
    // 告訴 VitePress，當需要渲染 VPDoc 時，使用我們的 MyVPDoc.vue
    app.component('VPDoc', MyVPDoc);
  }
}
