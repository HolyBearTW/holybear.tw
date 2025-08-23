import MyCustomLayout from './MyCustomLayout.vue'
import './style.css'

export default {
    Layout: MyCustomLayout,
    enhanceApp({ router }) {
        if (typeof document === 'undefined') return; // SSR 階段直接跳過

        // 恢復 is-blog-page 判斷，只加在文章內頁
        function isBlogPage(path) {
            // 只針對 /blog/xxxx 文章頁（不是 /blog/ 或 /blog/index 或 /blog/blog_list）
            return /^\/(en\/)?blog\/(?!index$|blog_list$)[^/]+(?:\.html)?(?:[?#].*)?$/.test(path);
        }
        function forceBlogClass() {
            // 保留原有 class，確保最多只有一個 is-blog-page
            const cls = document.body.className.split(' ').filter(c => c && c !== 'is-blog-page');
            if (isBlogPage(window.location.pathname)) {
                cls.push('is-blog-page');
            }
            document.body.className = cls.join(' ');
        }
        forceBlogClass();
        setInterval(forceBlogClass, 200);

        // --- 其餘原本功能 ---
        let lastContent: string | null = null;
        let hoverTimer: NodeJS.Timeout | null = null;

        function replayIfChanged() {
            const doc = document.querySelector('.vp-doc') as HTMLElement;
            if (!doc) return;
            const current = doc.innerHTML;
            if (current !== lastContent) {
                doc.classList.remove('fade-in-up');
                void (doc as any).offsetWidth;
                doc.classList.add('fade-in-up');
                lastContent = current;
            }
        }

        function globalHoverDelegate(e) {
            const link = e.target.closest('.outline-link');
            if (
                link &&
                link instanceof HTMLElement &&
                link.matches('.outline-link')
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
                }, 120) as NodeJS.Timeout;
            }
        }

        function setupGlobalOutlineHoverScroll() {
            document.addEventListener('mouseover', globalHoverDelegate);
        }
        setupGlobalOutlineHoverScroll();
    }
}