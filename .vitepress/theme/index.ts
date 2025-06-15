import Theme from 'vitepress/theme'
import './style.css'
import MyCustomLayout from './MyCustomLayout.vue'

export default {
  ...Theme,
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
      window.addEventListener('DOMContentLoaded', replayIfChanged);
      window.addEventListener('vitepress:pageview', () => {
        setTimeout(replayIfChanged, 30);
      });
      setInterval(replayIfChanged, 200);
    }
  }
}
