import MyCustomLayout from './MyCustomLayout.vue'
import './style.css'

export default {
    Layout: MyCustomLayout,
    enhanceApp() {
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
            let lastContent = null;
            let hoverTimer = null;

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
                    }, 120);
                }
            }

            function setupGlobalOutlineHoverScroll() {
                document.removeEventListener('mouseover', globalHoverDelegate);
                document.addEventListener('mouseover', globalHoverDelegate);
            }

            window.addEventListener('DOMContentLoaded', () => {
                replayIfChanged();
                replaceDocSearchHitSource();
                setupGlobalOutlineHoverScroll();
            });
            window.addEventListener('vitepress:pageview', () => {
                setTimeout(() => {
                    replayIfChanged();
                    replaceDocSearchHitSource();
                    setupGlobalOutlineHoverScroll();
                }, 80);
            });
            setInterval(() => {
                replayIfChanged();
                replaceDocSearchHitSource();
            }, 200);
        }
    }
}