import DefaultTheme from 'vitepress/theme'
import { onMounted } from 'vue'
import './style.css'

// === fade-in-up 動畫效果 ===
let lastContent = ''
function replayIfChanged() {
  const doc = document.querySelector('.vp-doc')
  if (!doc) return
  const current = doc.innerHTML
  if (current !== lastContent) {
    doc.classList.remove('fade-in-up')
    // 強制 reflow
    void (doc as HTMLElement).offsetWidth
    doc.classList.add('fade-in-up')
    lastContent = current
  }
}

// === DocSearch-Hit-source 文字自動取代 ===
function replaceDocSearchHitSource() {
  document.querySelectorAll('.DocSearch-Hit-source').forEach(el => {
    if (el.textContent === "Documentation") {
      el.textContent = "搜尋結果"
    }
  })
}

// === 右側目錄 hover 自動滾動到錨點 ===
function setupOutlineHoverScroll() {
  // debounce 避免快速滑過不停跳動
  let timer: ReturnType<typeof setTimeout> | null = null

  // 每次掛載時都重新掛事件，避免 SPA 切換文章時失效
  function bindEvents() {
    // 先移除舊的監聽
    document.querySelectorAll('.VPDocAsideOutline .outline-link').forEach(link => {
      link.removeEventListener('mouseenter', handleMouseEnter as EventListener)
      link.removeEventListener('mouseleave', handleMouseLeave as EventListener)
    })
    // 再掛上新的
    document.querySelectorAll('.VPDocAsideOutline .outline-link').forEach(link => {
      link.addEventListener('mouseenter', handleMouseEnter as EventListener)
      link.addEventListener('mouseleave', handleMouseLeave as EventListener)
    })
  }

  function handleMouseEnter(this: Element) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      const href = (this as HTMLAnchorElement).getAttribute('href')
      if (href && href.startsWith('#')) {
        const target = document.querySelector(href)
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }
    }, 120)
  }

  function handleMouseLeave() {
    if (timer) clearTimeout(timer)
  }

  // 初始掛載
  bindEvents()
  // 每次路由切換或 DOM 更新後再掛一次
  const observer = new MutationObserver(() => {
    bindEvents()
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

export default {
  ...DefaultTheme,
  enhanceApp({ app, router, siteData }) {
    // 你可以根據需要在這裡擴展
  },
  setup() {
    onMounted(() => {
      // fade-in 動畫
      replayIfChanged()
      // 搜尋結果字串替換
      replaceDocSearchHitSource()
      // 右側目錄 hover 滾動
      setupOutlineHoverScroll()
    })
  }
}
