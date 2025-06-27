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
        document.querySelectorAll('.VPDocAsideOutline .outline-link').forEach(link => {
          // 先移除之前的監聽，避免重複
          link.removeEventListener('mouseenter', handleMouseEnter);
          link.removeEventListener('mouseleave', handleMouseLeave);
          // 再加上新的
          link.addEventListener('mouseenter', handleMouseEnter);
          link.addEventListener('mouseleave', handleMouseLeave);
        });
      }
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

      // 初次進站
      window.addEventListener('DOMContentLoaded', () => {
        replayIfChanged();
        replaceDocSearchHitSource();
        setupOutlineHoverScroll();
      });

      // SPA 切換（VitePress 1.x/0.x）
      window.addEventListener('vitepress:pageview', () => {
        setTimeout(() => {
          replayIfChanged();
          replaceDocSearchHitSource();
          setupOutlineHoverScroll(); // <<=== 新增這裡
        }, 30);
      });

      // 極端主題 fallback，每 200ms 比對一次內容（只要內容一變就動動畫＋補丁取代）
      setInterval(() => {
        replayIfChanged();
        replaceDocSearchHitSource();
        // 這裡不要呼叫 setupOutlineHoverScroll，否則會不斷重複掛事件！
      }, 200);
    }
  }
}
