import MyCustomLayout from './MyCustomLayout.vue'
import './style.css'

export default {
  Layout: MyCustomLayout,
  enhanceApp() {
    if (typeof window !== 'undefined') {
      let lastContent = null

      function replayIfChanged() {
        const doc = document.querySelector('.vp-doc')
        if (!doc) return
        const current = doc.innerHTML
        if (current !== lastContent) {
          doc.classList.remove('fade-in-up')
          void doc.offsetWidth
          doc.classList.add('fade-in-up')
          lastContent = current
        }
      }

      function replaceDocSearchHitSource() {
        document.querySelectorAll('.DocSearch-Hit-source').forEach(el => {
          if (el.textContent === "Documentation") {
            el.textContent = "搜尋結果"
          }
        })
      }

      // 右側目錄 hover
      let hoverTimer = null
      function handleMouseEnter(e) {
        if (hoverTimer) clearTimeout(hoverTimer)
        hoverTimer = setTimeout(() => {
          const href = e.currentTarget.getAttribute('href')
          if (href && href.startsWith('#')) {
            const target = document.querySelector(href)
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }
        }, 120)
      }
      function handleMouseLeave() {
        if (hoverTimer) clearTimeout(hoverTimer)
      }
      function setupOutlineHoverScroll() {
        document.querySelectorAll('.VPDocAsideOutline .outline-link').forEach(link => {
          link.removeEventListener('mouseenter', handleMouseEnter)
          link.removeEventListener('mouseleave', handleMouseLeave)
          link.addEventListener('mouseenter', handleMouseEnter)
          link.addEventListener('mouseleave', handleMouseLeave)
        })
      }

      // 用 observer 監控右側 outline DOM，有變化就掛事件
      function observeOutline() {
        const aside = document.querySelector('.VPDocAsideOutline')
        if (!aside) return
        // 初次也掛一次
        setupOutlineHoverScroll()
        const observer = new MutationObserver(() => {
          setupOutlineHoverScroll()
        })
        observer.observe(aside, { childList: true, subtree: true })
      }

      window.addEventListener('DOMContentLoaded', () => {
        replayIfChanged()
        replaceDocSearchHitSource()
        observeOutline()
      })

      window.addEventListener('vitepress:pageview', () => {
        setTimeout(() => {
          replayIfChanged()
          replaceDocSearchHitSource()
          observeOutline()
        }, 30)
      })

      setInterval(() => {
        replayIfChanged()
        replaceDocSearchHitSource()
        // 不要呼叫 observeOutline 也不要呼叫 setupOutlineHoverScroll
      }, 200)
    }
  }
}
