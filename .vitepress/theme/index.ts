// docs/.vitepress/theme/index.ts
import MyCustomLayout from './MyCustomLayout.vue'
import './style.css'

// 重新引入 MyVPDoc
import MyVPDoc from '../components/MyVPDoc.vue' // <-- 請將這行改回來

export default {
  Layout: MyCustomLayout,
  enhanceApp({ app }) {
    // 重新啟用 VPDoc 的覆蓋
    app.component('VPDoc', MyVPDoc);
  }
}
