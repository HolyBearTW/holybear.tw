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

      // 初次進站
      window.addEventListener('DOMContentLoaded', () => {
        replayIfChanged();
        replaceDocSearchHitSource();
      });

      // SPA 切換（VitePress 1.x/0.x）
      window.addEventListener('vitepress:pageview', () => {
        setTimeout(() => {
          replayIfChanged();
          replaceDocSearchHitSource();
        }, 30);
      });

      // 極端主題 fallback，每 200ms 比對一次內容（只要內容一變就動動畫＋補丁取代）
      setInterval(() => {
        replayIfChanged();
        replaceDocSearchHitSource();
      }, 200);
    }
  }
}
