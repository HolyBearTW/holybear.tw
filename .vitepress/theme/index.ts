import MyCustomLayout from './MyCustomLayout.vue'
import './style.css'

export default {
  Layout: MyCustomLayout,
  enhanceApp() {
    if (typeof window !== 'undefined') {
      let lastContent = null;

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

      // 右側目錄 hover scroll 事件代理
      let hoverTimer = null;
      function hoverDelegate(e) {
        const link = e.target.closest('.outline-link');
        if (
          link &&
          link instanceof HTMLElement &&
          link.matches('.outline-link') // 保險
        ) {
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

      // 永遠只對 .VPDocAsideOutline 掛事件代理
      function setupOutlineHoverScroll() {
        const asideOutline = document.querySelector('.VPDocAsideOutline');
        if (!asideOutline) return;
        asideOutline.removeEventListener('mouseover', hoverDelegate);
        asideOutline.addEventListener('mouseover', hoverDelegate);
      }

      window.addEventListener('DOMContentLoaded', () => {
        replayIfChanged();
        replaceDocSearchHitSource();
        setupOutlineHoverScroll();
      });
      window.addEventListener('vitepress:pageview', () => {
        setTimeout(() => {
          replayIfChanged();
          replaceDocSearchHitSource();
          setupOutlineHoverScroll();
        }, 80); // 保險一點
      });
      setInterval(() => {
        replayIfChanged();
        replaceDocSearchHitSource();
      }, 200);
    }
  }
}
