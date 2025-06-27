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

      // --- 右側目錄 hover ---
      let hoverTimer = null
      function handleMouseEnter(e) {
        if (hoverTimer) clearTimeout(hoverTimer)
        hoverTimer = setTimeout(() => {
          // 型別檢查，僅作用於 <a>
          const target = e.currentTarget
          if (target && target.tagName === 'A') {
            const href = target.getAttribute('href')
            // 只滾動錨點
            if (href && href.startsWith('#')) {
              const anchor = document.querySelector(href)
              if (anchor) {
                anchor.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }
          }
        }, 120)
      }
      function handleMouseLeave() {
        if (hoverTimer) clearTimeout(hoverTimer)
      }
      function setupOutlineHoverScroll() {
        document.querySelectorAll('.outline-link').forEach(link => {
          link.removeEventListener('mouseenter', handleMouseEnter)
          link.removeEventListener('mouseleave', handleMouseLeave)
          link.addEventListener('mouseenter', handleMouseEnter)
          link.addEventListener('mouseleave', handleMouseLeave)
        })
      }

      // 初始化/切頁時都補一次
      window.addEventListener('DOMContentLoaded', () => {
        replayIfChanged()
        replaceDocSearchHitSource()
        setupOutlineHoverScroll()
      })
      window.addEventListener('vitepress:pageview', () => {
        setTimeout(() => {
          replayIfChanged()
          replaceDocSearchHitSource()
          setupOutlineHoverScroll()
        }, 30)
      })
      setInterval(() => {
        replayIfChanged()
        replaceDocSearchHitSource()
        // 不要 setupOutlineHoverScroll
      }, 200)
    }
  }
}
