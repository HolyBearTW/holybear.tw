import MyCustomLayout from './MyCustomLayout.vue'
import './style.css'

export default {
    Layout: MyCustomLayout,
    enhanceApp({ router }) {
        if (typeof window !== 'undefined') {
            function isBlogPage(path) {
                return /^\/(en\/)?blog\/(?!index$)[^/]+(?:\.html)?(?:[?#].*)?$/.test(path);
            }
            function forceBlogClass() {
                // 保留原有 class，確保最多只有一個 is-blog-page
                const cls = document.body.className.split(' ').filter(c => c && c !== 'is-blog-page');
                if (isBlogPage(window.location.pathname)) {
                    cls.push('is-blog-page');
                }
                document.body.className = cls.join(' ');
            }
            // 首次進站
            forceBlogClass();
            // 輪詢，每 200ms 強制同步一次
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
                document.removeEventListener('mouseover', globalHoverDelegate);
                document.addEventListener('mouseover', globalHoverDelegate);
            }

            window.addEventListener('DOMContentLoaded', () => {
                replayIfChanged();
                setupGlobalOutlineHoverScroll();
            });
            window.addEventListener('vitepress:pageview', () => {
                setTimeout(() => {
                    replayIfChanged();
                    setupGlobalOutlineHoverScroll();
                }, 80);
            });
            setInterval(() => {
                replayIfChanged();
            }, 200);

            // 修正強制刷新邏輯，避免無限刷新
            // 修正 router.afterEach 的檢查邏輯，避免非 Vue Router 實例導致錯誤
            if (router && typeof router.afterEach === 'function') {
                router.afterEach((to, from) => {
                    if (to.path !== from.path && !to.hash) {
                        window.location.reload();
                    }
                });
            } else {
                console.warn('Router instance does not support afterEach.');
            }
        }
    }
}