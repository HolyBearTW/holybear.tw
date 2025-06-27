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

      // 事件代理方式
      function setupOutlineHoverScroll() {
        const aside = document.querySelector('.VPDocAsideOutline') || document.querySelector('aside');
        if (!aside) return;
        aside.removeEventListener('mouseover', hoverDelegate);
        aside.addEventListener('mouseover', hoverDelegate);
      }
      let hoverTimer = null;
      function hoverDelegate(e) {
        const link = e.target.closest('.outline-link');
        if (link && link instanceof HTMLElement) {
          if (hoverTimer) clearTimeout(hoverTimer);
          hoverTimer = setTimeout(() => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
              const anchor = document.querySelector(href);
              console.log('hover scroll to', href, anchor);
              if (anchor) {
                anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }
          }, 120);
        }
      }

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
      }, 200)
    }
  }
}
