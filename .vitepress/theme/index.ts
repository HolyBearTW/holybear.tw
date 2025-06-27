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

      // 只要 aside outline 內容變動就補事件代理
      function observeOutline() {
        // 先清掉舊 observer
        if (asideObs) asideObs.disconnect();
        // 找到 outline 容器
        const outlineNav = document.querySelector('.VPDocAsideOutline');
        if (!outlineNav) return;
        // 先移除舊事件
        outlineNav.removeEventListener('mouseover', hoverDelegate);
        // 掛事件代理
        outlineNav.addEventListener('mouseover', hoverDelegate);

        // observer 監控內容變動，ul/li/a生成時自動補事件
        asideObs = new MutationObserver(() => {
          outlineNav.removeEventListener('mouseover', hoverDelegate);
          outlineNav.addEventListener('mouseover', hoverDelegate);
        });
        asideObs.observe(outlineNav, { childList: true, subtree: true });
      }

      window.addEventListener('DOMContentLoaded', () => {
        replayIfChanged();
        replaceDocSearchHitSource();
        observeOutline();
      });
      window.addEventListener('vitepress:pageview', () => {
        setTimeout(() => {
          replayIfChanged();
          replaceDocSearchHitSource();
          observeOutline();
        }, 80);
      });
      setInterval(() => {
        replayIfChanged();
        replaceDocSearchHitSource();
      }, 200);
    }
  }
}
