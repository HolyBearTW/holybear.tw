<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useData, useRouter } from 'vitepress'
import { 
  backgroundThemes,
  defaultTheme,
  THEME_STORAGE_KEY, 
  THEME_CHANGE_EVENT,
  getAllThemeIds
} from './background/themes'

const { isDark } = useData()
const router = useRouter()
const currentTheme = ref<string>(defaultTheme)

// 顯示簡單的「敬請期待」訊息（自動或點擊關閉）
function showComingSoon() {
  if (document.getElementById('theme-coming-soon')) return
  const wrapper = document.createElement('div')
  wrapper.id = 'theme-coming-soon'
  wrapper.style.position = 'fixed'
  wrapper.style.left = '0'
  wrapper.style.top = '0'
  wrapper.style.width = '100vw'
  wrapper.style.height = '100vh'
  wrapper.style.display = 'flex'
  wrapper.style.alignItems = 'center'
  wrapper.style.justifyContent = 'center'
  wrapper.style.zIndex = '99999'
  wrapper.style.background = 'rgba(0,0,0,0.45)'
  wrapper.style.cursor = 'pointer'

  const box = document.createElement('div')
  box.textContent = '敬請期待'
  box.style.padding = '18px 28px'
  box.style.borderRadius = '10px'
  box.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))'
  box.style.color = '#fff'
  box.style.fontSize = '20px'
  box.style.fontWeight = '700'
  box.style.boxShadow = '0 8px 40px rgba(0,0,0,0.6)'

  wrapper.appendChild(box)
  wrapper.onclick = () => { wrapper.remove() }
  document.body.appendChild(wrapper)

  setTimeout(() => { try { wrapper.remove() } catch (e) {} }, 5000) // 5 秒後自動消失
}

// 切換主題的核心函數
const changeTheme = (theme: string) => {
  console.log('切換主題到:', theme) // 調試用
  currentTheme.value = theme
  
  // 觸發主題切換事件
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, {
    detail: { theme }
  }))
  
  // 保存到 localStorage
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

// 處理點擊事件 - 使用配置數組
const handleClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  const link = target.closest('a')
  
  if (link) {
    const text = link.textContent || ''
    const href = link.getAttribute('href') || ''
    
    console.log('點擊了:', text, href)
    
    // 遍歷所有主題配置，檢查是否匹配
    for (const [displayName, themeId, icon] of backgroundThemes) {
      const themeHash = `#theme-${themeId}`
      
      // 檢查 href 或文字內容是否匹配
      if (href.includes(themeHash) || text.includes(icon) || text.includes(displayName)) {
        event.preventDefault()
        event.stopPropagation()
        // 若為聖誕節主題，顯示敬請期待並不要切換
        if (themeId === 'christmas') {
          showComingSoon()
          return false
        }
        changeTheme(themeId)
        return false
      }
    }
  }
}

// 處理 hash 變化
const handleHashChange = () => {
  const hash = window.location.hash
  console.log('Hash 變化:', hash)
  
  // 遍歷所有主題配置，檢查 hash 是否匹配
  for (const [_, themeId] of backgroundThemes) {
    if (hash === `#theme-${themeId}`) {
      // 若為聖誕節主題，顯示敬請期待並不要切換
      if (themeId === 'christmas') {
        showComingSoon()
        history.replaceState(null, '', window.location.pathname + window.location.search)
        return
      }
      changeTheme(themeId)
      // 清除 hash
      history.replaceState(null, '', window.location.pathname + window.location.search)
      return
    }
  }
}

// 添加全局樣式來標記當前選中的主題
const updateActiveState = (theme: string) => {
  // 移除所有 active 標記
  document.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href') || ''
    // 檢查是否為主題鏈接
    if (href.includes('#theme-')) {
      link.classList.remove('theme-active')
    }
  })
  
  // 添加當前主題的 active 標記
  document.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href') || ''
    if (href === `#theme-${theme}`) {
      link.classList.add('theme-active')
    }
  })
}

// 監聽主題變化
watch(currentTheme, (newTheme) => {
  updateActiveState(newTheme)
})

onMounted(() => {
  // 載入保存的主題
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  if (savedTheme) {
    currentTheme.value = savedTheme
    updateActiveState(savedTheme)
  }
  
  // 使用捕獲階段監聽，確保能攔截到點擊
  document.addEventListener('click', handleClick, true)
  
  // 監聽 hash 變化
  window.addEventListener('hashchange', handleHashChange)
  
  // 延遲更新狀態，確保 DOM 已渲染
  setTimeout(() => {
    updateActiveState(currentTheme.value)
    // 檢查初始 hash
    handleHashChange()
  }, 500)
  
  console.log('NavThemeHandler 已掛載，當前主題:', currentTheme.value)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClick, true)
  window.removeEventListener('hashchange', handleHashChange)
})
</script>

<template>
  <!-- 這個組件沒有視覺輸出，只負責邏輯處理 -->
  <span class="nav-theme-handler" style="display: none;"></span>
</template>

<style>
/* 全局樣式：為選中的主題添加視覺反饋 */
a.theme-active {
  color: var(--vp-c-brand-1) !important;
  font-weight: 700 !important;
  position: relative;
}

a.theme-active::after {
  content: '';
  margin-left: 6px;
  font-size: 12px;
  color: var(--vp-c-brand-1);
}

/* 主題選項懸停效果 */
.VPFlyout .VPMenu a:has-text('🌊'),
.VPFlyout .VPMenu a:has-text('⚡'),
.VPFlyout .VPMenu a:has-text('🎨') {
  cursor: pointer !important;
  transition: all 0.2s ease !important;
}
</style>
