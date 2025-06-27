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

      // === DocSearch-Hit-source 文字自動取代 ===
      function replaceDocSearchHitSource() {
        document.querySelectorAll('.DocSearch-Hit-source').forEach(el => {
          if (el.textContent === "Documentation") {
            el.textContent = "搜尋結果";
          }
        });
      }

      // === 右側目錄 hover 自動滾動到錨點 ===
      function setupOutlineHoverScroll() {
        let timer = null;

        function handleMouseEnter(e) {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            const href = e.currentTarget.getAttribute('href');
            if (href && href.startsWith('#')) {
              const target = document.querySelector(href);
              if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }
          }, 120);
        }

        function handleMouseLeave() {
          if (timer) clearTimeout(timer);
        }

        function bindEvents() {
          // 先解除舊的監聽，避免重複
          document.querySelectorAll('.VPDocAsideOutline .outline-link').forEach(link => {
            link.removeEventListener('mouseenter', handleMouseEnter);
            link.removeEventListener('mouseleave', handleMouseLeave);
          });
          // 重新綁定
          document.querySelectorAll('.VPDocAsideOutline .outline-link').forEach(link => {
            link.addEventListener('mouseenter', handleMouseEnter);
            link.addEventListener('mouseleave', handleMouseLeave);
          });
        }

        // 初始掛載
        bindEvents();
        // 監控 DOM 變化（例如切換頁面）
        const observer = new MutationObserver(() => {
          bindEvents();
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }

      // 頁面載入時執行
      window.addEventListener('DOMContentLoaded', () => {
        replayIfChanged();
        replaceDocSearchHitSource();
        setupOutlineHoverScroll();
      });
    }
  }
}
