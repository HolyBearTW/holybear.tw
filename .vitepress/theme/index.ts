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

      // 通用右側 outline hover 事件
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
        // 這邊選所有右側 outline 的 a[href^="#"]
        document.querySelectorAll('aside nav a[href^="#"]').forEach(link => {
          link.removeEventListener('mouseenter', handleMouseEnter)
          link.removeEventListener('mouseleave', handleMouseLeave)
          link.addEventListener('mouseenter', handleMouseEnter)
          link.addEventListener('mouseleave', handleMouseLeave)
        })
      }

      // observer 監控 aside（右側 outline）
      function observeOutline() {
        const aside = document.querySelector('aside')
        if (!aside) return
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
      }, 200)
    }
  }
}
