// https://vitepress.dev/guide/custom-theme
import Theme from 'vitepress/theme-without-fonts' // 主題基於這個
import './style.css' // 載入你的樣式

// 引入我們剛剛建立的自訂佈局組件
import MyCustomLayout from './MyCustomLayout.vue'

export default {
  extends: Theme, // 繼承預設主題的所有配置
  // 將 Layout 指向我們新的 MyCustomLayout 組件
  Layout: MyCustomLayout
}
