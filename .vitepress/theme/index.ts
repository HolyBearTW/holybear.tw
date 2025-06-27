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

      // 右側目錄 hover scroll 事件代理
      let hoverTimer = null;
      function hoverDelegate(e) {
        const link = e.target.closest('.outline-link');
        if (link && link instanceof HTMLElement) {
          if (hoverTimer) clearTimeout(hoverTimer);
          hoverTimer = setTimeout(() => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
              const anchor = document.querySelector(href);
              if (anchor) {
                anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }
          }, 120);
        }
      }

      // 用 MutationObserver 保證事件永遠掛在最新 aside
      let asideObs = null
      function observeAsideAndBind() {
        // 先拔掉所有舊 aside 的事件
        document.querySelectorAll('.VPDocAsideOutline, aside').forEach(aside => {
          aside.removeEventListener('mouseover', hoverDelegate)
        })
        // 幫現有 aside 補事件
        const aside = document.querySelector('.VPDocAsideOutline') || document.querySelector('aside');
        if (aside) aside.addEventListener('mouseover', hoverDelegate);

        // observer 本身只需啟動一次
        if (asideObs) asideObs.disconnect();
        const main = document.querySelector('main');
        if (main) {
          asideObs = new MutationObserver(() => {
            // aside DOM 變動時重新掛事件
            document.querySelectorAll('.VPDocAsideOutline, aside').forEach(aside => {
              aside.removeEventListener('mouseover', hoverDelegate)
            })
            const aside = document.querySelector('.VPDocAsideOutline') || document.querySelector('aside');
            if (aside) aside.addEventListener('mouseover', hoverDelegate);
          });
          asideObs.observe(main, { childList: true, subtree: true });
        }
      }

      window.addEventListener('DOMContentLoaded', () => {
        replayIfChanged()
        replaceDocSearchHitSource()
        observeAsideAndBind()
      })
      window.addEventListener('vitepress:pageview', () => {
        setTimeout(() => {
          replayIfChanged()
          replaceDocSearchHitSource()
          observeAsideAndBind()
        }, 30)
      })
      setInterval(() => {
        replayIfChanged()
        replaceDocSearchHitSource()
      }, 200)
    }
  }
}
