import MyCustomLayout from './MyCustomLayout.vue'
import './style.css'

export default {
  Layout: MyCustomLayout,
  enhanceApp() {
    if (typeof window !== 'undefined') {
      let lastContent = null;
      let asideObs = null;

      function replayIfChanged() {
        const doc = document.querySelector('.vp-doc');
        if (!doc) return;
        const current = doc.innerHTML;
        if (current !== lastContent) {
          doc.classList.remove('fade-in-up');
          void doc.offsetWidth;
          doc.classList.add('fade-in-up');
          lastContent = current;
        }
      }

      function replaceDocSearchHitSource() {
        document.querySelectorAll('.DocSearch-Hit-source').forEach(el => {
          if (el.textContent === "Documentation") {
            el.textContent = "搜尋結果";
          }
        });
      }

      // hover scroll 事件代理
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

      // 每次都 remove/add 最新 aside 上的事件
      function setupOutlineHoverScroll() {
        // 移除所有 aside 上的事件，避免重複
        document.querySelectorAll('.VPDocAsideOutline, aside').forEach(aside => {
          aside.removeEventListener('mouseover', hoverDelegate);
        });
        // 掛到最新 aside
        const aside = document.querySelector('.VPDocAsideOutline') || document.querySelector('aside');
        if (aside) aside.addEventListener('mouseover', hoverDelegate);
      }

      // 監控 main/main-content，aside 變動就 setup
      function observeAsideParent() {
        // 只要 main 裡有任何變動（包含 aside 被替換），就 setup 一次
        const main = document.querySelector('main') || document.querySelector('.Layout');
        if (!main) return;
        if (asideObs) asideObs.disconnect();
        asideObs = new MutationObserver(() => {
          setupOutlineHoverScroll();
        });
        asideObs.observe(main, { childList: true, subtree: true });
      }

      window.addEventListener('DOMContentLoaded', () => {
        replayIfChanged();
        replaceDocSearchHitSource();
        setupOutlineHoverScroll();
        observeAsideParent();
      });
      window.addEventListener('vitepress:pageview', () => {
        setTimeout(() => {
          replayIfChanged();
          replaceDocSearchHitSource();
          setupOutlineHoverScroll(); // 再 setup 一次
        }, 80); // 保險一點設 80ms
      });
      setInterval(() => {
        replayIfChanged();
        replaceDocSearchHitSource();
      }, 200);
    }
  }
}
