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
        if (lastContent !== current) {
          // 這裡可以加動畫或其他效果
          lastContent = current;
        }
      }

      // 初次進站
      window.addEventListener('DOMContentLoaded', replayIfChanged);

      // SPA 切換（VitePress 1.x/0.x）
      window.addEventListener('vitepress:pageview', () => {
        setTimeout(replayIfChanged, 30);
      });

      // 極端主題 fallback，每 200ms 比對一次內容（只要內容一變就動動畫）
      setInterval(replayIfChanged, 200);
    }
  }
}
