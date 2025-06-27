import MyCustomLayout from './MyCustomLayout.vue'
import './style.css'

export default {
  Layout: MyCustomLayout,
  enhanceApp() {
    if (typeof window !== 'undefined') {
      let lastContent = null
      let lastAside = null

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

      // 事件代理方式，支援 aside DOM 被換掉
      function setupOutlineHoverScroll() {
        const aside = document.querySelector('.VPDocAsideOutline') || document.querySelector('aside');
        if (!aside) return;
        // 如果 aside 換了，移除舊的事件代理
        if (lastAside && lastAside !== aside) {
          lastAside.removeEventListener('mouseover', hoverDelegate);
        }
        aside.removeEventListener('mouseover', hoverDelegate);
        aside.addEventListener('mouseover', hoverDelegate);
        lastAside = aside;
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
              // console.log('hover scroll to', href, anchor);
              if (anchor) {
                anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }
          }, 120);
        }
      }

      // 用 MutationObserver 監控 aside 變動（進階，防止 SPA 切頁 DOM 換掉後事件失效）
      function observeAside() {
        const main = document.querySelector('main');
        if (!main) return;
        const obs = new MutationObserver(() => {
          setupOutlineHoverScroll();
        });
        obs.observe(main, { childList: true, subtree: true });
      }

      window.addEventListener('DOMContentLoaded', () => {
        replayIfChanged()
        replaceDocSearchHitSource()
        setupOutlineHoverScroll()
        observeAside()
      })
      window.addEventListener('vitepress:pageview', () => {
        setTimeout(() => {
          replayIfChanged()
          replaceDocSearchHitSource()
          setupOutlineHoverScroll()
        }, 50)
      })
      setInterval(() => {
        replayIfChanged()
        replaceDocSearchHitSource()
      }, 200)
    }
  }
}
